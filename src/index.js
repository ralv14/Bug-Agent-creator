// src/index.js
const { parseFolder } = require('./parser');
const { generateBugReport } = require('./aiBugGenerator');
const { uploadToTrello } = require('./trelloService');

async function startBugAgent(folderName, userInput = {}) {
    try {
        console.log(`🧪 PROCESSING: ${folderName}`);
        
        // 1. Parse files
        const batch = await parseFolder(folderName);
        
        // 2. AI Analysis (Passing the Environment/Platform from the user)
        const bugData = await generateBugReport(batch, userInput);
        
        console.log("--- 📝 AI OUTPUT PREVIEW ---");
        console.log(JSON.stringify(bugData, null, 2));

        return { bugData, batch };
    } catch (error) {
        console.error("❌ Agent Error:", error.message);
        throw error;
    }
}

module.exports = { startBugAgent };