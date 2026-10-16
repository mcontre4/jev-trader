# Contributing

Contributions are welcome through issues and pull requests. For larger changes, describe the problem and intended behavior in an issue first. Security reports belong in the private channel described in [SECURITY.md](SECURITY.md).

## Set up

Follow the [README](README.md) for dependencies and configuration. Use development credentials and keep trading in preview. Tests must never rely on a funded account or place live orders.

Install [Gitleaks](https://github.com/gitleaks/gitleaks) and the repository hooks:

```sh
poetry -C backend install
npm --prefix frontend ci
poetry -C backend run pre-commit install
```

Run the README checks before submitting, including the full backend suite with Docker available. CI also enforces unit coverage and architectural boundaries. Do not bypass hooks or weaken checks to make a change pass.

## Design and tests

- Follow [AGENTS.md](AGENTS.md): dependencies point from adapters to application to domain, with independent bounded contexts.
- Each application use case exposes `execute(...)` and frozen input/output DTOs. Keep infrastructure behind injected ports.
- Use explicit fakes for unit tests; monkey patching is forbidden. Use real disposable dependencies for adapter integration tests.
- Keep credentials on the server. Never put them in `VITE_*` variables, fixtures, logs, screenshots, or issue attachments.
- Use synthetic data in public examples. Preserve fail-closed execution, durable intents, and unresolved-order reconciliation.
- Document changes to order behavior, persistence, recovery, configuration, and risk controls.

Explain the problem, resulting behavior, and checks run in your pull request. Do not attach real account snapshots or database exports. By contributing, you agree that your contribution is distributed under the project's [MIT license](LICENSE).
