# Contributing to Potpie

Thank you for your interest in contributing to **Potpie**! Whether you're fixing bugs, improving documentation, or building new features, every contribution is valued. This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Code Style](#code-style)
7. [Submitting Pull Requests](#submitting-pull-requests)
8. [Community and Support](#community-and-support)

---

## Code of Conduct

By participating in the Potpie project you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please help us maintain a positive, welcoming environment for everyone.

## How to Contribute

There are many ways to contribute:

- **Report bugs** — open an issue using the [Bug Report](https://github.com/potpie-ai/potpie-ui/issues/new?template=bug_report.yml) template.
- **Request features** — open an issue using the [Feature Request](https://github.com/potpie-ai/potpie-ui/issues/new?template=feature_request.yml) template.
- **Improve documentation** — fix typos, clarify sections, or add missing content.
- **Review pull requests** — provide feedback on open PRs.
- **Write code** — pick up issues labeled [`good first issue`](https://github.com/potpie-ai/potpie-ui/labels/good%20first%20issue) or [`help wanted`](https://github.com/potpie-ai/potpie-ui/labels/help%20wanted).

## Getting Started

### Prerequisites

Make sure you have the following installed:

| Tool | Version | Install |
|---|---|---|
| [Git](https://git-scm.com/) | Any recent | [git-scm.com](https://git-scm.com/) |
| [Node.js](https://nodejs.org/) | **18+** | [nodejs.org](https://nodejs.org/) |
| [pnpm](https://pnpm.io/) | **8+** | `npm install -g pnpm` |

### Fork and Clone the Repository

1. **Fork** this repository on GitHub.

2. **Clone** your fork:

   ```bash
   git clone https://github.com/<your-username>/potpie-ui.git
   cd potpie-ui
   ```

3. **Add the upstream remote** so you can stay up to date:

   ```bash
   git remote add upstream https://github.com/potpie-ai/potpie-ui.git
   ```

### Set Up Your Environment

1. Copy the environment template:

   ```bash
   cp .env.template .env
   ```

   > **Note:** The `.env.template` ships with sensible defaults for local development. Firebase and PostHog credentials are **optional** — the app falls back to mock implementations when they are missing.

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Local Development Mode

When external service credentials are not configured, the app automatically uses mock fallbacks:

| Service | Fallback Behaviour |
|---|---|
| **Firebase Authentication** | Mock user (`local-dev-user` / `local-dev@example.com`) — auto-logged in |
| **PostHog Analytics** | No-op — no data sent |

No additional configuration is required to use local development mode.

## Project Structure

A high-level overview of the repository:

```
potpie-ui/
├── app/            # Next.js App Router pages and layouts
├── components/     # Reusable React components (UI primitives, features)
├── lib/            # Utility functions and shared logic
├── services/       # API service layers
├── contexts/       # React context providers
├── providers/      # App-level providers (layout, auth, theme)
├── configs/        # Runtime configuration
├── public/         # Static assets served by Next.js
├── assets/         # Images, logos, and other media
└── types/          # Shared TypeScript type definitions
```

## Development Workflow

1. **Sync with upstream** before starting work:

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** — write clear, concise code that follows existing conventions.

4. **Run lint and type checks** before committing:

   ```bash
   pnpm run lint
   pnpm run build   # catches TypeScript errors
   ```

5. **Commit your changes** with a descriptive message (imperative mood):

   ```bash
   git commit -m "Add support for XYZ"
   ```

6. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

This project enforces consistent formatting automatically:

- **Prettier** for code formatting.
- **ESLint** for linting (config: `.eslintrc.json`).
- **Husky** pre-commit hooks run lint-staged checks automatically on every commit.

Please do **not** disable or bypass these hooks. If your editor supports it, enable "format on save" with Prettier for the best experience.

## Submitting Pull Requests

When you're ready:

1. **Open a Pull Request** against `main` on [potpie-ai/potpie-ui](https://github.com/potpie-ai/potpie-ui).

2. **Fill in the PR description**:
   - Summarise **what** you changed and **why**.
   - Link related issues (e.g., `Closes #42`).
   - Include screenshots or recordings for UI changes.

3. **Request a review** from a project maintainer.

4. **Respond to feedback** — once approved, a maintainer will merge your PR.

> **Tip:** Keep PRs small and focused. Large, multi-concern PRs are harder to review and more likely to have merge conflicts.

## Community and Support

- **Discord** — [Join the Potpie community](https://discord.gg/ryk5CMD5v6) to chat with contributors and maintainers.
- **GitHub Issues** — [Open an issue](https://github.com/potpie-ai/potpie-ui/issues) for bugs, questions, or feature requests.
- **Docs** — [docs.potpie.ai](https://docs.potpie.ai) for platform documentation.

---

Thank you for contributing to Potpie!
