const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const matter = require('gray-matter');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 테이블 블록 커스텀 변환 - 셀 내 줄바꿈을 <br>로 변환
n2m.setCustomTransformer('table', async (block) => {
  const { table } = block;
  if (!table) return '';

  const tableRows = await notion.blocks.children.list({ block_id: block.id });
  if (!tableRows.results.length) return '';

  const rows = [];
  for (const row of tableRows.results) {
    if (row.type !== 'table_row') continue;
    const cells = row.table_row.cells.map(cell => {
      // 셀 내용 추출 및 줄바꿈을 <br>로 변환
      const cellContent = cell.map(t => {
        let content = t.plain_text || '';
        // 줄바꿈을 <br>로 변환
        content = content.replace(/\n/g, '<br>');
        if (t.annotations?.bold) content = `**${content}**`;
        if (t.annotations?.italic) content = `*${content}*`;
        if (t.annotations?.code) content = `\`${content}\``;
        if (t.href) content = `[${content}](${t.href})`;
        return content;
      }).join('');
      return cellContent;
    });
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  // 마크다운 테이블 생성
  const headerRow = `| ${rows[0].join(' | ')} |`;
  const separatorRow = `| ${rows[0].map(() => '---').join(' | ')} |`;
  const bodyRows = rows.slice(1).map(row => `| ${row.join(' | ')} |`).join('\n');

  return `${headerRow}\n${separatorRow}\n${bodyRows}\n`;
});

// 토글 블록을 <details>/<summary>로 변환
n2m.setCustomTransformer('toggle', async (block) => {
  const { toggle } = block;
  if (!toggle || !toggle.rich_text) return '';

  // 토글 제목 추출 (볼드, 이탤릭 등 서식 유지)
  const title = toggle.rich_text.map(t => {
    let content = t.plain_text;
    if (t.annotations?.bold) content = `**${content}**`;
    if (t.annotations?.italic) content = `*${content}*`;
    if (t.annotations?.code) content = `\`${content}\``;
    return content;
  }).join('');

  // 자식 블록 내용 가져오기
  let childContent = '';
  if (block.has_children) {
    const childBlocks = await notion.blocks.children.list({ block_id: block.id });
    for (const child of childBlocks.results) {
      const childMd = await n2m.blockToMarkdown(child);
      if (childMd) {
        const mdString = n2m.toMarkdownString([childMd]);
        childContent += mdString.parent;
      }
    }
  }

  return `<details>\n<summary>${title}</summary>\n\n${childContent}\n</details>\n`;
});

const REVIEWS_DIR = path.join(process.cwd(), 'src/content/reviews');
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
  // Note: Notion has both "Select" and "Status" property types
  let status = '';
  for (const key of Object.keys(properties)) {
    if (key.toLowerCase().includes('status')) {
      console.log(`   Checking '${key}' property:`, JSON.stringify(properties[key], null, 2));
      // Try both .status.name (Status property) and .select.name (Select property)
      status = properties[key]?.status?.name || properties[key]?.select?.name || '';
      if (status) {
        console.log(`   Found status in property '${key}': ${status}`);
        break;
      }
    }
  }

  // Helper function to extract full text from Notion rich_text/title array
  const getFullText = (textArray) => {
    if (!textArray || !Array.isArray(textArray)) return '';
    return textArray.map(item => item.plain_text || '').join('');
  };

  return {
    pageId: page.id,
    title: getFullText(properties.제목?.title) || getFullText(properties.Title?.title) || '',
    date: properties.날짜?.date?.start || properties.Date?.date?.start || new Date().toISOString(),
    excerpt: getFullText(properties.요약?.rich_text) || getFullText(properties.Excerpt?.rich_text) || '',
    category: properties.카테고리?.select?.name || properties.Category?.select?.name || '기타',
    rating: properties.평점?.number || properties.Rating?.number || 0,
    product: getFullText(properties.제품명?.rich_text) || getFullText(properties.Product?.rich_text) || '',
    lightColor: getFullText(properties.밝은색?.rich_text) || getFullText(properties.LightColor?.rich_text) || '#c53030',
    darkColor: getFullText(properties.어두운색?.rich_text) || getFullText(properties.DarkColor?.rich_text) || '#9b2c2c',
    status: status,
  };
}

function findExistingFileByPageId(pageId) {
  const files = fs.readdirSync(REVIEWS_DIR).filter(file => file.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(REVIEWS_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);

    if (data.notionPageId === pageId) {
      return {
        exists: true,
        filePath: filePath,
        fileName: file,
        slug: file.replace('.md', '')
      };
    }
  }

  return { exists: false };
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

  // Check if file exists with different slug (title changed)
  const existingFile = findExistingFileByPageId(pageId);
  if (existingFile.exists && existingFile.slug !== slug) {
    console.log(`  🔄 Title changed, removing old file: ${existingFile.fileName}`);
    fs.unlinkSync(existingFile.filePath);
  }

  // Get page content
  const mdblocks = await n2m.pageToMarkdown(pageId);
  let markdown = n2m.toMarkdownString(mdblocks).parent;

  // Auto-generate excerpt if empty
  if (!props.excerpt || props.excerpt.trim() === '') {
    // Remove markdown syntax and get first 150 characters
    const plainText = markdown
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links but keep text
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/`/g, '') // Remove code
      .replace(/>/g, '') // Remove blockquote
      .replace(/^\|.*\|$/gm, '') // Remove table rows (lines with | at start and end)
      .replace(/\|/g, '') // Remove remaining pipe characters
      .replace(/-{3,}/g, '') // Remove horizontal rules and table separators
      .replace(/\n+/g, ' ') // Replace newlines with space
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    props.excerpt = plainText.substring(0, 150).trim();
    if (plainText.length > 150) {
      props.excerpt += '...';
    }
    console.log(`  📝 Auto-generated excerpt: ${props.excerpt.substring(0, 50)}...`);
  }

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

  // Sanitize excerpt for YAML (escape quotes and remove problematic characters)
  const safeExcerpt = props.excerpt
    .replace(/"/g, '\\"')  // Escape double quotes
    .replace(/\n/g, ' ')   // Remove newlines
    .trim();

  // Create frontmatter
  const frontmatter = `---
title: "${props.title}"
date: "${props.date}"
excerpt: "${safeExcerpt}"
category: "${props.category}"
rating: ${props.rating}
product: "${props.product}"
lightColor: "${props.lightColor}"
darkColor: "${props.darkColor}"
notionPageId: "${props.pageId}"
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
          status: {
            equals: 'Published',
          },
        },
        {
          property: 'Date',
          date: {
            before: now,
          },
        },
      ],
    },
    sorts: [
      {
        property: 'Date',
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
    const existingFile = findExistingFileByPageId(pageId);

    if (!existingFile.exists) {
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
    const existingFile = findExistingFileByPageId(pageId);

    if (existingFile.exists) {
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
