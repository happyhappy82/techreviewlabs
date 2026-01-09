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

  return {
    title: properties.제목?.title?.[0]?.plain_text || properties.Title?.title?.[0]?.plain_text || '',
    date: properties.날짜?.date?.start || properties.Date?.date?.start || new Date().toISOString().split('T')[0],
    excerpt: properties.요약?.rich_text?.[0]?.plain_text || properties.Excerpt?.rich_text?.[0]?.plain_text || '',
    category: properties.카테고리?.select?.name || properties.Category?.select?.name || '기타',
    rating: properties.평점?.number || properties.Rating?.number || 0,
    product: properties.제품명?.rich_text?.[0]?.plain_text || properties.Product?.rich_text?.[0]?.plain_text || '',
    lightColor: properties.밝은색?.rich_text?.[0]?.plain_text || properties.LightColor?.rich_text?.[0]?.plain_text || 'lab(62.926 59.277 -1.573)',
    darkColor: properties.어두운색?.rich_text?.[0]?.plain_text || properties.DarkColor?.rich_text?.[0]?.plain_text || 'lab(80.993 32.329 -7.093)',
    published: properties.발행?.checkbox || properties.Published?.checkbox || false,
  };
}

async function syncNotionToReviews() {
  try {
    console.log('🔄 Starting Notion sync...');

    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
      throw new Error('NOTION_DATABASE_ID is not set');
    }

    // Query database for published pages
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: '발행',
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: '날짜',
          direction: 'descending',
        },
      ],
    });

    console.log(`📚 Found ${response.results.length} published reviews`);

    let newPublishedSlug = null;
    const existingSlugs = fs.readdirSync(REVIEWS_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));

    for (const page of response.results) {
      const pageId = page.id;
      const props = await getPageProperties(pageId);

      if (!props.title) {
        console.log(`⚠️  Skipping page ${pageId}: No title`);
        continue;
      }

      const slug = generateSlug(props.title);
      console.log(`\n📝 Processing: ${props.title} (${slug})`);

      // Check if this is a new review
      if (!existingSlugs.includes(slug)) {
        newPublishedSlug = slug;
        console.log(`✨ New review detected: ${slug}`);
      }

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
      console.log(`  ✅ Saved: ${slug}.md`);
    }

    // Save the newest published slug
    if (newPublishedSlug) {
      fs.writeFileSync('.published-slug', newPublishedSlug, 'utf-8');
      console.log(`\n📌 New published slug saved: ${newPublishedSlug}`);
    } else {
      // Remove old .published-slug file if no new reviews
      if (fs.existsSync('.published-slug')) {
        fs.unlinkSync('.published-slug');
      }
    }

    console.log('\n✅ Notion sync completed!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncNotionToReviews();
