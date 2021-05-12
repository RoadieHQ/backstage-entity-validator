const fs = require('fs');
const yaml = require('js-yaml');
const {
  EntityPolicies,
  DefaultNamespaceEntityPolicy,
  FieldFormatEntityPolicy,
  NoForeignRootFieldsEntityPolicy,
  SchemaValidEntityPolicy
} = require('@backstage/catalog-model')
const core = require('@actions/core');

export async function validate (filepath = './test/sample.yml') {

  console.log('Validating Entity Schema')
  try {
    const fileContents = fs.readFileSync(filepath, 'utf8');
    const data = yaml.load(fileContents);
    const entityPolicies = EntityPolicies.allOf([
      new DefaultNamespaceEntityPolicy(),
      new FieldFormatEntityPolicy(),
      new NoForeignRootFieldsEntityPolicy(),
      new SchemaValidEntityPolicy()]
    )
    const respo = await entityPolicies.enforce(data)
    console.log(respo);
  } catch (e) {
    core.setFailed(`Action failed with error ${e}`);
    console.log(e);
  }

}
