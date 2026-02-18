// /src/utils.ts
import * as fs from 'fs';
import { Page } from 'playwright';
import path from 'path';

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createDocFile(dir: string, testName: string) {
  const filePath = path.join(dir, `${testName}.txt`);
  const header = `TEST CASE: ${testName}\n\nTEST NAME: \n\nDESCRIPTION: \n\nPRECONDITIONS: \n\nSTEPS:\n\n`;
  fs.writeFileSync(filePath, header);
}

export async function takeScreenshot(page: Page, dir: string, name: string) {
  ensureDir(dir);
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filePath}`);
}