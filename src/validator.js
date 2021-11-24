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

function modifyPlaceholders(obj) {
  for (let k in obj) {
    if (typeof obj[k] === "object") {
      if(obj[k].$text){
        obj[k] = "DUMMY TEXT"
        return;
      }
      modifyPlaceholders(obj[k])
    }
  }
}

exports.validateFromFile = async (filepath = './sample/catalog-info.yml', verbose = true) => {
  const fileContents = fs.readFileSync(filepath, 'utf8');
  if (verbose) {
    console.log(`Validating Entity Schema policies for file ${filepath}`);
  }
  await validate(fileContents, verbose);
};

const validate = async (fileContents, verbose = true) => {
  let validator
  const validateAnnotations = (entity, idx) => {
    if (!validator) {
      validator = ajv.compile(annotationSchema);
    }
    if (verbose) {
      console.log(`Validating entity annotations for file document ${idx}`);
    }
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
    const data = yaml.loadAll(fileContents)
    data.forEach(it => {
      modifyPlaceholders(it)
    })
    const entityPolicies = EntityPolicies.allOf([
      new DefaultNamespaceEntityPolicy(),
      new FieldFormatEntityPolicy(),
      new NoForeignRootFieldsEntityPolicy(),
      new SchemaValidEntityPolicy()]
    )
    const responses = await Promise.all(data.map((it) => {
      return entityPolicies.enforce(it)
    }))
    const validateEntityKind = async (entity) => {
      const results = {}
      for (const validator of Object.entries(VALIDATORS)) {
        const result = await validator[1].check(entity)
        results[validator[0]] = result
        if (result === true && verbose) {
          console.log(`Validated entity kind '${validator[0]}' successfully.`);
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

    if (validKind && validAnnotations && verbose) {
      console.log('Entity Schema policies validated\n')
      responses.forEach(it => console.log(yaml.dump(it)))
    }
  } catch (e) {
    throw new Error(e)
  }
}

exports.validate = validate;
