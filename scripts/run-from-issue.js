// scripts/run-from-issue.js
// Lee el Issue de GitHub (creado con el template "bug-report.yml"),
// descarga la evidencia adjunta, corre el Bug Agent y sube el resultado a Trello.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const chalk = require("chalk");

const { startBugAgent } = require("../src/index");
const { uploadToTrello } = require("../src/trelloService");
const { logMetric } = require("../src/metrics-logger");

function extractSection(body, heading) {
  // Coincide con "### 🌐 Entorno", "### 📱 Plataforma", etc.
  // Permite emojis y espacios antes del heading
  const regex = new RegExp(
    `###\\s*[^\\n]*${heading}[^\\n]*\\n+([\\s\\S]*?)(?=\\n###|$)`,
    "i",
  );
  const match = body.match(regex);
  return match ? match[1].trim() : "";
}

function extractAttachmentUrls(text) {
  // Coincide con enlaces markdown ![alt](url) y [texto](url)
  const regex = /!?\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  const urls = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

function extensionFromContentType(contentType) {
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "text/plain": ".txt",
  };
  return map[contentType] || "";
}

async function downloadEvidence(urls, destFolder) {
  let count = 0;
  for (const url of urls) {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const contentType = response.headers["content-type"] || "";
      let ext = extensionFromContentType(contentType);

      if (!ext) {
        // fallback: intenta sacar extensión de la URL
        const urlExt = path.extname(new URL(url).pathname);
        ext = urlExt || ".bin";
      }

      count += 1;
      const fileName = `evidence-${count}${ext}`;
      fs.writeFileSync(path.join(destFolder, fileName), response.data);
      console.log(`📎 Descargado: ${fileName} (${url})`);
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

  if (!issue) {
    throw new Error("El evento no contiene un issue.");
  }

  const body = issue.body || "";
  const issueNumber = issue.number;

  const env = extractSection(body, "Entorno") || "Both";
  const platform = extractSection(body, "Plataforma") || "Both";
  const description = extractSection(body, "Descripción") || "Sin contexto adicional";
  const evidenceText = extractSection(body, "Evidencia");

  console.log(chalk.cyan("\n🤖 BUG AGENT (DESDE ISSUE) 🤖\n"));
  console.log(`🔢 Issue: #${issueNumber}`);
  console.log(`🌐 Entorno: ${env}`);
  console.log(`📱 Plataforma: ${platform}`);

  // 1. Prepara la carpeta de evidencia
  const folder = path.join(__dirname, `../test-data/issue-${issueNumber}`);
  fs.mkdirSync(folder, { recursive: true });

  fs.writeFileSync(path.join(folder, "description.txt"), description);

  const urls = extractAttachmentUrls(evidenceText);
  console.log(`📦 Adjuntos encontrados: ${urls.length}`);
  await downloadEvidence(urls, folder);

  // 2. Corre el Bug Agent
  const startTime = Date.now();
  const { bugData, batch } = await startBugAgent(folder, { env, platform });
  const generatedTime = Date.now();

  bugData.platform = platform;
  bugData.environment = env;

  console.log(chalk.green("\n✅ Bug report generado:\n"));
  console.log(JSON.stringify(bugData, null, 2));

  const resultPath = path.join(__dirname, "../ci-output");
  fs.mkdirSync(resultPath, { recursive: true });

  let commentBody;

  if (!bugData.title || !bugData.steps) {
    commentBody =
      "⚠️ El Bug Agent generó un reporte incompleto (falta título o pasos) y **no se subió a Trello**. Revisa la evidencia y vuelve a intentarlo.";
  } else {
    try {
      const card = await uploadToTrello(bugData, batch.media || []);
      const uploadedTime = Date.now();
      logMetric(bugData.title, startTime, generatedTime, uploadedTime);

      commentBody = `✅ Bug procesado y subido a Trello: [${bugData.title}](${card.shortUrl})`;
      console.log(chalk.green("\n✅ Uploaded to Trello!\n"));
    } catch (err) {
      commentBody = `❌ El Bug Agent generó el reporte pero **falló al subirlo a Trello**: ${err.message}`;
      console.error(chalk.red(commentBody));
    }
  }

  fs.writeFileSync(path.join(resultPath, "comment.txt"), commentBody);
  fs.writeFileSync(
    path.join(resultPath, "bug-report.json"),
    JSON.stringify(bugData, null, 2),
  );
}

run().catch((err) => {
  console.error(chalk.red("❌ Run failed:"), err.message);
  const resultPath = path.join(__dirname, "../ci-output");
  fs.mkdirSync(resultPath, { recursive: true });
  fs.writeFileSync(
    path.join(resultPath, "comment.txt"),
    `❌ El Bug Agent falló al procesar este issue: ${err.message}`,
  );
  process.exit(1);
});