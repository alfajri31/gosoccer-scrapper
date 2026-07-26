export type ScrapeResult = {
  title: string;
  url: string;
  text: string;
};

type AppError = Error & {
  status?: number;
};

export async function scrape(url: string): Promise<ScrapeResult> {
  const { default: puppeteer } = await import('puppeteer');
  const parsedUrl = new URL(url);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    const error: AppError = new Error('Only HTTP and HTTPS URLs are supported');
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
