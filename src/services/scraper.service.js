const puppeteer = require('puppeteer');

async function scrape(url) {
  const parsedUrl = new URL(url);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    const error = new Error('Only HTTP and HTTPS URLs are supported');
    error.status = 400;
    throw error;
  }

  const browser = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
  });

  try {
    const page = await browser.newPage();
    await page.goto(parsedUrl.href, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    return await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      text: document.body.innerText,
    }));
  } finally {
    await browser.close();
  }
}

module.exports = { scrape };

