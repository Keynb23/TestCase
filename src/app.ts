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

function getNextFolderName(baseDir: string, role: string, feature: string): string {
  let counter = 1;
  let folderName: string;
  let fullPath: string;
  do {
    const paddedId = counter.toString().padStart(3, '0');
    folderName = `Auto_TC_${role}_${feature}-${paddedId}`;
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
  const rawRole = await askQuestion('Select Role (student/teacher/parent): ');
  let rawFeature = await askQuestion('Select Feature (Profile/Courses/Dashboard/Settings or type "Custom"): ');

  if (rawFeature.toLowerCase() === 'custom') {
    rawFeature = await askQuestion('Enter the custom feature name to test: ');
  }

  const roleCap = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
  const featureCap = rawFeature.charAt(0).toUpperCase() + rawFeature.slice(1).toLowerCase();
  
  // Credentials and Button Mapping
  const authMap: Record<string, { user: string, pass: string, btnName: string }> = {
    student: { user: 'Swamp1', pass: 'Gizzard', btnName: 'Student Sign In' },
    teacher: { user: '32frog', pass: '', btnName: 'GoldKey Sign In' },
    parent: { user: '32frog', pass: '', btnName: 'GoldKey Sign In' }
  };
  const config = authMap[rawRole.toLowerCase()] || authMap.student;

  const featureBaseDir = path.join(process.cwd(), 'TestCases', 'WalkThru', roleCap, featureCap);
  ensureDir(featureBaseDir);

  const folderName = getNextFolderName(featureBaseDir, roleCap, featureCap);
  const testRunDir = path.join(featureBaseDir, folderName);
  const docPath = path.join(testRunDir, `${folderName}.txt`);

  ensureDir(testRunDir);

  // --- INITIAL DOC HEADER ---
  const header = `Test Case ID: ${folderName}\nTitle: Verify ${featureCap} functionality\nDescription: Automated walkthrough for ${roleCap} role.\nPreconditions: User is on landing page.\n\nTest Steps:\n`;
  fs.writeFileSync(docPath, header);

  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://testserv6.acellus.com/sign-in');

  // Step 1: Select Sign In Type (Home Screen)
  const entryBtn = page.getByRole('link', { name: config.btnName });
  
  // DOCUMENT & SCREENSHOT
  const step1Text = await aiNarrate(`Click the ${config.btnName} button on the Home screen`, featureCap);
  fs.appendFileSync(docPath, `${step1Text}\n(image: 01-home-selection.png)\n\n`);
  
  await addVisualClick(page, entryBtn);
  await takeScreenshot(page, testRunDir, '01-home-selection');
  await entryBtn.click();
  await removeVisualClick(page);

  // Step 2: Login process
  await page.waitForSelector('input[placeholder="Username"]');
  await page.fill('input[placeholder="Username"]', config.user);
  if (config.pass) {
    await page.fill('input[placeholder="Password"]', config.pass);
  }
  
  const signInBtn = page.locator('#login-submit');

  // DOCUMENT & SCREENSHOT
  const step2Text = await aiNarrate(`Enter credentials for ${roleCap} and click sign in`, featureCap);
  fs.appendFileSync(docPath, `${step2Text}\n(image: 02-login-entry.png)\n\n`);

  await addVisualClick(page, signInBtn);
  await takeScreenshot(page, testRunDir, '02-login-entry');
  await signInBtn.click();
  await removeVisualClick(page);
// delete this comment


  // Step 3: Navigation
  // Adjusted to wait for a dashboard element or specific landing indicator
  await page.waitForTimeout(2000); 
  const targetLink = page.locator('nav a', { hasText: new RegExp(`^${featureCap}$`, 'i') });

  if (await targetLink.count() > 0) {
    const step3Text = await aiNarrate(`Maps to the ${featureCap} section from the dashboard`, featureCap);
    fs.appendFileSync(docPath, `${step3Text}\n(image: 04-landed-on-${featureCap}.png)\n\n`);

    await addVisualClick(page, targetLink);
    await takeScreenshot(page, testRunDir, `03-pre-nav-to-${featureCap}`);
    await targetLink.click();
    await removeVisualClick(page);
    await takeScreenshot(page, testRunDir, `04-landed-on-${featureCap}`);
  }

  console.log(`Walkthrough complete. Results saved to: ${testRunDir}`);
  await browser.close();
}

run().catch(console.error); 