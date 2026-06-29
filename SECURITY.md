# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in KI Hub, please report it **privately**
so it can be addressed before public disclosure.

- **Preferred:** open a private report via GitHub Security Advisories —
  <https://github.com/Altinn/Kitt_KI_Hub/security/advisories/new>
- **Alternatively:** contact the maintainers (the KITT team) through your
  internal Digdir/Altinn channel.

Please include:

- A description of the issue and its impact
- Steps to reproduce (a proof of concept if possible)
- The affected files, plugins, skills, agents, hooks, or workflows

Do **not** open a public issue for security problems.

## Scope

This repository distributes agent definitions, instructions, skills, hooks, and
plugin manifests. Security-relevant areas include:

- Hooks and scripts that execute commands (`hooks/*/`)
- Agentic workflows that run in CI (`workflows/`)
- Plugin manifests that reference external sources (`plugins/external.json`)

## Response

We aim to acknowledge reports within a few business days and to share a
remediation timeline after triage.
