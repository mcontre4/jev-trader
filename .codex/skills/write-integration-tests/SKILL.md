---
name: write-integration-tests
description: Write or extend backend integration tests for adapters and infrastructure boundaries. Use when validating PostgreSQL, HTTP, messaging, Redis, or other real external dependencies.
---

# Write Integration Tests

## Workflow

1. Identify the adapter or infrastructure boundary under test. Keep domain and application-service behavior in unit tests; integration tests validate real dependency behavior and boundary mappings.

2. Identify every dependency of the adapter under test. Starting from the target test file's directory, inspect its `conftest.py` and each ancestor `conftest.py` for an existing fixture. Use an existing fixture when it provides the required dependency.

3. When no suitable fixture exists, create one in the lowest `conftest.py` directory that is a common ancestor of every test that needs it. Do not import fixtures from sibling `conftest.py` files. Keep `tests/conftest.py` and `tests/integration/conftest.py` minimal. Put a concrete infrastructure fixture at the nearest common ancestor of tests that request it, and do not make it autouse outside that dependency's specific test scope.

4. For PostgreSQL adapters, use the session-scoped disposable PostgreSQL Testcontainers fixture. Never substitute SQLite, a developer database, staging, or production for a PostgreSQL integration test. Give each test clean state through the integration cleanup fixture.

5. Exercise the adapter through its public port methods. Verify persistence mapping, database constraints, transaction behavior, and expected error translation. After an add, update, or delete, retrieve the affected entity through the relevant repository port and assert the expected persisted state. Do not test SQLAlchemy private details.

6. Mark tests with `@pytest.mark.integration`. Run the focused integration test with Docker available, then run the relevant lint, type-checking, and full test commands.

## Layer responsibilities

- Test a Postgres repository implementation directly to verify its repository-port contract, mapping, and database behavior. When multiple implementations exist, define one stateless, fixture-driven contract base class and inherit it in each concrete adapter test suite; never place setup or mutable state on the test class. Shared contract tests must request only neutral port-level fixtures, never a concrete database, engine, container, or repository fixture. Each concrete adapter scope binds those names to its own implementation. Do not use broad autouse fixtures for concrete services: they would make, for example, a MySQL contract suite start PostgreSQL.
- Test an application service with real infrastructure only for representative production composition and transaction wiring. Keep business-rule variations in application unit tests.
- Test incoming HTTP adapters for request validation and response/error translation. Use a small number of full-stack HTTP-to-real-infrastructure smoke tests for critical workflows.
- Do not repeat every behavior at every layer. Each test should prove the concern unique to its layer.
