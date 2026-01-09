const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const REVIEWS_DIR = path.join(process.cwd(), 'content/reviews');
const IMAGES_DIR = path.join(process.cwd(), 'public/notion-images');

if (!fs.existsSync(REVIEWS_DIR)) {
  fs.mkdirSync(REVIEWS_DIR, { recursive: true });
}

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function getPageProperties(pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const properties = page.properties;

  // Debug: Print all property keys
  console.log('   Available properties:', Object.keys(properties).join(', '));

  // Try all possible variations of Status property name
  let status = '';
  for (const key of Object.keys(properties)) {
    if (key.toLowerCase().includes('status')) {
      status = properties[key]?.select?.name || '';
      if (status) {
        console.log(`   Found status in property '${key}': ${status}`);
        break;
      }
    }
  }

  return {
    pageId: page.id,
    title: properties.제목?.title?.[0]?.plain_text || properties.Title?.title?.[0]?.plain_text || '',
    date: properties.날짜?.date?.start || properties.Date?.date?.start || new Date().toISOString().split('T')[0],
    excerpt: properties.요약?.rich_text?.[0]?.plain_text || properties.Excerpt?.rich_text?.[0]?.plain_text || '',
    category: properties.카테고리?.select?.name || properties.Category?.select?.name || '기타',
    rating: properties.평점?.number || properties.Rating?.number || 0,
    product: properties.제품명?.rich_text?.[0]?.plain_text || properties.Product?.rich_text?.[0]?.plain_text || '',
    lightColor: properties.밝은색?.rich_text?.[0]?.plain_text || properties.LightColor?.rich_text?.[0]?.plain_text || 'lab(62.926 59.277 -1.573)',
    darkColor: properties.어두운색?.rich_text?.[0]?.plain_text || properties.DarkColor?.rich_text?.[0]?.plain_text || 'lab(80.993 32.329 -7.093)',
    status: status,
  };
}

function fileExistsForPage(slug) {
  const filePath = path.join(REVIEWS_DIR, `${slug}.md`);
  return fs.existsSync(filePath);
}

