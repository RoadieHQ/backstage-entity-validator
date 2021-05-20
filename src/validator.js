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
  const validateAnnotations = (entity, idx) => {
    console.log(`Validating entity annotations for file ${filepath}, document ${idx}`)
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

  try {
    const fileContents = fs.readFileSync(filepath, 'utf8')
    const data = yaml.loadAll(fileContents)
    const entityPolicies = EntityPolicies.allOf([
      new DefaultNamespaceEntityPolicy(),
      new FieldFormatEntityPolicy(),
      new NoForeignRootFieldsEntityPolicy(),
      new SchemaValidEntityPolicy()]
    )
    const responses = await Promise.all(data.map((it, idx) => {
      console.log(`Validating Entity Schema policies for file ${filepath}, document ${idx}`)
      return entityPolicies.enforce(it)
    }))
    const validateEntityKind = async (entity) => {
      const results = {}
      for (const validator of Object.entries(VALIDATORS)) {
        const result = await validator[1].check(entity)
        results[validator[0]] = result
        if (result === true) {
          console.log(`Validated entity kind '${validator[0]}' successfully.`)
        }
      }
      return results
    }
    const validateEntities = async entities => {
      const results = await Promise.all(entities.map(validateEntityKind))
      return Object.values(results[0]).filter((r) => r === false).length > 0
    }
    const validKind = await validateEntities(data)
    const validAnnotations = data.map((it, idx) => validateAnnotations(it, idx))

    if (validKind && validAnnotations) {
      console.log('Entity Schema policies validated\n')
      responses.forEach(it => console.log(yaml.dump(it)))
    }
  } catch (e) {
    core.setFailed(`Action failed with error ${e}`)
    console.log(e)
    throw new Error(e)
  }

}
