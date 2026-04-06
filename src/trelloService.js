const axios = require('axios');
const fs = require('fs');

async function uploadToTrello(bugData, mediaFiles = []) {
    const { TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_LIST_ID } = process.env;

    try {
        console.log("📤 Creating Trello card...");
        
        // 1. Create the Card
        const cardResponse = await axios.post('https://api.trello.com/1/cards', null, {
            params: {
                key: TRELLO_API_KEY,
                token: TRELLO_TOKEN,
                idList: TRELLO_LIST_ID,
                name: bugData.title,
                desc: bugData.description,
                pos: 'top'
            }
        });

        const cardId = cardResponse.data.id;
        console.log(`✅ Card created: ${cardResponse.data.shortUrl}`);

        // 2. Upload Attachments (if any)
        for (const file of mediaFiles) {
            console.log(`📎 Attaching ${file.fileName}...`);
            
            // Axios 1.7+ supports shorthand postForm for multipart data
            await axios.postForm(`https://api.trello.com/1/cards/${cardId}/attachments`, {
                key: TRELLO_API_KEY,
                token: TRELLO_TOKEN,
                file: fs.createReadStream(file.localPath), // Stream the actual file
                name: file.fileName
            });
        }

        return cardResponse.data;
    } catch (error) {
        const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Trello Upload Failed: ${errorDetail}`);
    }
}

module.exports = { uploadToTrello };