function deleteReviewFile(slug) {
  const filePath = path.join(REVIEWS_DIR, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  🗑️  Deleted: ${slug}.md`);
    return true;
  }
  return false;
}

async function processPage(pageId, isNew = false) {
  const props = await getPageProperties(pageId);

  if (!props.title) {
    console.log(`⚠️  Skipping page ${pageId}: No title`);
    return null;
  }

  const slug = generateSlug(props.title);
  console.log(`\n📝 Processing: ${props.title} (${slug})`);
  console.log(`   Status: ${props.status}, Date: ${props.date}`);

  // Get page content
  const mdblocks = await n2m.pageToMarkdown(pageId);
  let markdown = n2m.toMarkdownString(mdblocks).parent;

  // Download images
  const imageMatches = markdown.match(/!\[.*?\]\((https?:\/\/.*?)\)/g);
  if (imageMatches) {
    for (const match of imageMatches) {
      const urlMatch = match.match(/\((https?:\/\/.*?)\)/);
      if (urlMatch) {
        const imageUrl = urlMatch[1];
        const imageFilename = `${slug}-${Date.now()}-${path.basename(new URL(imageUrl).pathname)}`;
        const imagePath = path.join(IMAGES_DIR, imageFilename);

        try {
          await downloadImage(imageUrl, imagePath);
          markdown = markdown.replace(imageUrl, `/notion-images/${imageFilename}`);
          console.log(`  📷 Downloaded image: ${imageFilename}`);
        } catch (error) {
          console.error(`  ❌ Failed to download image: ${error.message}`);
        }
      }
    }
  }

  // Create frontmatter
  const frontmatter = `---
title: "${props.title}"
date: "${props.date}"
excerpt: "${props.excerpt}"
category: "${props.category}"
rating: ${props.rating}
product: "${props.product}"
lightColor: "${props.lightColor}"
darkColor: "${props.darkColor}"
---

`;

  const fullContent = frontmatter + markdown;
  const filePath = path.join(REVIEWS_DIR, `${slug}.md`);

  fs.writeFileSync(filePath, fullContent, 'utf-8');

  if (isNew) {
    console.log(`  ✅ Published: ${slug}.md`);
  } else {
    console.log(`  ✅ Updated: ${slug}.md`);
  }

  return slug;
}

async function scheduledSync() {
  console.log('📅 Running scheduled sync...');

  const databaseId = process.env.NOTION_DATABASE_ID;
  const now = new Date().toISOString();

  // Query: status = "Published" AND date < now
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'Status',
          select: {
            equals: 'Published',
          },
        },
        {
          property: '날짜',
          date: {
            before: now,
          },
        },
      ],
    },
    sorts: [
      {
        property: '날짜',
        direction: 'descending',
      },
    ],
  });

  console.log(`📚 Found ${response.results.length} published reviews (date < now)`);

  let newPublishedSlugs = [];

  for (const page of response.results) {
    const pageId = page.id;
    const props = await getPageProperties(pageId);

    if (!props.title) continue;

    const slug = generateSlug(props.title);
    const exists = fileExistsForPage(slug);

    if (!exists) {
      // 신규 발행
      console.log(`\n✨ New review detected: ${slug}`);
      const publishedSlug = await processPage(pageId, true);
      if (publishedSlug) {
        newPublishedSlugs.push(publishedSlug);
      }
    } else {
      console.log(`\nℹ️  Already published: ${slug} (skipping)`);
    }
  }

  // Save newest published slug for Google indexing
  if (newPublishedSlugs.length > 0) {
    fs.writeFileSync('.published-slug', newPublishedSlugs[0], 'utf-8');
    console.log(`\n📌 New published slug saved: ${newPublishedSlugs[0]}`);
  } else {
    if (fs.existsSync('.published-slug')) {
      fs.unlinkSync('.published-slug');
    }
    console.log(`\nℹ️  No new reviews published`);
  }

  return newPublishedSlugs.length > 0;
}

async function webhookSync() {
  console.log('⚡ Running webhook sync...');

  const pageId = process.env.SYNC_PAGE_ID;

  if (!pageId) {
    console.log('⚠️  No page_id provided, skipping webhook sync');
    return false;
  }

  console.log(`📄 Processing page: ${pageId}`);

  const props = await getPageProperties(pageId);

  if (!props.title) {
    console.log(`⚠️  Page has no title, skipping`);
    return false;
  }

  const slug = generateSlug(props.title);
  const status = props.status;

  console.log(`   Title: ${props.title}`);
  console.log(`   Slug: ${slug}`);
  console.log(`   Status: ${status}`);

  // Handle deletion
  if (status === 'Deleted') {
    console.log(`\n🗑️  Deleting review: ${slug}`);
    const deleted = deleteReviewFile(slug);
    return deleted;
  }

  // Handle publish/update
  if (status === 'Published') {
    const exists = fileExistsForPage(slug);

    if (exists) {
      console.log(`\n✏️  Updating existing review: ${slug}`);
      await processPage(pageId, false);
      return true;
    } else {
      console.log(`\n✨ Publishing new review: ${slug}`);
      const publishedSlug = await processPage(pageId, true);
      if (publishedSlug) {
        fs.writeFileSync('.published-slug', publishedSlug, 'utf-8');
        console.log(`📌 New published slug saved: ${publishedSlug}`);
      }
      return true;
    }
  }

  console.log(`⚠️  Unknown status: ${status}`);
  return false;
}

async function syncNotionToReviews() {
  try {
    console.log('🔄 Starting Notion sync...');
    console.log(`   Trigger: ${process.env.TRIGGER_TYPE || 'unknown'}`);

    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
      throw new Error('NOTION_DATABASE_ID is not set');
    }

    const triggerType = process.env.TRIGGER_TYPE;
    let hasChanges = false;

    if (triggerType === 'repository_dispatch') {
      // Webhook: 즉시 발행/수정/삭제
      hasChanges = await webhookSync();
    } else {
      // Schedule or manual: 예약 발행
      hasChanges = await scheduledSync();
    }

    if (!hasChanges) {
      console.log('\nℹ️  No changes made');
    }

    console.log('\n✅ Notion sync completed!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncNotionToReviews();
