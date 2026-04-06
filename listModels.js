const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function showMyModels() {
    try {
        console.log("🔍 Fetching your available models...");
        
        // The SDK returns an object, the array is inside .models
        const response = await ai.models.list();

        console.log("\n--- ✅ MODELS YOU CAN USE ---");
        
        // Check if response.models exists and is an array
        if (response.models && Array.isArray(response.models)) {
            response.models.forEach(model => {
                // Filter for models that support generating content
                if (model.supported_generation_methods.includes('generateContent')) {
                    // Strip the 'models/' prefix for your code
                    const modelId = model.name.split('/')[1];
                    console.log(`> ID: ${modelId} (${model.display_name})`);
                }
            });
        } else {
            console.log("Empty or unexpected response structure:", response);
        }

    } catch (error) {
        console.error("❌ API Error:", error.message);
    }
}

showMyModels();