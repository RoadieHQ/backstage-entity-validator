# Backstage entity validator

This package can be used as a GitHub action or a standalone node.js module

## GitHub action

### Inputs

#### `path`

**Optional** Path to the catalog-info.yaml file to validate. Defaults to `catalog-info.yaml` at the root of the repository.

### Outputs

None. Prints out the validated YAML on success. Prints out errors on invalid YAML

### Example usage
```
- uses:  RoadieHQ/backstage-entity-validator@v0.2.7
  with:
    path: 'catalog-info-1.yaml'
```


## CircleCI Orb

### Inputs

#### `path`

**Optional** Path to the catalog-info.yaml file to validate. Defaults to `catalog-info.yaml` at the root of the repository.

### Outputs

None. Prints out the validated YAML on success. Prints out errors on invalid YAML

### Example config
```
description: >
  Sample catalog-info.yaml validation
usage:
  version: 2.1
  orbs:
    entity-validator: "roadiehq/backstage-entity-validator@0.2.7"
  workflows:
    use-entity-validator:
      jobs:
        - entity-validator/validate:
            path: catalog-info.yaml
```


## Running with NPM from the repository

### Install dependencies

`npm install`

### Run

#### Via NPM

`npm run validate <path-to-file-to-be-validated.yaml>`


#### As an executable

`bin/bev <path-to-file-to-be-validated.yaml>`

## Running with NPM as a globally installed package

### Install this package

`npm install @roadiehq/backstage-entity-validator -g`

### Run

`validate-entity <path-to-file-to-be-validated.yaml>`
