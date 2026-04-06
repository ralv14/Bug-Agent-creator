const fs = require('fs');
const path = require('path');

async function parseFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    const evidenceBatch = {
        textContext: "",
        media: []
    };

    for (const file of files) {
        const fullPath = path.join(folderPath, file);
        const ext = path.extname(file).toLowerCase();
        
        // 1. If it's the description/notes file, set it as the primary context
        if (file === 'description.txt' || file === 'notes.txt') {
            evidenceBatch.textContext += fs.readFileSync(fullPath, 'utf-8');
            continue;
        }

        // 2. Handle Logs
        if (['.log', '.txt'].includes(ext)) {
            const logContent = fs.readFileSync(fullPath, 'utf-8');
            evidenceBatch.textContext += `\n\n[LOG: ${file}]\n${logContent}`;
            continue;
        }

        // 3. Handle Media (Images/Videos) for Gemini
        const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.mov': 'video/quicktime' };
        if (mimeMap[ext]) {
            evidenceBatch.media.push({
                inlineData: {
                    mimeType: mimeMap[ext],
                    data: fs.readFileSync(fullPath).toString('base64')
                },
                fileName: file,
                localPath: fullPath
            });
        }

        if (file === "description.txt") {
          evidenceBatch.textContext = fs.readFileSync(fullPath, "utf-8");
        }
    }

    return evidenceBatch;
}

// At the bottom of src/parser.js
module.exports = { 
    parseFolder
   // prepareEvidenceBatch // If you named it this instead, make sure the names match
};