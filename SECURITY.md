# Security

This is experimental software for a single operator on localhost. There is no security audit, supported hosted service, or guaranteed response time. Only the current default branch receives fixes.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/mcontre4/jev-trader/security/advisories/new). Include the affected commit, impact, and reproduction using synthetic credentials/data. Do not open a public issue containing an exploit, real credential, account identifier, balance, or trading history. If private reporting is unavailable, open a minimal issue asking for a private reporting channel without sensitive details.

## Protect your installation

- Keep `.env`, PEM files, database dumps, logs, and backups outside Git. The example environment file contains placeholders only.
- Use unique random secrets. Give exchange keys only required permissions; never grant transfer permission. Use provider IP restrictions where available.
- Keep localhost port bindings. Remote operation needs a separate, reviewed TLS/authentication deployment. CORS or a hidden UI is not access control.
- Treat the terminal token as an account-control secret. Use a trusted browser/device and Lock the UI when finished. Lock does not pause execution.
- Review dependency updates and run checks. Do not add broad scanner exclusions; document narrow false positives.
- Preserve the trading database, especially pending order intents. Do not expose it publicly or share an account with other installations.

## If a secret is exposed

Pause new submissions and review open orders/positions directly on Coinbase. Revoke/rotate affected API keys, terminal tokens, and database credentials immediately. Remove the value from current files, then assess Git history, forks, logs, artifacts, and container configurations. Recreate affected services after updating credentials. Deleting a file does not revoke a key.

Follow [GitHub's guide to removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository). Coordinate history rewrites with collaborators; scanning supplements review and cannot establish that a credential has never escaped.

See the [README](README.md) for financial and operational limitations.
