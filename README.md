# Bedrock

A hi-fi prototype of an Atomic Research repository — a tool for distilling raw UX observations into facts → insights → recommendations.

## Stack

- React 19 + TypeScript
- Vite 8 (dev server + build)
- Inline styles only (no CSS modules, no Tailwind)

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

## Other commands

```bash
npm run build     # type-check + production build → dist/
npm run preview   # serve the dist/ build locally
npm run lint      # ESLint
```

## Architecture overview

All navigation is handled in `src/App.tsx` via a `Screen` union-type state — no router.
All colors come from the `HF` token object in `src/tokens.ts` — never hardcode colors elsewhere.
All shared UI primitives (`Btn`, `Chip`, `Level`, `Tag`, `Avatar`, etc.) live in `src/components/kit.tsx`.
All data is static and hardcoded in each screen file — no API layer or state management library.

See `CLAUDE.md` for full architecture notes.
