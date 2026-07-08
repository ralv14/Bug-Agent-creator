const fs = require("fs");
const path = require("path");

const METRICS_PATH = path.join(__dirname, "bug-agent-metrics.csv");
const HEADER = "timestamp,bug_title,generation_time_s,upload_time_s,total_time_s\n";

// Escapa comillas y comas para que el título no rompa las columnas del CSV
function csvSafe(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function logMetric(bugTitle, startTime, generatedTime, uploadedTime) {
  try {
    if (!fs.existsSync(METRICS_PATH)) {
      fs.writeFileSync(METRICS_PATH, HEADER);
    }

    const generationTime = ((generatedTime - startTime) / 1000).toFixed(1);
    const uploadTime = ((uploadedTime - generatedTime) / 1000).toFixed(1);
    const totalTime = ((uploadedTime - startTime) / 1000).toFixed(1);

    const row =
      [
        new Date().toISOString(),
        csvSafe(bugTitle),
        generationTime,
        uploadTime,
        totalTime,
      ].join(",") + "\n";

    fs.appendFileSync(METRICS_PATH, row);
  } catch (err) {
    // El logging nunca debe tumbar el flujo principal del agente
    console.error("⚠️ No se pudo registrar la métrica:", err.message);
  }
}

module.exports = { logMetric };