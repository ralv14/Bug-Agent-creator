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
  // Busca dos formatos:
  // 1. URLs en markdown: ![alt](url) o [text](url)
  // 2. URLs simples: https://... (en líneas separadas)
  
  const urls = new Set(); // Set para evitar duplicados
  
  // Formato 1: Markdown
  const markdownRegex = /!?\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = markdownRegex.exec(text)) !== null) {
    urls.add(m[1]);
  }
  
  // Formato 2: URLs simples (github.com/user-attachments o cualquier URL HTTPS)
  const plainUrlRegex = /(https?:\/\/[^\s<>\[\]()]+)/g;
  while ((m = plainUrlRegex.exec(text)) !== null) {
    const url = m[1];
    // Evita agregar URLs que son parte de markdown
    if (!url.includes("]") && !url.includes("[")) {
      urls.add(url);
    }
  }
  
  return Array.from(urls);
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
  
  // 🚀 Soporte para --no-upload (para flujos de dos pasos)
  const shouldUpload = !process.argv.includes("--no-upload");

  console.log(chalk.cyan("\n🤖 BUG AGENT (DESDE ISSUE) 🤖\n"));
  console.log(`🔢 Issue: #${issueNumber}`);
  console.log(`🌐 Entorno: ${env}`);
  console.log(`📱 Plataforma: ${platform}`);

  // 1. Prepara la carpeta de evidencia
  const folder = path.join(__dirname, `../test-data/issue-${issueNumber}`);
  fs.mkdirSync(folder, { recursive: true });

  fs.writeFileSync(path.join(folder, "description.txt"), description);

  console.log(chalk.cyan("\n🔍 DEBUG - Extrayendo URLs de evidencia:"));
  console.log(`Raw evidenceText:\n"${evidenceText}"\n`);
  
  const urls = extractAttachmentUrls(evidenceText);
  console.log(`URLs encontradas: ${urls.length}`);
  if (urls.length > 0) {
    urls.forEach((url, idx) => console.log(`  ${idx + 1}. ${url}`));
  } else {
    console.log("  ⚠️ No se encontraron URLs en el formato esperado");
  }
  
  await downloadEvidence(urls, folder);

  // 2. Corre el Bug Agent
  const startTime = Date.now();
  const { bugData, batch } = await startBugAgent(folder, { env, platform });
  const generatedTime = Date.now();

  bugData.platform = platform;
  bugData.environment = env;

  console.log(chalk.green("\n✅ Bug report generado:\n"));
  console.log(JSON.stringify(bugData, null, 2));

  // 🔍 DEBUG: Log detallado sobre los archivos de evidencia
  console.log(chalk.cyan("\n📦 EVIDENCIA ADJUNTA:"));
  console.log(`Total de archivos en batch.media: ${batch.media ? batch.media.length : 0}`);
  if (batch.media && batch.media.length > 0) {
    batch.media.forEach((file, idx) => {
      const exists = file.localPath && fs.existsSync(file.localPath) ? "✅" : "❌";
      console.log(
        `  ${idx + 1}. ${file.fileName} - Path: ${file.localPath} - Existe: ${exists}`,
      );
    });
  } else {
    console.log("  ⚠️ Sin archivos adjuntos");
  }

  const resultPath = path.join(__dirname, "../ci-output");
  fs.mkdirSync(resultPath, { recursive: true });

  let commentBody;

  if (!bugData.title || !bugData.steps) {
    commentBody =
      "⚠️ El Bug Agent generó un reporte incompleto (falta título o pasos). Revisa la evidencia y vuelve a intentarlo.";
  } else if (!shouldUpload) {
    // 🔍 Modo review: mostrar el reporte y esperar aprobación
    commentBody = `
## ✅ Bug Report Generado

**Título:** ${bugData.title}
**Severidad:** ${bugData.severity}

### 📋 Pasos para reproducir:
${
  Array.isArray(bugData.steps)
    ? bugData.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")
    : bugData.steps
}

### ❌ Resultado Actual:
${bugData.actual}

### ✅ Resultado Esperado:
${bugData.expected}

### 📝 Descripción:
${bugData.description}

---

**¿Está bien el reporte?** 
Si todo se ve correcto, **comenta \`/approve\`** en este issue para subirlo a Trello.
Si necesita cambios, edita este issue y vuelve a crear uno nuevo.`;
  } else {
    try {
      const card = await uploadToTrello(bugData, batch.media || []);
      const uploadedTime = Date.now();
      logMetric(bugData.title, startTime, generatedTime, uploadedTime);

      commentBody = `✅ Bug subido a Trello: [${bugData.title}](${card.shortUrl})`;
      console.log(chalk.green("\n✅ Uploaded to Trello!\n"));
    } catch (err) {
      commentBody = `❌ El Bug Agent generó el reporte pero **falló al subirlo a Trello**: ${err.message}`;
      console.error(chalk.red(commentBody));
    }
  }

  fs.writeFileSync(path.join(resultPath, "bug-report-comment.txt"), commentBody);
  fs.writeFileSync(
    path.join(resultPath, "bug-report.json"),
    JSON.stringify(bugData, null, 2),
  );
  
  // 📄 Si fue un upload (no --no-upload), también guardar en archivo de confirmación
  if (shouldUpload) {
    fs.writeFileSync(path.join(resultPath, "trello-upload-comment.txt"), commentBody);
  }
}

run().catch((err) => {
  console.error(chalk.red("❌ Run failed:"), err.message);
  const resultPath = path.join(__dirname, "../ci-output");
  fs.mkdirSync(resultPath, { recursive: true });
  fs.writeFileSync(
    path.join(resultPath, "bug-report-comment.txt"),
    `❌ El Bug Agent falló al procesar este issue: ${err.message}`,
  );
  process.exit(1);
});