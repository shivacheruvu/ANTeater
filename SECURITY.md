# Security

This project is open source. Fork it, copy it, learn from it. What it never contains is anything that
lets someone spend the author's money or act as the author.

## How the app stays keyless

- **Product data** comes from Open Food Facts, which needs no API key to read.
- **AI features are Bring-Your-Own-Key.** Each person pastes their own Gemini API key into Settings. The key is
  saved only in that browser's localStorage and sent only to `generativelanguage.googleapis.com`, in a request
  header (never in a URL). There is no server, so no key is ever stored or proxied by this project.
- **Scan history and prices** stay in the browser. Nothing is uploaded.

## Repository guards

- Every push and pull request is scanned for secrets with gitleaks (`.github/workflows/secret-scan.yml`).
- `main` is protected: changes land through pull requests that must pass the secret scan and tests.
- A local pre-commit hook (`.pre-commit-config.yaml`) catches secrets before they leave your machine:
  `pip install pre-commit && pre-commit install`.

## If you find a leaked credential

Open an issue titled "Security" **without** pasting the value, and it will be rotated.
