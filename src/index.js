const core = require('@actions/core');
const glob = require('glob');
const { validateFromFile } = require('@roadiehq/roadie-backstage-entity-validator/src/validator');

const usage = `
Usage: validate-entity [OPTION] [FILE]

Validates Backstage entity definition files.  Files may be specified as
arguments or via STDIN, one per line.

OPTION:
-h  display help
-q  minimal output while validating entities
-i  validate files provided over standard input
-l  location of custom validation schema file
`.trim();

async function validate(files, { github, verbose, validationSchemaFileLocation }) {
  const errors = [];
  let successCount = 0;

  for (const file of files) {
    try {
      if (github) {
        core.setOutput('time', new Date().toTimeString());
      }

      await validateFromFile(file, verbose, validationSchemaFileLocation);
      successCount++;
    } catch (err) {
      errors.push({ file, error: err.message });
      if (!verbose) {
        console.error(`Failed to validate ${file}: ${err.message}`);
      }
    }
  }

  // Print summary
  const totalFiles = files.length;
  const failedCount = errors.length;

  if (failedCount > 0) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`Validation Summary:`);
    console.error(`  Total files: ${totalFiles}`);
    console.error(`  ✓ Passed: ${successCount}`);
    console.error(`  ✗ Failed: ${failedCount}`);
    console.error(`${'='.repeat(60)}`);

    if (verbose) {
      console.error(`\nFailed files:`);
      errors.forEach(({ file, error }) => {
        console.error(`  ✗ ${file}`);
        console.error(`    ${error}`);
      });
    }

    if (github) {
      const errorSummary = errors.map(e => `${e.file}: ${e.error}`).join('\n');
      core.setFailed(`Validation failed for ${failedCount} file(s):\n${errorSummary}`);
    }

    return 1;
  }

  if (verbose) {
    console.log(`\n✓ All ${totalFiles} file(s) validated successfully`);
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
    validationSchemaFileLocation: argv.l
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

  const ghValidationSchemaFileLocation = core.getInput('validationSchemaFileLocation');
  if (ghValidationSchemaFileLocation) {
    options.validationSchemaFileLocation = ghValidationSchemaFileLocation;
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

// Export for testing
module.exports = { validate };

// Only run main if this is the entry point
if (require.main === module) {
  main().then(process.exit);
}
