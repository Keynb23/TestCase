import { chromium, Page, Locator } from 'playwright';
import path from 'path';
import readline from 'readline';
import { ensureDir, takeScreenshot } from './utils';

// Prompt for Role selection in terminal
const askRole = (): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question('Select Role (student/teacher/parent): ', (ans) => {
    rl.close();
    resolve(ans.toLowerCase().trim());
  }));
};

//  Injects a red circle onto the page at the center of the element.
async function addVisualClick(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.evaluate(({ x, y }) => {
      const circle = document.createElement('div');
      circle.id = 'playwright-click-circle';
      Object.assign(circle.style, {
        position: 'fixed',
        left: `${x - 20}px`,
        top: `${y - 20}px`,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '4px solid red',
        backgroundColor: 'rgba(255, 0, 0, 0.3)',
        zIndex: '999999',
        pointerEvents: 'none'
      });
      document.body.appendChild(circle);
    }, { x, y });
  }
}

async function removeVisualClick(page: Page) {
  await page.evaluate(() => document.getElementById('playwright-click-circle')?.remove());
}

async function run() {
  const CHOSEN_ROLE = await askRole();
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  const screenshotDir = path.join(__dirname, '../screenshots');
  ensureDir(screenshotDir);

  await page.goto('http://localhost:5500');

  // --- STEP 1: Interface Selection ---
  const radio = page.locator(`input[value="${CHOSEN_ROLE}"]`);
  await radio.check();
  
  const startBtn = page.locator('#start-btn');
  await addVisualClick(page, startBtn);
  await takeScreenshot(page, '01-before-start');
  await startBtn.click();
  await removeVisualClick(page);
  await takeScreenshot(page, '02-after-start');

  // --- STEP 2: Login ---
  // Wait for the login section to be visible (Tailwind 'hidden' class removed)
  await page.waitForSelector('#login-page:not(.hidden)');
  
  await page.fill('input[placeholder="Username"]', 'test-user');
  await page.fill('input[placeholder="Password"]', 'password123');
  
  const signInBtn = page.locator('#login-submit');
  await addVisualClick(page, signInBtn);
  await takeScreenshot(page, '03-before-login');
  await signInBtn.click();
  await removeVisualClick(page);
  await takeScreenshot(page, '04-after-login');

  // --- STEP 3: Dashboard Navigation ---
  await page.waitForSelector('#dashboard:not(.hidden)');
  
  // Find all links in the nav bar
  const navLinks = page.locator('nav a');
  const count = await navLinks.count();

  for (let i = 0; i < count; i++) {
    const link = navLinks.nth(i);
    const name = (await link.textContent())?.trim() || `link-${i}`;
    
    await addVisualClick(page, link);
    await takeScreenshot(page, `05-before-click-${name}`);
    
    await link.click();
    
    await removeVisualClick(page);
    await takeScreenshot(page, `06-after-click-${name}`);
  }

  console.log('✨ Walkthrough complete.');
  await browser.close();
}

run().catch(console.error);