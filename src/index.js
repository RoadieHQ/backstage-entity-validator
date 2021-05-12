const core = require('@actions/core');
const { validate } = require('./validator')

async function run() {
  try {
    const filePath = core.getInput('path') || process.argv.slice(2)[0];
    await validate(filePath)

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
