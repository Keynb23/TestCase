import * as fs from 'fs';
import { Page } from 'playwright';
import path from 'path';

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    // recursive: true is essential for nested paths
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function takeScreenshot(page: Page, name: string) {
  // We use process.cwd() to ensure the path is relative to the project root (/TESTCASE/)
  // rather than where this specific file lives.
  const screenshotFolder = path.join(process.cwd(), 'screenshots');
  ensureDir(screenshotFolder);

  const filePath = path.join(screenshotFolder, `${name}.png`);
  
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}.png`);
}