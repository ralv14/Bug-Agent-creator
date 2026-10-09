# Bug Agent Project Overview

## 🎯 Purpose
Bug Agent is an AI-powered tool that automates the creation and management of detailed bug reports. It uses Google Gemini AI to analyze evidence files (screenshots, logs, attachments) and generates professional bug reports that can be uploaded to Trello for tracking.

## 🏗️ Architecture

### Core Components

#### 1. **Main Entry Point** (`main.js`)
- Interactive terminal CLI interface using Inquirer.js
- Guides users through bug report creation workflow
- Features:
  - Folder path input for evidence files
  - Environment selection (Network, Cloud, or Both)
  - Platform selection (Android, iOS, or Both)
  - Interactive menu for editing and uploading reports
  - Edit Title and Severity options
  - Regenerate reports with Gemini AI
  - Upload to Trello integration

#### 2. **AI Bug Generator** (`src/aiBugGenerator.js`)
- Uses Google Gemini API to analyze evidence
- Processes screenshots, logs, and attachments
- Generates structured bug reports with:
  - Title
  - Description
  - Steps to reproduce (array format)
  - Actual result
  - Expected result
  - Severity level
- Includes retry logic for API failures (handles 503 errors)
- Respects user-specified environment and platform values

#### 3. **Bug Report Parser** (`src/parser.js`)
- Organizes evidence files from the test-data folder
- Extracts media files (screenshots, images)
- Collects text context (logs, error messages)
- Structures evidence into batches for AI processing

#### 4. **Trello Integration** (`src/trelloService.js`)
- Uploads generated bug reports to Trello
- Attaches media files and evidence to Trello cards
- Uses Trello API with authentication tokens
- Creates cards in specified list

#### 5. **Metrics Logger** (`src/metrics-logger.js`)
- Tracks performance metrics for each bug report
- Records:
  - Title of the bug
  - Start time (when user initiates process)
  - Generation time (when AI finishes creating report)
  - Upload time (when report is uploaded to Trello)
- Stores metrics in `src/bug-agent-metrics.csv`

### GitHub Actions Automation

#### **Approve and Upload Workflow** (`.github/workflows/bug-agent-approve.yml`)
Automatically processes bug reports when:
- Issue has `bug-agent` label
- User comments `/approve` on the issue

**Workflow steps:**
1. Checks out repository
2. Installs Node.js dependencies
3. Reads bug report JSON from `.bug-reports/` folder
4. Downloads evidence files from GitHub issue attachments
5. Uploads bug and media to Trello
6. Saves metrics to repository
7. Cleans up temporary report files
8. Posts confirmation comment on the issue

## 📊 Data Flow

```
User Input (Folder, Env, Platform)
           ↓
Parse Evidence Files (Images, Logs)
           ↓
Send to Gemini AI with User Context
           ↓
Generate Structured Bug Report
           ↓
Display Preview to User
           ↓
User Actions:
  ├─ Edit Title
  ├─ Edit Severity
  ├─ Regenerate
  ├─ Upload to Trello
  └─ Cancel
           ↓
Log Metrics (Performance Tracking)
```

## 🚀 Usage

### Local Usage
```bash
npm install
npm start
```

### Interactive Workflow
1. Enter folder path containing test data and evidence
2. Select environment (Network/Cloud)
3. Select platform (Android/iOS)
4. AI generates bug report from evidence
5. Preview report in terminal
6. Choose to edit, regenerate, or upload
7. Upload to Trello and metrics are recorded

### GitHub Integration
1. Create issue with `bug-agent` label
2. Attach evidence files
3. Wait for generation workflow to create report
4. Comment `/approve` to trigger upload
5. Bot uploads to Trello and posts confirmation

## 🔧 Environment Variables Required

```
GEMINI_API_KEY        # Google Gemini API key
TRELLO_API_KEY        # Trello API credentials
TRELLO_TOKEN          # Trello authentication token
TRELLO_LIST_ID        # Target Trello list ID
```

## 📁 Project Structure

```
bug-agent/
├── main.js                    # Main CLI entry point
├── src/
│   ├── index.js              # Bug agent orchestrator
│   ├── aiBugGenerator.js      # Gemini AI integration
│   ├── parser.js             # Evidence file parser
│   ├── trelloService.js       # Trello API client
│   └── metrics-logger.js      # Performance metrics
├── prompts/
│   └── bugAgent.md           # AI prompt template
├── .github/workflows/
│   └── bug-agent-approve.yml # GitHub Actions automation
├── .bug-reports/             # Generated report cache
├── test-data/                # Evidence files storage
└── ci-output/                # Workflow output files
```

## 🎯 Key Features

✅ **AI-Powered Analysis** - Uses Google Gemini to understand evidence and generate reports
✅ **Interactive CLI** - User-friendly terminal interface for customization
✅ **Batch Processing** - Handles multiple evidence files (screenshots, logs, attachments)
✅ **Trello Integration** - Automatic card creation with media attachments
✅ **GitHub Automation** - Seamless integration with GitHub issues and comments
✅ **Performance Tracking** - Logs metrics for analysis and optimization
✅ **Flexible Configuration** - Environment and platform customization
✅ **Error Handling** - Retry logic and graceful failure handling

## 🔄 Workflow Scenarios

### Scenario 1: CLI-Based Bug Creation
1. User runs `npm start`
2. Selects test data folder with evidence
3. Specifies environment and platform
4. AI generates initial report
5. User reviews and edits if needed
6. User uploads to Trello
7. Metrics recorded

### Scenario 2: GitHub-Based Automation
1. Developer creates GitHub issue with evidence
2. Labels issue with `bug-agent`
3. Automated workflow generates report
4. Developer reviews by comment
5. Developer comments `/approve`
6. Report auto-uploads to Trello
7. Confirmation posted on issue
