import { chromium, Page, Locator } from 'playwright';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { ensureDir, takeScreenshot, createDocFile } from './utils';

// HOW TO UPDATE AND MAINTAIN THIS SCRIPT:
// 1. To change the target URL: update page.goto('http://localhost:5500')
// 2. To change login credentials: update the strings in page.fill() for Username and Password
// 3. To change where files are saved: update the path.join(process.cwd(), 'TestCases'...) logic
// 4. locator.check(): selects a radio button or checkbox
// 5. locator.click(): performs a mouse click on the element
// 6. locator.fill(): types text into an input field
// 7. takeScreenshot(page, dir, name): saves a full-page image to the specific test folder
// 8. addVisualClick/removeVisualClick: creates the red circle indicator seen in screenshots
// 9. If "Custom" is chosen, the script prompts for a custom feature name used for navigation

// Helper function for terminal input
const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
};

// Function to calculate the next available folder number
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

// Injects a red circle onto the page for visual tracking
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

// Removes the red circle from the page
async function removeVisualClick(page: Page) {
  await page.evaluate(() => document.getElementById('playwright-click-circle')?.remove());
}

// Main execution function
async function run() {
  // Prompt user for role and initial feature choice
  const rawRole = await askQuestion('Select Role (student/teacher/parent): ');
  let rawFeature = await askQuestion('Select Feature (Profile/Courses/Dashboard/Settings or type "Custom"): ');

  // Handle custom feature input
  if (rawFeature.toLowerCase() === 'custom') {
    rawFeature = await askQuestion('Enter the custom feature name to test: ');
  }

  // Standardize naming conventions for folders
  const roleCap = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
  const featureCap = rawFeature.charAt(0).toUpperCase() + rawFeature.slice(1).toLowerCase();

  // Create organized directory structure: /TestCases/WalkThru/Teacher/Profile
  const featureBaseDir = path.join(process.cwd(), 'TestCases', 'WalkThru', roleCap, featureCap);
  ensureDir(featureBaseDir);

  // Generate unique folder name and path inside the specific feature folder
  const folderName = getNextFolderName(featureBaseDir, roleCap, featureCap);
  const testRunDir = path.join(featureBaseDir, folderName);

  // Log start and create test directory and doc file
  console.log(`Starting Test: ${folderName}`);
  ensureDir(testRunDir);
  createDocFile(testRunDir, folderName);

  // Launch browser and open new page
  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to local application
  await page.goto('http://localhost:5500');

  // Step 1: Interface selection
  const radio = page.locator(`input[value="${rawRole.toLowerCase()}"]`);
  await radio.check();
  const startBtn = page.locator('#start-btn');
  await addVisualClick(page, startBtn);
  await takeScreenshot(page, testRunDir, '01-select-role');
  await startBtn.click();
  await removeVisualClick(page);

  // Step 2: Login process
  await page.waitForSelector('#login-page:not(.hidden)');
  await page.fill('input[placeholder="Username"]', 'test-user');
  await page.fill('input[placeholder="Password"]', 'password123');
  const signInBtn = page.locator('#login-submit');
  await addVisualClick(page, signInBtn);
  await takeScreenshot(page, testRunDir, '02-login-entry');
  await signInBtn.click();
  await removeVisualClick(page);

  // Step 3: Navigation based on user prompt
  await page.waitForSelector('#dashboard:not(.hidden)');
  const targetLink = page.locator('nav a', { hasText: new RegExp(`^${featureCap}$`, 'i') });

  // Check if the link exists before clicking
  if (await targetLink.count() > 0) {
    await addVisualClick(page, targetLink);
    await takeScreenshot(page, testRunDir, `03-pre-nav-to-${featureCap}`);
    await targetLink.click();
    await removeVisualClick(page);
    await takeScreenshot(page, testRunDir, `04-landed-on-${featureCap}`);
    console.log(`Successfully navigated to ${featureCap}`);
  } else {
    console.log(`Warning: Navigation link for "${featureCap}" not found.`);
    await takeScreenshot(page, testRunDir, '03-dashboard-fallback');
  }

  // Close browser session
  console.log(`Walkthrough complete. Results saved to: ${testRunDir}`);
  await browser.close();
}

// Error handling for the run function
run().catch(console.error);