const fs = require('fs')
const yaml = require('js-yaml')
const {
  EntityPolicies,
  DefaultNamespaceEntityPolicy,
  FieldFormatEntityPolicy,
  NoForeignRootFieldsEntityPolicy,
  SchemaValidEntityPolicy,
  apiEntityV1alpha1Validator,
  componentEntityV1alpha1Validator,
  groupEntityV1alpha1Validator,
  locationEntityV1alpha1Validator,
  templateEntityV1alpha1Validator,
  userEntityV1alpha1Validator,
} = require('@backstage/catalog-model')
const annotationSchema = require('./schemas/annotations.schema.json')

const core = require('@actions/core')
const Ajv = require('ajv')

const ajv = new Ajv({verbose: true})
require('ajv-formats')(ajv)

const VALIDATORS = {
  api: apiEntityV1alpha1Validator,
  component: componentEntityV1alpha1Validator,
  group: groupEntityV1alpha1Validator,
  location: locationEntityV1alpha1Validator,
  template: templateEntityV1alpha1Validator,
  user: userEntityV1alpha1Validator,
}

exports.validate = async (filepath = './sample/catalog-info.yml') => {
  const validator = ajv.compile(annotationSchema)
  const validateAnnotations = (entity) => {
    console.log('Validating entity annotations')
    const result = validator(entity)
    if (result === true) {
      return true
    }

    const [error] = validator.errors || []
    if (!error) {
      throw new Error(`Malformed annotation, Unknown error`)
    }

    throw new Error(
      `Malformed annotation, ${error.instancePath || '<root>'} ${error.message}`,
    )

  }

  console.log(`Validating Entity Schema for file ${filepath}\n`)
  try {
    const fileContents = fs.readFileSync(filepath, 'utf8')
    const data = yaml.load(fileContents)
    const entityPolicies = EntityPolicies.allOf([
      new DefaultNamespaceEntityPolicy(),
      new FieldFormatEntityPolicy(),
      new NoForeignRootFieldsEntityPolicy(),
      new SchemaValidEntityPolicy()]
    )
    const respo = await entityPolicies.enforce(data)
    console.log('Running file through validators\n')
    const validateEntityKind = async (entity) => {
      const results = {}
      for (const validator of Object.entries(VALIDATORS)) {
        const result = await validator[1].check(entity)
        results[validator[0]] = result
        if (result === true) {
          console.log(`Validated entity kind '${validator[0]}' successfully.\n`)
        }
      }
      return results
    }
    const validateEntities = async entities => {
      const results = await Promise.all(entities.map(validateEntityKind))
      return Object.values(results[0]).filter((r) => r === false).length > 0
    }
    const validKind = await validateEntities([data])
    const validAnnotations = validateAnnotations(data)

    if (validKind && validAnnotations) {
      console.log('Entity Schema policy validated\n', yaml.dump(respo))
    }
  } catch (e) {
    core.setFailed(`Action failed with error ${e}`)
    console.log(e)
    throw new Error(e)
  }

}
