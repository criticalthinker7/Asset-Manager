# CanGrants

AI-powered grant discovery and management for Canadian artists. Built by BetterHalf Films.

## Stack

React 18, TypeScript, Vite 5, Tailwind CSS v4, Radix UI primitives, wouter for routing, TanStack Query for data, framer-motion for animation.

## Getting started

```
npm install
npm run dev
```

The app runs at http://localhost:5173.

## Scripts

- `npm run dev` — local dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built app locally
- `npm run typecheck` — TypeScript check without emit

## Project layout

```
cangrants/
  src/
    App.tsx          # main app, grant data, UI logic
    main.tsx         # React entry point
    index.css        # Tailwind v4 imports + theme tokens
    components/ui/   # shadcn-style Radix UI components
    hooks/           # custom React hooks
    lib/             # utilities
    pages/           # route components
  public/            # static assets served at root
  vite.config.ts
  tsconfig.json
```

## Notes

This project was exported from a Replit pnpm monorepo and flattened into a standalone Vite app. The original `catalog:` and `workspace:*` package references have been replaced with concrete versions. The `@workspace/api-client-react` workspace dependency was removed because it isn't used in the current source.

## License

Proprietary. (c) BetterHalf Films Ltd.
