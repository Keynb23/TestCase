import OpenAI from 'openai';
import * as fs from 'fs';
import path from 'path';

// Setup OpenAI (You can also use Azure OpenAI for a 100% Microsoft stack)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateDocumentationStep(actionType: string, elementText: string, feature: string) {
  const prompt = `
    Context: I am testing the "${feature}" feature in a web app.
    Action: The automated script just performed a ${actionType} on an element labeled "${elementText}".
    
    Task: Write one professional Test Step and its corresponding Expected Result.
    Format it exactly like this:
    Step: [Step description]
    Expected: [Expected result]
  `;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini", // Mini is faster and cheaper for text generation
  });

  return completion.choices[0].message.content;
}

export function writeHeader(dir: string, testName: string, role: string, feature: string) {
  const filePath = path.join(dir, `${testName}.txt`);
  const header = `Test Case ID: ${testName}\n` +
                 `Title: Verify ${feature} functionality for ${role}\n` +
                 `Preconditions: User is logged in as ${role}.\n` +
                 `-------------------------------------------\n`;
  fs.writeFileSync(filePath, header);
}