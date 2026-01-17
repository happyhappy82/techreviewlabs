const { google } = require('googleapis');

async function submitToGoogle() {
  try {
    const siteUrl = process.env.SITE_URL;
    const publishedSlug = process.env.PUBLISHED_SLUG;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!siteUrl || !publishedSlug || !serviceAccountJson) {
      console.log('⚠️  Missing required environment variables');
      return;
    }

    const fullUrl = `${siteUrl}/${publishedSlug}`;
    console.log(`🔍 Submitting URL to Google: ${fullUrl}`);

    // Parse service account JSON
    const credentials = JSON.parse(serviceAccountJson);

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    const authClient = await auth.getClient();
    const indexing = google.indexing({ version: 'v3', auth: authClient });

    // Submit URL for indexing
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: fullUrl,
        type: 'URL_UPDATED',
      },
    });

    console.log('✅ Successfully submitted to Google Search Console');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📌 URL: ${response.data.urlNotificationMetadata?.url}`);
  } catch (error) {
    console.error('❌ Failed to submit to Google:', error.message);
    // Don't fail the entire workflow if Google indexing fails
    console.log('ℹ️  Continuing despite indexing error...');
  }
}

submitToGoogle();
