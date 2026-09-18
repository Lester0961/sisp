import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\john\\.gemini\\antigravity\\brain\\53a1b173-25fb-4bde-914e-53cd8f6e2521';

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1360,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 950 });

  // 1. Log in as Student
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle2' });
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'student@rmc.edu.ph');
  await page.type('input[type="password"]', 'local-demo-only');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation to dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));

  // Take Student Dashboard Screenshot
  const dashboardPath = path.join(ARTIFACT_DIR, 'student_dashboard.png');
  await page.screenshot({ path: dashboardPath, fullPage: true });
  console.log('Captured Student Dashboard:', dashboardPath);

  // 2. Navigate to Requests Page
  console.log('Navigating to /requests...');
  await page.goto('http://localhost:3002/requests', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  // Click "New Request" button to expand form
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('New Request')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1000));

  // Check the Third-party checkbox to reveal authorization requirements
  try {
    await page.waitForSelector('#third-party-toggle', { timeout: 3000 });
    await page.click('#third-party-toggle');
    await new Promise((r) => setTimeout(r, 1000));
  } catch (e) {
    console.log('Could not find #third-party-toggle', e.message);
  }

  const requestsPath = path.join(ARTIFACT_DIR, 'document_requests.png');
  await page.screenshot({ path: requestsPath, fullPage: true });
  console.log('Captured Document Requests:', requestsPath);

  // 3. Log out and log in as Admin
  console.log('Logging out and navigating to Admin...');
  await page.evaluate(() => {
    localStorage.clear();
    document.cookie = 'sisp-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@rmc.edu.ph');
  await page.type('input[type="password"]', 'local-demo-only');
  await page.click('button[type="submit"]');

  console.log('Waiting for admin dashboard navigation...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));

  const adminDashboardPath = path.join(ARTIFACT_DIR, 'admin_monthly_report.png');
  await page.screenshot({ path: adminDashboardPath, fullPage: true });
  console.log('Captured Admin Dashboard:', adminDashboardPath);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
