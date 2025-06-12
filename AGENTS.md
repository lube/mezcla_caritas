# Contribution Guidelines

This repository houses the source code for the **Mezcla Caritas** web
application. Follow these conventions when modifying any files.

## Coding style

* Use **two spaces** for indentation in all files.
* For JavaScript files:
  * Prefer **single quotes** for strings.
  * Terminate statements with a semicolon.
* Keep HTML/EJS templates and CSS formatted with two‑space indentation.
* Ensure files end with a trailing newline.

## Development workflow

1. Install dependencies with `npm install` if not already present.
2. After making changes, run the project's tests using:
   ```bash
   npm test
   ```
   The current test suite simply prints "No tests", but it must be executed to
   verify the command succeeds.
3. Commit your changes with clear commit messages in **English**.

## Pull request instructions

When creating a pull request, provide a short summary of what changed and note
that `npm test` was run. If tests fail because of missing dependencies or
network restrictions in the environment, mention this in the testing section of
the PR body.
