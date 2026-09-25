---
name: write-unit-tests
description: Write or extend pytest unit tests for this backend. Use when adding or changing unit tests for domain models, domain services, application services, repository ports, or test doubles.
---

# Write Unit Tests

Write focused tests at the same architectural layer as the code under test. Use pytest functions and fixtures; do not use test classes for setup or shared mutable state.

## Workflow

1. Identify the layer under test. Keep domain and application-service tests isolated from databases, HTTP servers, and other real infrastructure. Test real adapters through integration tests.

2. Identify every dependency of the code under test. Starting from the target test file's directory, inspect its `conftest.py` and each ancestor `conftest.py` for an existing fixture. Use an existing fixture when it provides the required dependency.

3. When no suitable fixture exists, create one in the lowest `conftest.py` directory that is a common ancestor of every test that needs it. Do not import fixtures from sibling `conftest.py` files. Keep `tests/conftest.py` minimal; put database connections and sessions in `tests/integration/conftest.py`.

4. Create or reuse an explicit, deterministic test double for every outgoing port used by an application-service unit test. Do not monkey patch. Use an in-memory implementation for stateful repository/query ports, a recording fake for side-effect ports, and fixed fakes or stubs for clocks, ID generators, flags, and simple responses. Put reusable fakes and factories in `tests/fakes/` or `tests/fixtures/`, mirroring the production domain structure when useful. Use behavior-based names such as `InMemoryUserRepository` and `FakeUnitOfWork`, and create fresh instances for each test.

5. Write behavior-focused tests. Cover success, expected failures, and transaction outcomes where applicable; do not test private implementation details. Use `@pytest.mark.parametrize` when the exact same test behavior, setup, and assertions must run against multiple inputs; use separate tests when cases have materially different behavior or assertions. For create, update, and delete behavior, retrieve the affected entity afterward through the relevant repository port and assert the expected persisted state. Use named immutable module-level constants for IDs, emails, and other values that are repeated or whose meaning matters. Keep one-off literals inline, and never create mutable global test state.

6. Run the focused test first, then the relevant lint, type-checking, and test commands.
