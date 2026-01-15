// @ts-nocheck
/* eslint-disable no-import-assign */
// noinspection JSConstantReassignment

// Store original process.argv
const originalArgv = process.argv;

// Mock modules
jest.mock('@actions/core');
jest.mock('@roadiehq/roadie-backstage-entity-validator');
jest.mock('glob');

describe('backstage-entity-validator', () => {
  let core;
  let glob;
  let validateFromFile;
  let validate;
  let main;
  let usage;

  beforeEach(() => {
    // Reset all mocks and module cache
    jest.resetModules();
    jest.clearAllMocks();

    // Reset process.argv
    process.argv = ['node', 'index.js'];

    // Re-require mocked modules after resetModules
    core = require('@actions/core');
    glob = require('glob');
    const validator = require('@roadiehq/roadie-backstage-entity-validator');
    validateFromFile = validator.validateFromFile;

    // Set up default mock implementations
    // @ts-ignore - mocking module for tests
    glob.sync = jest.fn((pattern) => [pattern]);
    core.getInput = jest.fn().mockReturnValue('');
    core.setOutput = jest.fn();
    core.setFailed = jest.fn();
    validateFromFile.mockResolvedValue(undefined);

    // Now require the module under test (which will use our mocks)
    const indexModule = require('./index');
    validate = indexModule.validate;
    main = indexModule.main;
    usage = indexModule.usage;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  describe('validate function', () => {
    it('returns 0 when all files validate successfully', async () => {
      const result = await validate(['file1.yaml', 'file2.yaml'], {
        github: false,
        verbose: true,
        validationSchemaFileLocation: undefined
      });

      expect(result).toBe(0);
      expect(validateFromFile).toHaveBeenCalledTimes(2);
      expect(validateFromFile).toHaveBeenNthCalledWith(1, 'file1.yaml', true, undefined);
      expect(validateFromFile).toHaveBeenNthCalledWith(2, 'file2.yaml', true, undefined);
    });

    it('returns 1 when validation fails', async () => {
      validateFromFile.mockRejectedValue(new Error('Invalid entity'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await validate(['invalid.yaml'], {
        github: false,
        verbose: true,
        validationSchemaFileLocation: undefined
      });

      expect(result).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to validate invalid.yaml: Invalid entity');
      consoleSpy.mockRestore();
    });

    it('stops validation on first failure', async () => {
      validateFromFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Invalid'))
        .mockResolvedValueOnce(undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await validate(['file1.yaml', 'file2.yaml', 'file3.yaml'], {
        github: false,
        verbose: true,
        validationSchemaFileLocation: undefined
      });

      expect(result).toBe(1);
      expect(validateFromFile).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it('passes verbose flag to validator', async () => {
      await validate(['file.yaml'], {
        github: false,
        verbose: false,
        validationSchemaFileLocation: undefined
      });

      expect(validateFromFile).toHaveBeenCalledWith('file.yaml', false, undefined);
    });

    it('passes custom schema location to validator', async () => {
      await validate(['file.yaml'], {
        github: false,
        verbose: true,
        validationSchemaFileLocation: '/path/to/schema.json'
      });

      expect(validateFromFile).toHaveBeenCalledWith('file.yaml', true, '/path/to/schema.json');
    });

    it('validates empty file list without calling validator', async () => {
      const result = await validate([], {
        github: false,
        verbose: true,
        validationSchemaFileLocation: undefined
      });

      expect(result).toBe(0);
      expect(validateFromFile).not.toHaveBeenCalled();
    });

    describe('GitHub Actions mode', () => {
      it('calls core.setOutput with time on success', async () => {
        await validate(['file.yaml'], {
          github: true,
          verbose: true,
          validationSchemaFileLocation: undefined
        });

        expect(core.setOutput).toHaveBeenCalledWith('time', expect.any(String));
      });

      it('calls core.setFailed on validation error', async () => {
        validateFromFile.mockRejectedValue(new Error('Validation failed'));

        const result = await validate(['file.yaml'], {
          github: true,
          verbose: true,
          validationSchemaFileLocation: undefined
        });

        expect(result).toBe(1);
        expect(core.setFailed).toHaveBeenCalledWith('Action failed with error: Validation failed');
      });

      it('does not call console.error in GitHub mode', async () => {
        validateFromFile.mockRejectedValue(new Error('Validation failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await validate(['file.yaml'], {
          github: true,
          verbose: true,
          validationSchemaFileLocation: undefined
        });

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('CLI mode', () => {
      it('logs error to console.error on validation failure', async () => {
        validateFromFile.mockRejectedValue(new Error('Schema mismatch'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await validate(['test.yaml'], {
          github: false,
          verbose: true,
          validationSchemaFileLocation: undefined
        });

        expect(consoleSpy).toHaveBeenCalledWith('Failed to validate test.yaml: Schema mismatch');
        expect(core.setFailed).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  describe('main function', () => {
    describe('help option (-h)', () => {
      it('prints usage and returns 0', async () => {
        process.argv = ['node', 'index.js', '-h'];
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        // Re-require to pick up new argv
        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn((pattern) => [pattern]);
        const indexModule = require('./index');

        const result = await indexModule.main();

        expect(result).toBe(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: validate-entity'));
        consoleSpy.mockRestore();
      });
    });

    describe('quiet option (-q)', () => {
      it('sets verbose to false when -q is provided', async () => {
        process.argv = ['node', 'index.js', '-q', 'file.yaml'];

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn((pattern) => [pattern]);
        const validator = require('@roadiehq/roadie-backstage-entity-validator');
        validator.validateFromFile.mockResolvedValue(undefined);
        const indexModule = require('./index');

        await indexModule.main();

        expect(validator.validateFromFile).toHaveBeenCalledWith('file.yaml', false, undefined);
      });

      it('sets verbose to true by default', async () => {
        process.argv = ['node', 'index.js', 'file.yaml'];

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn((pattern) => [pattern]);
        const validator = require('@roadiehq/roadie-backstage-entity-validator');
        validator.validateFromFile.mockResolvedValue(undefined);
        const indexModule = require('./index');

        await indexModule.main();

        expect(validator.validateFromFile).toHaveBeenCalledWith('file.yaml', true, undefined);
      });
    });

    describe('custom schema location (-l)', () => {
      it('passes schema location to validator', async () => {
        process.argv = ['node', 'index.js', '-l', 'custom-schema.json', 'file.yaml'];

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn((pattern) => [pattern]);
        const validator = require('@roadiehq/roadie-backstage-entity-validator');
        validator.validateFromFile.mockResolvedValue(undefined);
        const indexModule = require('./index');

        await indexModule.main();

        expect(validator.validateFromFile).toHaveBeenCalledWith('file.yaml', true, 'custom-schema.json');
      });
    });

    describe('file arguments', () => {
      it('validates files passed as arguments', async () => {
        process.argv = ['node', 'index.js', 'file1.yaml', 'file2.yaml'];

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn((pattern) => [pattern]);
        const validator = require('@roadiehq/roadie-backstage-entity-validator');
        validator.validateFromFile.mockResolvedValue(undefined);
        const indexModule = require('./index');

        await indexModule.main();

        expect(validator.validateFromFile).toHaveBeenCalledTimes(2);
        expect(validator.validateFromFile).toHaveBeenCalledWith('file1.yaml', true, undefined);
        expect(validator.validateFromFile).toHaveBeenCalledWith('file2.yaml', true, undefined);
      });

      it('returns error when no files specified', async () => {
        process.argv = ['node', 'index.js'];
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn((pattern) => [pattern]);
        const indexModule = require('./index');

        const result = await indexModule.main();

        expect(result).toBe(1);
        expect(consoleSpy).toHaveBeenCalledWith('No files specified to validate');
        consoleSpy.mockRestore();
      });
    });

    describe('glob pattern expansion', () => {
      it('expands glob patterns', async () => {
        process.argv = ['node', 'index.js', 'services/*/catalog-info.yaml'];

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn().mockReturnValue(['services/foo/catalog-info.yaml', 'services/bar/catalog-info.yaml']);
        const validator = require('@roadiehq/roadie-backstage-entity-validator');
        validator.validateFromFile.mockResolvedValue(undefined);
        const indexModule = require('./index');

        await indexModule.main();

        expect(glob.sync).toHaveBeenCalledWith('services/*/catalog-info.yaml');
        expect(validator.validateFromFile).toHaveBeenCalledTimes(2);
        expect(validator.validateFromFile).toHaveBeenCalledWith('services/foo/catalog-info.yaml', true, undefined);
        expect(validator.validateFromFile).toHaveBeenCalledWith('services/bar/catalog-info.yaml', true, undefined);
      });

      it('handles patterns that match no files', async () => {
        process.argv = ['node', 'index.js', 'nonexistent/*.yaml'];
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn().mockReturnValue([]);
        const indexModule = require('./index');

        const result = await indexModule.main();

        expect(result).toBe(1);
        expect(consoleSpy).toHaveBeenCalledWith('No files specified to validate');
        consoleSpy.mockRestore();
      });

      it('handles multiple patterns', async () => {
        process.argv = ['node', 'index.js', 'services/*.yaml', 'teams/*.yaml'];

        jest.resetModules();
        core = require('@actions/core');
        core.getInput = jest.fn().mockReturnValue('');
        glob = require('glob');
        // @ts-ignore - mocking module for tests
        glob.sync = jest.fn()
          .mockReturnValueOnce(['services/a.yaml'])
          .mockReturnValueOnce(['teams/b.yaml']);
        const validator = require('@roadiehq/roadie-backstage-entity-validator');
        validator.validateFromFile.mockResolvedValue(undefined);
        const indexModule = require('./index');

        await indexModule.main();

        expect(validator.validateFromFile).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('GitHub Actions integration', () => {
    it('reads path from GitHub Actions input', async () => {
      process.argv = ['node', 'index.js'];

      jest.resetModules();
      core = require('@actions/core');
      core.getInput = jest.fn().mockImplementation((name) => {
        if (name === 'path') return 'catalog-info.yaml';
        return '';
      });
      core.setOutput = jest.fn();
      glob = require('glob');
      // @ts-ignore - mocking module for tests
      glob.sync = jest.fn((pattern) => [pattern]);
      const validator = require('@roadiehq/roadie-backstage-entity-validator');
      validator.validateFromFile.mockResolvedValue(undefined);
      const indexModule = require('./index');

      await indexModule.main();

      expect(core.getInput).toHaveBeenCalledWith('path');
      expect(validator.validateFromFile).toHaveBeenCalledWith('catalog-info.yaml', true, undefined);
    });

    it('handles comma-separated paths in GitHub Actions input', async () => {
      process.argv = ['node', 'index.js'];

      jest.resetModules();
      core = require('@actions/core');
      core.getInput = jest.fn().mockImplementation((name) => {
        if (name === 'path') return 'file1.yaml,file2.yaml,file3.yaml';
        return '';
      });
      core.setOutput = jest.fn();
      glob = require('glob');
      // @ts-ignore - mocking module for tests
      glob.sync = jest.fn((pattern) => [pattern]);
      const validator = require('@roadiehq/roadie-backstage-entity-validator');
      validator.validateFromFile.mockResolvedValue(undefined);
      const indexModule = require('./index');

      await indexModule.main();

      expect(validator.validateFromFile).toHaveBeenCalledTimes(3);
      expect(validator.validateFromFile).toHaveBeenCalledWith('file1.yaml', true, undefined);
      expect(validator.validateFromFile).toHaveBeenCalledWith('file2.yaml', true, undefined);
      expect(validator.validateFromFile).toHaveBeenCalledWith('file3.yaml', true, undefined);
    });

    it('reads verbose setting from GitHub Actions input', async () => {
      process.argv = ['node', 'index.js'];

      jest.resetModules();
      core = require('@actions/core');
      core.getInput = jest.fn().mockImplementation((name) => {
        if (name === 'path') return 'file.yaml';
        if (name === 'verbose') return 'false';
        return '';
      });
      core.setOutput = jest.fn();
      glob = require('glob');
      // @ts-ignore - mocking module for tests
      glob.sync = jest.fn((pattern) => [pattern]);
      const validator = require('@roadiehq/roadie-backstage-entity-validator');
      validator.validateFromFile.mockResolvedValue(undefined);
      const indexModule = require('./index');

      await indexModule.main();

      expect(validator.validateFromFile).toHaveBeenCalledWith('file.yaml', false, undefined);
    });

    it('reads validationSchemaFileLocation from GitHub Actions input', async () => {
      process.argv = ['node', 'index.js'];

      jest.resetModules();
      core = require('@actions/core');
      core.getInput = jest.fn().mockImplementation((name) => {
        if (name === 'path') return 'file.yaml';
        if (name === 'validationSchemaFileLocation') return 'custom-schema.json';
        return '';
      });
      core.setOutput = jest.fn();
      glob = require('glob');
      // @ts-ignore - mocking module for tests
      glob.sync = jest.fn((pattern) => [pattern]);
      const validator = require('@roadiehq/roadie-backstage-entity-validator');
      validator.validateFromFile.mockResolvedValue(undefined);
      const indexModule = require('./index');

      await indexModule.main();

      expect(validator.validateFromFile).toHaveBeenCalledWith('file.yaml', true, 'custom-schema.json');
    });

    it('sets github option to true when path input is provided', async () => {
      process.argv = ['node', 'index.js'];

      jest.resetModules();
      core = require('@actions/core');
      core.getInput = jest.fn().mockImplementation((name) => {
        if (name === 'path') return 'file.yaml';
        return '';
      });
      core.setOutput = jest.fn();
      glob = require('glob');
      // @ts-ignore - mocking module for tests
      glob.sync = jest.fn((pattern) => [pattern]);
      const validator = require('@roadiehq/roadie-backstage-entity-validator');
      validator.validateFromFile.mockResolvedValue(undefined);
      const indexModule = require('./index');

      await indexModule.main();

      // GitHub mode should call setOutput
      expect(core.setOutput).toHaveBeenCalledWith('time', expect.any(String));
    });

    it('combines GitHub Actions path with CLI arguments', async () => {
      process.argv = ['node', 'index.js', 'cli-file.yaml'];

      jest.resetModules();
      core = require('@actions/core');
      core.getInput = jest.fn().mockImplementation((name) => {
        if (name === 'path') return 'gh-file.yaml';
        return '';
      });
      core.setOutput = jest.fn();
      glob = require('glob');
      // @ts-ignore - mocking module for tests
      glob.sync = jest.fn((pattern) => [pattern]);
      const validator = require('@roadiehq/roadie-backstage-entity-validator');
      validator.validateFromFile.mockResolvedValue(undefined);
      const indexModule = require('./index');

      await indexModule.main();

      expect(validator.validateFromFile).toHaveBeenCalledTimes(2);
      expect(validator.validateFromFile).toHaveBeenCalledWith('gh-file.yaml', true, undefined);
      expect(validator.validateFromFile).toHaveBeenCalledWith('cli-file.yaml', true, undefined);
    });
  });

  describe('usage string', () => {
    it('exports usage string with all options documented', () => {
      expect(usage).toContain('Usage: validate-entity');
      expect(usage).toContain('-h');
      expect(usage).toContain('-q');
      expect(usage).toContain('-i');
      expect(usage).toContain('-l');
    });

    it('describes STDIN input option', () => {
      expect(usage).toContain('standard input');
    });

    it('describes quiet mode option', () => {
      expect(usage).toContain('minimal output');
    });
  });
});
