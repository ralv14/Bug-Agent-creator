
require('dotenv').config();
const inquirer = require('inquirer');
const chalk = require('chalk');

const { startBugAgent } = require('./src/index');
const { uploadToTrello } = require('./src/trelloService');

async function bootstrap() {
  console.log(chalk.cyan("\n🤖 BUG AGENT TERMINAL 🤖\n"));

  // 1. Folder input
  const { folder } = await inquirer.prompt([
    {
      type: 'input',
      name: 'folder',
      message: '📁 Enter folder path:',
      default: 'test-data/bug-001-test'
    }
  ]);

  // 2. Guided inputs (🔥 mejora clave)
  const { env, platform } = await inquirer.prompt([
    {
      type: 'list',
      name: 'env',
      message: '🌐 Select Environment:',
      choices: ['Network', 'Cloud', 'Both']
    },
    {
      type: 'list',
      name: 'platform',
      message: '📱 Select Platform:',
      choices: ['Android', 'iOS', 'Both']
    }
  ]);

  try {
    let { bugData, batch } = await startBugAgent(folder, { env, platform });

    let exit = false;

    // 🔥 LOOP INTERACTIVO (esto cambia todo)
    while (!exit) {
      printPreview(bugData, batch);

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Choose an action:',
          choices: [
            'Edit Title',
            'Edit Severity',
            'Regenerate',
            'Upload to Trello',
            'Cancel'
          ]
        }
      ]);

      switch (action) {
        case "Edit Title": {
          const { title } = await inquirer.prompt([
            { type: "input", name: "title", message: "New title:" },
          ]);
          bugData.title = title;
          break;
        }

        case "Edit Severity": {
          const { severity } = await inquirer.prompt([
            {
              type: "list",
              name: "severity",
              choices: ["Low", "Medium", "High", "Critical"],
            },
          ]);
          bugData.severity = severity;
          break;
        }

        case "Regenerate": {
          console.log(chalk.yellow("\n🔄 Regenerating...\n"));
          const result = await startBugAgent(folder, { env, platform });
          bugData = result.bugData;
          batch = result.batch;
          break;
        }

        case "Upload to Trello": {
            // 🔍 DEBUG (AQUÍ VA)
            console.log("\n📦 FINAL BUG OBJECT:");
            console.log(JSON.stringify(bugData, null, 2));

            // 🔍 VALIDACIÓN
            if (!bugData.title || !bugData.steps) {
                console.log(
                chalk.yellow(
                    "\n⚠️ Incomplete bug data, please review before uploading.\n",
                ),
                );

                const { continueAnyway } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "continueAnyway",
                    message: "Do you still want to upload?",
                    default: false,
                },
                ]);

                if (!continueAnyway) break;
          }

          bugData.platform = platform;
          bugData.environment = env;

          await uploadToTrello(bugData, batch.media || []);
          console.log(chalk.green("\n✅ Uploaded to Trello!\n"));
          exit = true;
          break;
        }

        case "Cancel": {
          console.log(chalk.red("\n❌ Cancelled.\n"));
          exit = true;
          break;
        }
      }
    }

  } catch (err) {
    console.error("❌ Agent Error:", err.message);
  }
}

function printPreview(bug, batch) {
  console.clear();

  console.log(chalk.yellow("📂 Evidence Summary:"));
  console.log(`- Media files: ${batch.media.length}`);
  console.log(`- Has logs: ${batch.textContext.length > 0}`);

  console.log(chalk.cyan("\n--- 📝 BUG PREVIEW ---\n"));

  console.log(chalk.bold("Title:"), bug.title);
  console.log(chalk.bold("Severity:"), bug.severity);

  console.log(chalk.bold("\nDescription:\n"), bug.description);
  console.log(chalk.bold("\nSteps:\n"), bug.steps);
  console.log(chalk.bold("\nActual:\n"), bug.actual);
  console.log(chalk.bold("\nExpected:\n"), bug.expected);

  console.log(chalk.cyan("\n----------------------\n"));
  console.log("\n📦 FINAL BUG OBJECT:");
  console.log(JSON.stringify(bug, null, 2));
}

bootstrap();