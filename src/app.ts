import { chromium, Page, Locator } from 'playwright';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { ensureDir, takeScreenshot } from './utils';
import OpenAI from 'openai';

// HOW TO UPDATE AND MAINTAIN THIS SCRIPT:
// 1. To change the target URL: update page.goto('https://testserv6.acellus.com/sign-in')
// 2. Credentials: Student (Swamp1/Gizzard), Teacher/Parent (32frog)
// 3. To change where files are saved: update the path.join(process.cwd(), 'TestCases'...) logic
// 4. locator.check(): selects a radio button or checkbox
// 5. locator.click(): performs a mouse click on the element
// 6. getByRole('link', { name: '...' }): Finds links by their visible text
// 7. takeScreenshot(page, dir, name): saves a full-page image to the specific test folder
// 8. addVisualClick/removeVisualClick: creates the red circle indicator seen in screenshots
// 9. If "Custom" is chosen, the script prompts for a custom feature name used for navigation

// Initialize LLM
const openai = new OpenAI({ apiKey: 'YOUR_OPENAI_API_KEY' });

const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
};

async function aiNarrate(action: string, feature: string): Promise<string> {
  const prompt = `Write a professional QA test step and expected result for this action: "${action}" within the "${feature}" feature. 
  Follow this format exactly:
  Step: [Description]
  Expected Result: [Description]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0].message?.content || "Step/Result could not be generated.";
  } catch (e) {
    return `Step: Perform ${action}\nExpected Result: ${action} succeeds.`;
  }
}

function getNextFolderName(baseDir: string, baseName: string): string {
  let counter = 1;
  let folderName: string;
  let fullPath: string;
  do {
    const paddedId = counter.toString().padStart(3, '0');
    folderName = `${baseName}-${paddedId}`;
    fullPath = path.join(baseDir, folderName);
    counter++;
  } while (fs.existsSync(fullPath));
  return folderName;
}

async function addVisualClick(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.evaluate(({ x, y }) => {
      const circle = document.createElement('div');
      circle.id = 'playwright-click-circle';
      Object.assign(circle.style, {
        position: 'fixed', left: `${x - 20}px`, top: `${y - 20}px`, width: '40px', height: '40px',
        borderRadius: '50%', border: '4px solid red', backgroundColor: 'rgba(255, 0, 0, 0.3)',
        zIndex: '999999', pointerEvents: 'none'
      });
      document.body.appendChild(circle);
    }, { x, y });
  }
}

async function removeVisualClick(page: Page) {
  await page.evaluate(() => document.getElementById('playwright-click-circle')?.remove());
}

async function run() {
  // Ask for a single base test-case name; we'll append -001, -002...
  const baseNameRaw = await askQuestion('Enter base test case name (e.g. TC or Auto_TC_MyFlow): ');
  const baseName = (baseNameRaw || 'TC').trim();

  // Credentials and Button Mapping (using default student mapping)
  const authMap: Record<string, { user: string, pass: string, btnName: string }> = {
    student: { user: 'Swamp1', pass: 'Gizzard', btnName: 'Student Sign In' },
    teacher: { user: '32frog', pass: '', btnName: 'GoldKey Sign In' },
    parent: { user: '32frog', pass: '', btnName: 'GoldKey Sign In' }
  };
  const config = authMap.student;

  const featureBaseDir = path.join(process.cwd(), 'TestCases', 'WalkThru', 'Generated');
  ensureDir(featureBaseDir);

  const folderName = getNextFolderName(featureBaseDir, baseName);
  const testRunDir = path.join(featureBaseDir, folderName);
  const docPath = path.join(testRunDir, `${folderName}.txt`);

  ensureDir(testRunDir);

  // --- INITIAL DOC HEADER ---
  const header = `TEST CASE: ${folderName}\n\nTEST NAME: ${baseName}\n\nDESCRIPTION: Automated walkthrough.\n\nPRECONDITIONS: User is on landing page.\n\nSTEPS:\n\n`;
  fs.writeFileSync(docPath, header);

  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://testserv4.acellus.com/sign-in');

  // Step 1: Select Sign In Type (Home Screen)
  const entryBtn = page.getByRole('link', { name: config.btnName });
  
  // DOCUMENT & SCREENSHOT (STEP 1)
  const step1Text = await aiNarrate(`Click the ${config.btnName} button on the Home screen`, baseName);
  const [step1Line = '', expected1Line = ''] = step1Text.split('\n').map(s => s.replace(/^Step:\s*/i, '').replace(/^Expected Result:\s*/i, ''));
  fs.appendFileSync(docPath, `STEP 1:\n\n${step1Line}\n\n(e.g.. Click component)\n\n[screenshot: 01-home-selection-before.png]\n\nExpected:\n\n[screenshot: 01-home-selection-after.png]\n\n`);

  await addVisualClick(page, entryBtn);
  await takeScreenshot(page, testRunDir, '01-home-selection-before');
  await entryBtn.click();
  await removeVisualClick(page);
  await page.waitForTimeout(500);
  await takeScreenshot(page, testRunDir, '01-home-selection-after');

  // Step 2: Login process
  await page.waitForSelector('input[placeholder="Username"]');
  await page.fill('input[placeholder="Username"]', config.user);
  if (config.pass) {
    await page.fill('input[placeholder="Password"]', config.pass);
  }
  
  const signInBtn = page.locator('#login-submit');

  // DOCUMENT & SCREENSHOT (STEP 2)
  const step2Text = await aiNarrate(`Enter credentials for sign in and click sign in`, baseName);
  const [step2Line = '', expected2Line = ''] = step2Text.split('\n').map(s => s.replace(/^Step:\s*/i, '').replace(/^Expected Result:\s*/i, ''));
  fs.appendFileSync(docPath, `STEP 2:\n\n${step2Line}\n\n(e.g.. Click component)\n\n[screenshot: 02-login-entry-before.png]\n\nExpected:\n\n[screenshot: 02-login-entry-after.png]\n\n`);

  await addVisualClick(page, signInBtn);
  await takeScreenshot(page, testRunDir, '02-login-entry-before');
  await signInBtn.click();
  await removeVisualClick(page);
  await page.waitForTimeout(800);
  await takeScreenshot(page, testRunDir, '02-login-entry-after');
// delete this comment


  // Step 3: Post-login capture and optional navigation
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    // ensure we capture the state after login
    await takeScreenshot(page, testRunDir, '02-login-entry-after');

    // attempt to find any navigation link to continue the flow; fall back gracefully
    const navLinks = page.locator('nav a, a');
    if (await navLinks.count() > 0) {
      const first = navLinks.nth(0);
      if (await first.isVisible()) {
        const step3Text = await aiNarrate(`Navigate using the first available link after login`, baseName);
        const [step3Line = ''] = step3Text.split('\n').map(s => s.replace(/^Step:\s*/i, ''));
        fs.appendFileSync(docPath, `STEP 3:\n\n${step3Line}\n\n(e.g.. Click component)\n\n[screenshot: 03-nav-before.png]\n\nExpected:\n\n[screenshot: 04-nav-after.png]\n\n`);

        await addVisualClick(page, first);
        await takeScreenshot(page, testRunDir, '03-nav-before');
        await first.click();
        await removeVisualClick(page);
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await takeScreenshot(page, testRunDir, '04-nav-after');
      }
    }
  } catch (e) {
    console.error('Post-login navigation failed (non-fatal):', e);
  }

  console.log(`Walkthrough complete. Results saved to: ${testRunDir}`);
  await browser.close();
}

run().catch(console.error); 