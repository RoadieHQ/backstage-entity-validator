
describe('importer',() => {
  it('imports the module correctly', () => {
    const { validateFromFile } = require('@roadiehq/roadie-backstage-entity-validator');
    expect(validateFromFile).toBeTruthy();
  });
});