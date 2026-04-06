// main.js (Root Directory)

require('dotenv').config();
const { startBugAgent } = require('./src/index');
const { uploadToTrello } = require('./src/trelloService');
const readline = require('readline/promises');

const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
});

async function bootstrap() {
    console.log("🤖 BUG AGENT TERMINAL 🤖\n");

    // Dynamic Input
    const folder = await rl.question('📁 Enter folder name (e.g., bug-001-test): ');
    console.log("(Tip: You can type 'Both', 'Network/Cloud', etc.)");
    //const env = await rl.question('🌐 Environment: ');
    let env = await rl.question('🌐 Environment: ');
    if (env.toLowerCase() === 'b') env = "Network and Cloud";
    let platform = await rl.question('📱 Platform: ');
    if (platform.toLowerCase() === 'b') platform = "Android and iOS";

    

    try {
        // 1. Destructure BOTH values from the result object
        const { bugData, batch } = await startBugAgent(folder, { env, platform });

        // 2. Final Confirmation
        const confirm = await rl.question('\n🚀 Upload to Trello? (y/n): ');
        
        if (confirm.toLowerCase() === 'y') {
            // Now 'batch' is defined in this scope!
            // We pass batch.media (the array of files found by the parser)
            await uploadToTrello(bugData, batch.media || []); 
            console.log("✨ Done!");
        } else {
            console.log("👋 Cancelled.");
        }
    } catch (err) {
       console.error("❌ Agent Error:", err.message);
    } finally {
        rl.close();
    }
}

bootstrap();