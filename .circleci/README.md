# Orb Development Pipeline

This configuration file uses [orb-tools orb]() version 10 to automatically _pack_, _test_, and _publish_ CircleCI orbs using this project structure. View the comments within the config file for a full break  down

## Overview:

**Imported Orbs**

Both orb-tools and a development version of your orb will be imported into the config. On the first run, a `dev:alpha` development tag _must_ exist on your orb, but will be handled automatically from there on.

**Jobs**

In the _jobs_ key, you will define _integration tests_. These jobs will utilize the functionality of your orb at run-time and attempt to validate their usage with live examples. Integration tests can be an excellent way of determining issues with parameters and run-time execution.

### Workflows

There are two workflows which automate the pack, test, and publishing process.

**test-pack**

This is the first of the two workflows run. This workflow is responsible for any testing or prepping prior to integration tests. This is where linting occurs, shellchecking, BATS tests, or anything else that can be be tested without the need for further credentials.

This Workflow will be placed on _hold_ prior to publishing a new development version of the orb (based on this commit), as this step requires access to specific publishing credentials.

This allows users to fork the orb repository and begin the pipeline, while the code-owners review that the code is safe to test in an environment where publishing keys will be present.

Once approved, the development version of the orb will publish and the _trigger-integration-tests-workflow_ job will run, kicking off the next workflow

**integration-test_deploy**

The second and final workflow is manually triggered by the _trigger-integration-tests-workflow_ job. In this run, the development version of the orb that was just published will be imported, and the integration tests will run.

When running on the `master` branch (after merging to `master`), the workflow will additionally publish your new production orb.