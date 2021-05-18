# Commands

Easily add and author [Reusable Commands](https://circleci.com/docs/2.0/reusing-config/#authoring-reusable-commands) to the `src/commands` directory.

Each _YAML_ file within this directory will be treated as an orb command, with a name which matches its filename.

View the included _[greet.yml](./greet.yml)_ example.

```yaml
description: >
  Replace this text with a description for this command.
  # What will this command do?
  # Descriptions should be short, simple, and clear.
parameters:
  greeting:
    type: string
    default: "Hello"
    description: "Select a proper greeting"
steps:
  - run:
      name: Hello World
      command: echo << parameters.greeting >> world
```

## See:
 - [Orb Author Intro](https://circleci.com/docs/2.0/orb-author-intro/#section=configuration)
 - [How to author commands](https://circleci.com/docs/2.0/reusing-config/#authoring-reusable-commands)
