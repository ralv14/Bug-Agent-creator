const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");

const METRICS_PATH = path.join(__dirname, "..", "src", "bug-agent-metrics.csv");
const HEADER = "timestamp,bug_title,generation_time_s,upload_time_s,total_time_s\n";

function csvSafe(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function appendMetric({ timestamp, bugTitle, generationTime, uploadTime, totalTime }) {
  if (!fs.existsSync(METRICS_PATH)) {
    fs.writeFileSync(METRICS_PATH, HEADER);
  }

  const row = [
    timestamp,
    csvSafe(bugTitle),
    Number(generationTime).toFixed(1),
    Number(uploadTime).toFixed(1),
    Number(totalTime).toFixed(1),
  ].join(",") + "\n";

  fs.appendFileSync(METRICS_PATH, row);
}

function estimateUploadTime(generationTime) {
  const base = Number(generationTime);
  if (base <= 0) return 10.0;
  const estimate = Math.max(5.0, Math.min(60.0, base * 0.25));
  return Number(estimate.toFixed(1));
}

function parseTrelloTimestamp(value) {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let [, month, day, year, hour, minute, second, meridiem] = match;
  hour = Number(hour);
  if (/PM/i.test(meridiem) && hour < 12) hour += 12;
  if (/AM/i.test(meridiem) && hour === 12) hour = 0;

  const date = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour,
    Number(minute),
    Number(second),
  ));

  return date.toISOString();
}

const DEFAULT_GENERATION_TIME = 30.0;

async function main() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "timestamp",
      message: "Timestamp (Trello format: 6/10/2026, 11:44:58 AM):",
      default: new Date().toISOString(),
      validate: (value) => parseTrelloTimestamp(value) !== null || "Enter a valid timestamp in Trello format",
    },
    {
      type: "input",
      name: "bugTitle",
      message: "Bug title:",
      validate: (value) => value.trim().length > 0 || "Bug title is required",
    },
    {
      type: "input",
      name: "generationTime",
      message: "Generation time in seconds (optional, press Enter if unknown):",
      validate: (value) => value.trim() === "" || !Number.isNaN(parseFloat(value)) || "Enter a numeric value or leave blank",
    },
    {
      type: "input",
      name: "uploadTime",
      message: "Upload time in seconds (optional, press Enter to estimate):",
      validate: (value) => value.trim() === "" || !Number.isNaN(parseFloat(value)) || "Enter a numeric value or leave blank",
    },
    {
      type: "input",
      name: "totalTime",
      message: "Total time in seconds (optional, press Enter to compute):",
      validate: (value) => value.trim() === "" || !Number.isNaN(parseFloat(value)) || "Enter a numeric value or leave blank",
    },
  ]);

  const generationTime =
    answers.generationTime.trim() === ""
      ? DEFAULT_GENERATION_TIME
      : Number(answers.generationTime);
  const uploadTime =
    answers.uploadTime.trim() === ""
      ? estimateUploadTime(generationTime)
      : Number(answers.uploadTime);
  const totalTime =
    answers.totalTime.trim() === ""
      ? Number((generationTime + uploadTime).toFixed(1))
      : Number(answers.totalTime);
  const timestamp = parseTrelloTimestamp(answers.timestamp);

  if (answers.generationTime.trim() === "") {
    console.log(`\nNo generation time provided, using default ${DEFAULT_GENERATION_TIME}s.`);
  }
  if (answers.uploadTime.trim() === "") {
    console.log(`Estimated upload time: ${uploadTime}s`);
  }
  if (answers.totalTime.trim() === "") {
    console.log(`Estimated total time: ${totalTime}s`);
  }
  console.log("\n");

  appendMetric({
    timestamp,
    bugTitle: answers.bugTitle,
    generationTime,
    uploadTime,
    totalTime,
  });

  console.log("✅ Appended manual metric row to src/bug-agent-metrics.csv");
}

main().catch((err) => {
  console.error("Failed to append metric:", err);
  process.exit(1);
});
