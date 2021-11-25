const core = require('@actions/core');
const glob = require('glob');

const usage = `
Usage: validate-entity [OPTION] [FILE]

Validates Backstage entity definition files.  Files may be specified as
arguments or via STDIN, one per line.

OPTION:
-h  display help
-q  minimal output while validating entities
-i  validate files provided over standard input
`.trim();

async function validate(files, { github, verbose }) {
  const { validateFromFile } = require('@roadiehq/roadie-backstage-entity-validator');
  for (const file of files) {
    try {
      if (github) {
        core.setOutput('time', new Date().toTimeString());
      }
      await validateFromFile(file, verbose);
    } catch (err) {
      if (github) {
        core.setFailed(`Action failed with error: ${err.message}`);
      } else {
        console.error(`Failed to validate ${file}: ${err.message}`);
      }
      return 1;
    }
  }
  return 0;
}

async function main() {
  const argv = require('minimist')(process.argv.slice(2), {
    boolean: ['h', 'i', 'q'],
    default: {
      // help
      h: false,
      // read file(s) to validate from STDIN
      i: false,
      // quiet output
      q: false,
    }
  });

  if (argv.h) {
    console.log(usage);
    return 0;
  }

  const options = {
    verbose: !argv.q,
    github: false,
  };

  // files to validate
  let files = [];

  // this will be empty in non-github environments
  const ghPath = core.getInput('path');
  if (ghPath) {
    // add one or more files seperated by comma
    files = files.concat(ghPath.split(','));
    options.github = true;
  }

  const ghVerbose = core.getInput('verbose');
  if (ghVerbose) {
    options.verbose = ghVerbose === 'true';
  }

  // add files specified as arguments
  files = files.concat(argv._);

  if (argv.i) {
    // add files specified over STDIN
    files = files.concat(require('fs')
      .readFileSync(0)
      .toString()
      .split('\n')
      .filter(l => l.length > 0));
  }

  // Expand glob patterns like services/*/catalog.yaml into a list of files
  files = files.map(file => glob.sync(file)).flat();

  if (files.length === 0) {
    console.error('No files specified to validate');
    return 1;
  }

  return await validate(files, options);
}

main().then(process.exit);
