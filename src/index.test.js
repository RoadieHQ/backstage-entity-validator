// Mock the dependencies before requiring anything
jest.mock('@actions/core', () => ({
  getInput: jest.fn(() => ''),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
}));

// Mock the validator module
const mockValidateFromFile = jest.fn();
jest.mock('@roadiehq/roadie-backstage-entity-validator/src/validator', () => ({
  validateFromFile: mockValidateFromFile,
}));

// Now we can require the module under test
const indexModule = require('./index.js');

describe('validate function', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    mockValidateFromFile.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('RED: Tests that should fail with current implementation', () => {
    test('should validate all files and report all errors instead of stopping at first failure', async () => {
      // Setup: 3 files, file1 and file3 fail, file2 passes
      mockValidateFromFile
        .mockRejectedValueOnce(new Error('Invalid schema in file1'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Missing required field in file3'));

      const files = ['file1.yaml', 'file2.yaml', 'file3.yaml'];
      const options = { github: false, verbose: false };

      // This will currently fail because validate() returns 1 after first error
      // After fix, it should validate all 3 files
      const exitCode = await indexModule.validate(files, options);

      // Assertions
      expect(mockValidateFromFile).toHaveBeenCalledTimes(3); // Should try all files
      expect(exitCode).toBe(1); // Should still fail overall

      // Should have error messages for both failures
      const errorCalls = consoleErrorSpy.mock.calls.map(call => call.join(' '));
      const errorMessages = errorCalls.join('\n');

      expect(errorMessages).toContain('file1');
      expect(errorMessages).toContain('Invalid schema');
      expect(errorMessages).toContain('file3');
      expect(errorMessages).toContain('Missing required field');
    });

    test('should display summary statistics showing total/passed/failed counts', async () => {
      // Setup: 2 pass, 1 fails
      mockValidateFromFile
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Validation error'));

      const files = ['valid1.yaml', 'valid2.yaml', 'invalid.yaml'];
      const options = { github: false, verbose: false };

      const exitCode = await indexModule.validate(files, options);

      expect(exitCode).toBe(1);

      // Should show summary with counts
      const errorCalls = consoleErrorSpy.mock.calls.map(call => call.join(' '));
      const output = errorCalls.join('\n');

      expect(output).toContain('Total files: 3');
      expect(output).toContain('Passed: 2');
      expect(output).toContain('Failed: 1');
    });

    test('should show success message when all files pass', async () => {
      mockValidateFromFile
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const files = ['valid1.yaml', 'valid2.yaml'];
      const options = { github: false, verbose: true };

      const exitCode = await indexModule.validate(files, options);

      expect(exitCode).toBe(0);
      expect(mockValidateFromFile).toHaveBeenCalledTimes(2);

      const logCalls = consoleLogSpy.mock.calls.map(call => call.join(' '));
      const output = logCalls.join('\n');

      expect(output).toContain('2 file(s) validated successfully');
    });

    test('in verbose mode, should list all failed files with their errors', async () => {
      mockValidateFromFile
        .mockRejectedValueOnce(new Error('Error A'))
        .mockRejectedValueOnce(new Error('Error B'));

      const files = ['fileA.yaml', 'fileB.yaml'];
      const options = { github: false, verbose: true };

      await indexModule.validate(files, options);

      const errorCalls = consoleErrorSpy.mock.calls.map(call => call.join(' '));
      const output = errorCalls.join('\n');

      expect(output).toContain('fileA.yaml');
      expect(output).toContain('Error A');
      expect(output).toContain('fileB.yaml');
      expect(output).toContain('Error B');
      expect(output).toContain('Failed files:');
    });
  });

  describe('GitHub Actions integration', () => {
    test('should call core.setFailed with summary of all errors in GitHub mode', async () => {
      const core = require('@actions/core');

      mockValidateFromFile
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'));

      const files = ['file1.yaml', 'file2.yaml'];
      const options = { github: true, verbose: false };

      await indexModule.validate(files, options);

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed for 2 file(s)')
      );
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('file1.yaml: Error 1')
      );
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('file2.yaml: Error 2')
      );
    });
  });
});
