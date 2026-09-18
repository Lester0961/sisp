import puppeteer from 'puppeteer-core';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
async function test() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.stack || err.message));
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'admin@rmc.edu.ph');
  await page.type('input[type="password"]', 'local-demo-only');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}
test();
