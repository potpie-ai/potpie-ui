<p align="center">
  <a href="https://potpie.ai?utm_source=github">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/readme_logo_dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="assets/logo_light.svg" />
      <img src="assets/logo_light.svg"  alt="Potpie AI logo" />
    </picture>
  </a>
</p>


## Potpie


<p align="center">
<img width="700" alt="Potpie Dashboard" src="assets/dashboard.gif" />
</p>

<p align="center">
  <a href="https://docs.potpie.ai"><img src="https://img.shields.io/badge/Docs-Read-blue?logo=readthedocs&logoColor=white" alt="Docs"></a>
  <a href="https://github.com/potpie-ai/potpie/blob/main/LICENSE"><img src="https://img.shields.io/github/license/potpie-ai/potpie" alt="Apache 2.0"></a>
  <a href="https://github.com/potpie-ai/potpie"><img src="https://img.shields.io/github/stars/potpie-ai/potpie" alt="GitHub Stars"></a>
  <a href="https://discord.gg/ryk5CMD5v6"><img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
  - [Local Development Mode](#local-development-mode)
  - [Production Mode](#production-mode)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Potpie turns your entire codebase into a **knowledge graph** - a structural index of every file, class, and function, capturing all their relationships and what each part of the code does in context of everything else. AI agents built on this graph can reason about your code with the precision of someone who wrote it.

This repository contains the **User Interface** for the Potpie platform.

---

## Features

<table>
  <tr>
    <td valign="top" width="33%">
      <h3>Custom AI Agents</h3>
      <p>Create agents tailored to your specific codebase from a single prompt.</p>
    </td>
    <td valign="top" width="33%">
      <h3>Pre-Built Agents</h3>
      <p>Choose from Debugging, Codebase Q&amp;A, Code Generation, and Code Changes agents.</p>
    </td>
    <td valign="top" width="33%">
      <h3>Chat Interface</h3>
      <p>Easy-to-use chat with streaming support — interact with your agents in real time.</p>
    </td>
  </tr>
</table>

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/potpie-ai/potpie-ui.git
cd potpie-ui

# 2. Copy environment config
cp .env.template .env

# 3. Install dependencies and start
pnpm install
pnpm build
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development

### Local Development Mode

This project supports a local development mode — the app automatically detects missing configurations and falls back to mock implementations:

| Service | Local Mode Behaviour |
|---|---|
| **Firebase Authentication** | Mock user with preset credentials (`local-dev@example.com`) |
| **PostHog Analytics** | No-op implementation — no data sent |
| **Formbricks Bug Reporting** | Disabled |

#### How to Use Local Development Mode

1. Create a `.env` file **without** the following variables:
   - Firebase: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, etc.
   - PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
   - Formbricks: `NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID`, `NEXT_PUBLIC_FORMBRICKS_API_HOST`

2. Run normally — the app detects missing config and uses mocks:
   ```bash
   pnpm run dev
   ```

3. You'll be automatically logged in as:
   - uid: `local-dev-user`
   - email: `local-dev@example.com`

### Production Mode

For production, configure the following services:

| Service | Purpose | Required |
|---|---|---|
| **Firebase Authentication** | User auth | ✅ Yes |
| **PostHog Analytics** | Usage tracking | Optional |
| **Formbricks** | Bug reporting | Optional |

Set your values in `.env` and run:

```bash
pnpm run build
pnpm start
```

---

## Contributing

Contributions are welcome! Please read the [Contributing Guide](https://github.com/potpie-ai/potpie/blob/main/.github/CONTRIBUTING.md) before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<p>
  <a href="https://github.com/potpie-ai/potpie/blob/main/.github/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/Read-Contributing%20Guide-22c55e?style=for-the-badge" alt="Contributing Guide"/>
  </a>
</p>

---

## License

This project is licensed under the Apache 2.0 License — see the [LICENSE](LICENSE) file for details.
