# 📊 Bug Agent Metrics - QA Assessment Evidence

## Description

This document explains how to use **Bug Agent** metrics as evidence for your next **QA Assessment**.

## 📈 What gets recorded?

Every time a bug is **generated and uploaded to Trello** from the GitHub Actions workflow, it's automatically recorded:

```
timestamp | bug_title | generation_time_s | upload_time_s | total_time_s
```

**Example:**
```
2026-07-15T17:21:32.650Z | Text 'No Color' is too close to line separation | 272.0 | 46.9 | 319.0
```

## 🔄 Recording Flow

```
1. Someone creates an issue with evidence
   ↓
2. Workflow generates the report
   ↓
3. Comment "/approve"
   ↓
4. Workflow uploads to Trello ✅
   ↓
5. BUG RECORDED in CSV automatically 📊
   ↓
6. Updated CSV is committed to the repo
```

## 📁 File Location

```
Bug-Agent-creator/src/bug-agent-metrics.csv
```

**Full history:** It's in the repo, so you can see all changes at:
```
GitHub → Bug-Agent-creator → src/bug-agent-metrics.csv → History
```

## 📊 Using the Dashboard

### Option 1: Open locally

1. Download `metrics-dashboard.html`
2. Open in your browser (double-click)
3. Load the CSV: `src/bug-agent-metrics.csv`

### Option 2: Use in the repo

Place the dashboard in the repo root:
```bash
cp metrics-dashboard.html Bug-Agent-creator/
git add metrics-dashboard.html
git commit -m "docs: add metrics dashboard"
git push
```

Then access from GitHub:
- Raw: `https://raw.githubusercontent.com/your-username/Bug-Agent-creator/main/metrics-dashboard.html`

## 📋 Available Metrics

The dashboard shows:

| Metric | What it measures |
|--------|-----------------|
| **Bugs Generated** | Total bugs created by the agent |
| **Average Generation Time** | How long it takes the agent to analyze evidence and generate report |
| **Average Upload Time** | How long it takes to upload to Trello |
| **Average Total Time** | Time from start to finish |

## 💡 Evidence for QA Assessment

### What can you show?

**1. Original CSV** (`src/bug-agent-metrics.csv`)
   - Complete history of generated bugs
   - Creation timestamps
   - Processing times

**2. Visual Dashboard** (`metrics-dashboard.html`)
   - Performance graphs
   - Aggregated statistics
   - Trend analysis

**3. GitHub Commits**
   - Each bug generates a commit: `📊 log: bug metrics updated`
   - Proof of automatic execution
   - History of when each bug was generated

### How to present it?

```
Evidence: "The Bug Agent has generated X bugs in the last Y days"

Show:
1. Dashboard with:
   - Total number of bugs
   - Average generation time
   - Performance graphs

2. Detailed CSV table with:
   - Title of each bug
   - Date and time
   - Processing times

3. Commits in GitHub:
   - Proof of automatic execution
   - Exact dates of generation
```

## ⚙️ Export Data

If you need the data in another format:

```bash
# Convert CSV to JSON
npm install csv-parser
node -e "const csv = require('csv-parser'); const fs = require('fs'); fs.createReadStream('src/bug-agent-metrics.csv').pipe(csv()).on('data', (row) => console.log(JSON.stringify(row)))"

# Copy CSV to another location
cp src/bug-agent-metrics.csv ~/Documents/bug-agent-metrics-backup.csv
```

## 📌 Important Notes

⚠️ **The CSV is updated ONLY when:**
- The bug is generated successfully
- Approved with `/approve`
- Uploaded to Trello

❌ **NOT recorded if:**
- The workflow fails
- Regenerated without approving
- Cancelled before approving

## 🔐 Privacy

The CSV contains:
- ✅ Bug titles (public in Trello)
- ✅ Processing times (not sensitive)
- ❌ NO internal URLs
- ❌ NO credentials
- ❌ NO user information

It's safe to share for QA Assessment.

## 📞 FAQ

**Q: Can I edit the CSV manually?**
A: Yes, but it will be overwritten when new bugs are generated. Use a backup if needed.

**Q: How much history is saved?**
A: All history is in the repo. You can see it in `git log` or on GitHub.

**Q: How do I reset the metrics?**
A: `git rm src/bug-agent-metrics.csv && git commit && git push`

**Q: Can I automate report generation?**
A: Yes, create a script that reads the CSV and generates a PDF/document.