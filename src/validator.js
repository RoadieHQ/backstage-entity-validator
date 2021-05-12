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

exports.validate = async (filepath = './sample/catalog-info.yml') => {

  console.log(`Validating Entity Schema for file ${filepath}`)
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
    console.log("Entity Schema validated\n", yaml.dump(respo))
  } catch (e) {
    core.setFailed(`Action failed with error ${e}`);
    console.log(e);
    throw new Error(e);
  }

}
