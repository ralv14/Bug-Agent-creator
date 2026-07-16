// scripts/upload-to-trello.js
// Lee un reporte ya generado (JSON) y lo sube a Trello sin regenerar

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const chalk = require("chalk");

const { uploadToTrello } = require("../src/trelloService");
const { logMetric } = require("../src/metrics-logger");

function extractAttachmentUrls(text) {
  const urls = new Set();
  
  // Formato 1: Markdown
  const markdownRegex = /!?\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = markdownRegex.exec(text)) !== null) {
    urls.add(m[1]);
  }
  
  // Formato 2: URLs simples
  const plainUrlRegex = /(https?:\/\/[^\s<>\[\]()]+)/g;
  while ((m = plainUrlRegex.exec(text)) !== null) {
    const url = m[1];
    if (!url.includes("]") && !url.includes("[")) {
      urls.add(url);
    }
  }
  
  return Array.from(urls);
}

async function downloadEvidence(urls, destFolder) {
  let count = 0;
  for (const url of urls) {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const contentType = response.headers["content-type"] || "";
      
      const map = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "text/plain": ".txt",
      };
      let ext = map[contentType];
      
      if (!ext) {
        const urlExt = path.extname(new URL(url).pathname);
        ext = urlExt || ".bin";
      }
      
      count += 1;
      const fileName = `evidence-${count}${ext}`;
      fs.writeFileSync(path.join(destFolder, fileName), response.data);
      console.log(`📎 Descargado: ${fileName}`);
    } catch (err) {
      console.error(`⚠️ No se pudo descargar ${url}: ${err.message}`);
    }
  }
}

async function run() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error("No se encontró el evento de GitHub (GITHUB_EVENT_PATH).");
  }

  const event = JSON.parse(fs.readFileSync(eventPath, "utf-8"));
  const issue = event.issue;
  const issueNumber = issue.number;

  console.log(chalk.cyan("\n🤖 UPLOAD TO TRELLO (without regenerating) 🤖\n"));
  console.log(`🔢 Issue: #${issueNumber}`);

  // 1. Read the previously generated report JSON
  const reportPath = path.join(__dirname, "../ci-output/bug-report.json");
  if (!fs.existsSync(reportPath)) {
    throw new Error(
      "Generated report not found. Did the first workflow execute correctly?"
    );
  }

  const bugData = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  console.log(chalk.green("\n✅ Report loaded (without regenerating):\n"));
  console.log(`Title: ${bugData.title}`);
  console.log(`Severity: ${bugData.severity}`);

  // 2. Download evidence from issue
  const body = issue.body || "";
  const regex = /###\s*[^\n]*Evidencia[^\n]*\n+([\s\S]*?)(?=\n###|$)/i;
  const match = body.match(regex);
  const evidenceText = match ? match[1].trim() : "";

  const folder = path.join(__dirname, `../test-data/issue-${issueNumber}`);
  fs.mkdirSync(folder, { recursive: true });

  const urls = extractAttachmentUrls(evidenceText);
  console.log(`\n📦 Attachments found: ${urls.length}`);
  await downloadEvidence(urls, folder);

  // 3. Preparar media files para Trello
  const mediaFiles = [];
  if (fs.existsSync(folder)) {
    const files = fs.readdirSync(folder);
    for (const file of files) {
      if (file.startsWith("evidence-")) {
        mediaFiles.push({
          fileName: file,
          localPath: path.join(folder, file),
        });
      }
    }
  }

  // 4. Upload to Trello
  const startTime = Date.now();
  const generatedTime = Date.now();

  try {
    const card = await uploadToTrello(bugData, mediaFiles);
    const uploadedTime = Date.now();

    logMetric(bugData.title, startTime, generatedTime, uploadedTime);

    const resultPath = path.join(__dirname, "../ci-output");
    fs.mkdirSync(resultPath, { recursive: true });

    const commentBody = `✅ Bug uploaded to Trello: [${bugData.title}](${card.shortUrl})`;
    fs.writeFileSync(
      path.join(resultPath, "trello-upload-comment.txt"),
      commentBody
    );

    console.log(chalk.green("\n✅ Uploaded to Trello!\n"));
  } catch (err) {
    const resultPath = path.join(__dirname, "../ci-output");
    fs.mkdirSync(resultPath, { recursive: true });

    const errorComment = `❌ Failed to upload to Trello: ${err.message}`;
    fs.writeFileSync(
      path.join(resultPath, "trello-upload-comment.txt"),
      errorComment
    );

    throw err;
  }
}

run().catch((err) => {
  console.error(chalk.red("❌ Run failed:"), err.message);
  const resultPath = path.join(__dirname, "../ci-output");
  fs.mkdirSync(resultPath, { recursive: true });
  fs.writeFileSync(
    path.join(resultPath, "trello-upload-comment.txt"),
    `❌ Error uploading to Trello: ${err.message}`
  );
  process.exit(1);
});