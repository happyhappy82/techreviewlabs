const https = require("https");

const SITEMAP_URL = "https://techreviewlabs.xyz/sitemap.xml";

const PING_URLS = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
];

async function ping(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 200) {
          resolve({ url, status: "success", statusCode: res.statusCode });
        } else {
          resolve({ url, status: "failed", statusCode: res.statusCode });
        }
      })
      .on("error", (err) => {
        resolve({ url, status: "error", error: err.message });
      });
  });
}

async function pingAll() {
  console.log("🔔 Pinging search engines with sitemap...\n");

  for (const url of PING_URLS) {
    const result = await ping(url);
    if (result.status === "success") {
      console.log(`✅ ${url}`);
      console.log(`   Status: ${result.statusCode}\n`);
    } else if (result.status === "failed") {
      console.log(`⚠️  ${url}`);
      console.log(`   Status: ${result.statusCode}\n`);
    } else {
      console.log(`❌ ${url}`);
      console.log(`   Error: ${result.error}\n`);
    }
  }

  console.log("✅ Sitemap ping completed!");
}

pingAll();
