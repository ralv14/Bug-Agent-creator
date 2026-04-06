// Test execution

const path = require("path"); // For handling folder paths
const fs = require("fs"); // For reading files
const axios = require("axios"); // For Trello API
require("dotenv").config(); // For your API Keys
const { parseFolder } = require("./parser");
const { generateBugReport } = require("./aiBugGenerator");
const { uploadToTrello } = require('./trelloService');
async function testAgent(folderName) {
  const folderPath = path.join(__dirname, "../test-data", folderName);

  console.log(`🧪 TESTING SCENARIO: ${folderName}`);

  // 1. Test Parser
  const batch = await parseFolder(folderPath);
  console.log(
    "✅ Parser found:",
    batch.media.length,
    "media files and",
    batch.textContext.length,
    "chars of text.",
  );

  // 2. Test Gemini (The "Brain")
  const bugData = await generateBugReport(batch);

  console.log("\n--- 📝 AI OUTPUT PREVIEW ---");
  console.log(JSON.stringify(bugData, null, 2));
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "\n🚀 Everything looks good! Upload to Trello? (y/n): ",
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        try {
          // This calls the upload function we wrote earlier
          await uploadToTrello(bugData, batch.media);
          console.log("✨ Bug report is now live on Trello!");
        } catch (err) {
          console.error("❌ Trello upload failed:", err.message);
        }
      } else {
        console.log("👋 Understood. Report discarded.");
      }
      rl.close();
    },
  );
  // STOP HERE: Don't call uploadToTrello yet!
  console.log("\n✅ Dry run complete. Review the JSON for accuracy.");
}


