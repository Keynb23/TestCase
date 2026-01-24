🚀 TestCase: Playwright Visual Walkthrough
A specialized automation project designed to demonstrate user journeys through a modern, "ambient dark mode" mock application. This project uses Playwright for automation and Vite for the local development server.

🛠 Tech Stack
Language: TypeScript

Automation: Playwright (Standalone API)

Frontend: HTML5, Tailwind CSS (Ambient Dark Mode)

Bundler: Vite

Execution: tsx (TypeScript Execute)

📂 Project Structure
Plaintext
TestCase/
├── screenshots/          # Generated visual proof of test runs
├── src/
│   ├── app.ts            # The main automation script (The "Brain")
│   ├── utils.ts          # Screenshot & Directory helpers
│   ├── mock-app/
│   │   ├── index.html    # Modern Dark Mode UI
│   │   └── scripts.js    # Mock app logic (DOM manipulation)
├── package.json          # Scripts and dependencies
└── playwright.config.ts  # Config for Playwright Test Runner
🚀 Getting Started
1. Install Dependencies
Bash
npm install
2. Launch the Application
Start the local Vite server to host the mock app:

Bash
npm run dev
The app will be available at http://localhost:5500.

3. Run the Automation Walkthrough
This script triggers the interactive terminal prompt, launches the browser, and captures screenshots with visual click indicators.

Bash
npm run run-app
📸 Automation Features
Visual Click Tracking
The script doesn't just click; it documents. Before every interaction, a red ambient circle is injected into the DOM at the exact click coordinates.

Before Click: Captures the state of the UI with the target highlighted.

After Click: Captures the resulting change in the UI.

Dynamic Role Selection
Upon running the script, you will be prompted in the terminal:

Select Role (student/teacher/parent):

The script then adapts its journey based on your input, verifying that the mock app displays the correct interface for that specific user type.

Dashboard Exploration
Once logged in, the script automatically:

Identifies all navigation links (Profile, Courses, Library).

Iterates through them sequentially.

Captures "Before & After" screenshots for every navigation event.

🧪 Learning Objectives
This project serves as a sandbox for mastering:

Lazy Locators: Using page.locator() for stable element selection.

Race Condition Handling: Using waitForSelector to handle Tailwind CSS transitions (hidden vs. visible).

JS Injection: Using page.evaluate to manipulate the browser environment for better reporting.

Browser Context: Managing standalone browser instances without the standard test runner.

📜 Available Scripts
npm run dev: Start the mock app server.

npm run run-app: Run the TypeScript automation walkthrough.

npm run test: Execute the standard Playwright test suite (if configured).
