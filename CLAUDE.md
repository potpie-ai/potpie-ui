# Potpie-UI Development Guide

## Build Commands
- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint

## Code Style Guidelines
- **TypeScript**: Use strict mode (tsconfig.json)
- **Component Naming**: PascalCase for components, camelCase for utilities
- **File Structure**: Feature-based organization using Next.js App Router
- **Imports**: React/Next imports first, then components, then utilities
- **Styling**: Use Tailwind CSS with `cn` utility for conditional classes
- **Error Handling**: Use Next.js error boundaries, optional chaining, and nullish coalescing
- **State Management**: Redux Toolkit with Redux Persist for global state, React hooks for local state

## Component Patterns
- Use functional components with TypeScript FC types
- Prefer destructuring props at the component level
- Use "use client" directive for client components

## Local Development
- Set up `.env` file based on `.env.template`
- Configure Firebase and PostHog via environment variables
- Local development mode available for working without external dependencies