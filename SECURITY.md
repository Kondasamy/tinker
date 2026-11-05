# Security

## Reporting a vulnerability

Report it privately through GitHub: the repo's **Security** tab → **Report a vulnerability**. Please don't open a public issue. You'll get a reply within a week.

## Scope

Tinker is a static site: no backend, no accounts, no API keys in the browser. What's worth reporting:

- anything that runs untrusted text as HTML or script on a page;
- the module request form, the one thing that sends data out (to FormSubmit);
- the build and record scripts in `scripts/`, which read API keys from the environment only;
- a secret committed anywhere in the repo or its history.

Only `main`, as deployed to https://tinker.kondasamy.com, is supported.
