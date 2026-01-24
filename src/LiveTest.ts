import { chromium, Page, Locator } from "playwright";
import path from "path";
import fs from "fs";
import readline from "readline";
import { ensureDir, takeScreenshot, createDocFile } from "./utils";

// HOW TO UPDATE AND MAINTAIN THIS SCRIPT:
// 1. To change the prompt: update the CUSTOM_PROMPT variable below
// 2. To change the search query: update the string in page.fill('input[name="q"]', 'chatgpt')
// 3. page.waitForSelector(): ensures the dynamic AI response is finished before scraping
// 4. .innerText(): grabs the text content from the GPT response bubble

const CUSTOM_PROMPT =
  "I am not actually writing this prompt. I am being powered by Playwrite to write this prompt and navigate through this site. Any tips on using an llm to write documentation of manual test cases? I need to document every step of this process and leave notes to go with the screenshots that are already being taken. I've consider Ollama, but not sure what model to use.";

// Helper function for terminal input
const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    }),
  );
};

// Function to calculate the next available folder number
function getNextFolderName(
  baseDir: string,
  siteName: string,
  feature: string,
): string {
  let counter = 1;
  let folderName: string;
  let fullPath: string;
  do {
    const paddedId = counter.toString().padStart(3, "0");
    folderName = `Live_TC_${siteName}_${feature}-${paddedId}`;
    fullPath = path.join(baseDir, folderName);
    counter++;
  } while (fs.existsSync(fullPath));
  return folderName;
}

// Main execution function
async function run() {
  const siteName = "Google_ChatGPT";
  const featureCap = "AI_Prompt";

  const featureBaseDir = path.join(process.cwd(), "LTC", siteName, featureCap);
  ensureDir(featureBaseDir);

  const folderName = getNextFolderName(featureBaseDir, siteName, featureCap);
  const testRunDir = path.join(featureBaseDir, folderName);

  console.log(`Starting Live Test: ${folderName}`);
  ensureDir(testRunDir);

  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Step 1: Go to ChatGPT
  await page.goto("https://chatgpt.com/");
  await page.waitForLoadState("networkidle");

  // Step 2: Handle potential login/overlay block
  // If the prompt box isn't there, you might be stuck on a landing page
  const promptBox = page.locator("#prompt-textarea");
  try {
    await promptBox.waitFor({ state: "visible", timeout: 5000 });
  } catch (e) {
    console.log("Prompt box not found immediately. You might need to sign in manually.");
    // This gives you 30 seconds to click "Stay logged out" or "Login" if needed
    await page.waitForTimeout(5000); 
  }

  // Step 3: Write the prompt
  await promptBox.fill(CUSTOM_PROMPT);
  await takeScreenshot(page, testRunDir, "03-prompt-entered");

  // Step 4: Click the Send Button
  // ChatGPT's send button usually has a specific data-testid or aria-label
  const sendButton = page.locator('button[data-testid="send-button"]');
  
  if (await sendButton.isVisible()) {
    await sendButton.click();
  } else {
    // Fallback: Press Enter again with a forced delay
    await page.keyboard.press("Enter");
  }

  // Step 5: Wait for the response to finish
  console.log("Waiting for GPT response (this may take a moment)...");
  
  // We look for the 'stop' button to appear then disappear, or the text to stop moving
  // Using a generic selector for the latest assistant message
  const responseLocator = page.locator('.markdown').last();
  
  // Wait for the response to start appearing
  await responseLocator.waitFor({ state: "visible", timeout: 15000 });
  
  // Dynamic wait: wait until the "Stop" button is no longer visible (meaning it's done)
  const stopButton = page.locator('button[aria-label="Stop generating"]');
  await stopButton.waitFor({ state: "hidden", timeout: 60000 }).catch(() => {
      console.log("Wait for stop button timed out - scraping current state.");
  });

  const gptText = await responseLocator.innerText();
  await takeScreenshot(page, testRunDir, "04-gpt-response-received");

  // Save the information to the text file
  const textFilePath = path.join(testRunDir, `${folderName}.txt`);
  fs.writeFileSync(
    textFilePath,
    `Prompt Sent: ${CUSTOM_PROMPT}\n\nGPT Response:\n${gptText}`,
  );

  console.log(`Live Test complete. GPT output saved to: ${testRunDir}`);
  await browser.close();
}

run().catch(console.error);