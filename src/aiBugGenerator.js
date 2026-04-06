const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '../.env') });


const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateBugReport(evidenceBatch, userInput) {
  const template = fs.readFileSync(path.join(__dirname, '../prompts/bugAgent.md'), 'utf-8');

// 1. Create a "Strict Context" string
    const strictContext = `
    IMPORTANT: Use the following values for the report. Do NOT guess from images:
    - Environment to use: ${userInput.env}
    - Platform to use: ${userInput.platform}
    `;

    // 2. Inject this at the VERY TOP of the prompt
const promptText = template
    .replace('{{evidenceType}}', evidenceBatch.media.length > 0 ? 'Multimedia' : 'Logs')
    .replace('{{content}}', evidenceBatch.textContext || "No logs")
    .replace('[Network/Cloud]', userInput.env)     // Fills the Instructions
    .replace('[Android/iOS]', userInput.platform)  // Fills the Instructions
    .replace('{{env}}', userInput.env)            // Fills the Output Template
    .replace('{{platform}}', userInput.platform); // Fills the Output Template

    const parts = [{ text: promptText }];

    // 3. Add the media parts
    if (evidenceBatch.media && evidenceBatch.media.length > 0) {
        evidenceBatch.media.forEach(m => {
            parts.push({
                inlineData: {
                    mimeType: m.inlineData.mimeType,
                    data: m.inlineData.data
                }
            });
        });
    }

    // 4. The API Call
    const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: [{
            role: 'user',
            parts: parts 
        }],
        config: {
            response_mime_type: "application/json"
        }
    });

  // 5. Safe Parsing
  // Inside src/aiBugGenerator.js

  try {
    // 1. Get the raw text from the first candidate
    let generatedText = result.candidates[0].content.parts[0].text;

    console.log("📥 Raw AI Response received.");

    // 2. Clean the text: Remove Markdown code blocks if present
    // This regex looks for ```json ... ``` or just ``` ... ```
    const cleanJson = generatedText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 3. Parse the cleaned string
    return JSON.parse(cleanJson);
  } catch (e) {
    // 4. If it fails, log the ACTUAL text so we can see what Gemini said
    console.error("❌ PARSE ERROR! The AI sent this instead of clean JSON:");
    console.log("------------------------------------------");
    console.log(result.candidates[0].content.parts[0].text);
    console.log("------------------------------------------");

    throw new Error(
      "AI output was not valid JSON. See logs above for the raw response.",
    );
  }
}

module.exports = {
  generateBugReport,
};
