# Backstage entity validator

This package can be used as a GitHub action or a standalone node.js module

## GitHub action

### Inputs

#### `path`

**Optional** Path to the catalog-info.yaml file to validate. Defaults to `catalog-info.yaml` at the root of the repository.

### Outputs

None. Prints out the validated YAML on success. Prints out errors on invalid YAML

The time we greeted you.

### Example usage
```
- uses:  RoadieHQ/backstage-entity-validator@v0.1.0
  with:
    path: 'catalog-info-1.yaml'
```

## Running with NPM

### Install dependencies

#### `npm install`

### Run

#### Via NPM

`npm run validate <path-to-file-to-be-validated.yaml>`


#### As an executable

`bin/bev <path-to-file-to-be-validated.yaml>`
