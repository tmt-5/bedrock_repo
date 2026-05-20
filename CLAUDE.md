# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server (HMR)
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # serve the dist/ build locally
```

No test runner is configured.

## Architecture

**Bedrock Repo** is a hi-fi prototype of an Atomic Research tool — a UX research repository where raw observations are distilled into facts → insights → recommendations.

### Navigation

`src/App.tsx` owns a `Screen` union-type state and renders the active screen directly. There is no router. Navigation flows through an `onNavigate(screen: string)` prop passed down to every screen. Adding a new screen means extending the `Screen` type in `App.tsx` and wiring a new `{screen === '…' && <NewScreen />}` branch.

### Design tokens (`src/tokens.ts`)

All colors come from the `HF` object. Never hardcode colors outside of this file. The four atomic research levels (`raw | fact | insight | rec`) each have a sub-object `{ ink, bg, dot, label }` on `HF`, used everywhere level-colored UI is needed. The `AtomicLevel` type is exported from here.

### Component kit (`src/components/kit.tsx`)

A single file containing all shared primitives: `Btn`, `Chip`, `Level`, `Tag`, `Avatar`, `Chain`, `AppShell`, `FlowShell`. All styling is inline (`style={{}}`). There are no CSS modules, no Tailwind, no styled-component library — keep new components consistent with this pattern.

- **`AppShell`** — wraps most screens; provides the collapsible `Sidebar` and a `Topbar` with search + breadcrumb. Pass `leftRail={false}` to suppress the sidebar (used in the add/upload flow).
- **`FlowShell`** — dark-header shell for multi-step flows (Add → Upload).
- **`Level`** — renders a colored pill badge for an `AtomicLevel`.

### Icon system (`src/components/Icon.tsx`)

Icons are inline SVG `<path>` strings stored in a `ICON_PATHS` record. To add a new icon, append a key/path pair to that record. Stroke-based, 24×24 viewBox.

### Screens (`src/screens/`)

| Screen | Key in `App.tsx` | Notes |
|---|---|---|
| `Home` | `home` | Dashboard with "State of solution" cards and recent experiments |
| `AllExperiments` | `all-experiments` / `projects` | Table view of all experiments with atomic chain counts |
| `AddExperiment` | `add-experiment` | Multi-participant data-entry form (accordion cards per participant) |
| `Uploading` | `uploading` | Step 2 of add flow; uses `FlowShell` |
| `ExperimentKanban` | `experiment-kanban` | Kanban board grouped by atomic level (fact / insight / rec) |
| `ExperimentOutline` | `experiment-outline` | Hierarchical outline: insights → facts → recommendations |
| `ExperimentRawData` | `experiment-raw` | Raw session notes view |

`ExperimentHeader` (the tab bar + title row shared by Kanban, Outline, and Raw) is exported from `ExperimentKanban.tsx` and imported by `ExperimentOutline.tsx`.

### Data

All data is static and hardcoded in each screen file. There is no API layer, no state management library, and no persistence.
