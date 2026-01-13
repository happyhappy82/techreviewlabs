const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const BASE_URL = "https://techreviewlabs.xyz";
const REVIEWS_DIR = path.join(process.cwd(), "content/reviews");
const PUBLIC_DIR = path.join(process.cwd(), "public");

function getReviews() {
  if (!fs.existsSync(REVIEWS_DIR)) {
    return [];
  }

  const fileNames = fs.readdirSync(REVIEWS_DIR);
  return fileNames
    .filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, "");
      const fullPath = path.join(REVIEWS_DIR, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      return {
        slug,
        date: (data.date || new Date().toISOString()).split("T")[0],
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function generateSitemap() {
  const reviews = getReviews();
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    {
      loc: BASE_URL,
      lastmod: today,
      changefreq: "daily",
      priority: "1.0",
    },
    ...reviews.map((review) => ({
      loc: `${BASE_URL}/${encodeURIComponent(review.slug)}`,
      lastmod: review.date,
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  const outputPath = path.join(PUBLIC_DIR, "sitemap.xml");
  fs.writeFileSync(outputPath, sitemap, "utf8");
  console.log(`✅ Sitemap generated: ${outputPath}`);
  console.log(`   Total URLs: ${urls.length}`);
}

generateSitemap();
