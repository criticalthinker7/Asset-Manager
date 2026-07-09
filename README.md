# CanGrants

AI-powered grant discovery and management for Canadian artists and producers. Built by BetterHalf Films.

Demo and QA credentials are managed in Supabase and shared out-of-band. Do not commit live passwords to this repository.

## Stack

React 18, TypeScript, Vite 5, Tailwind CSS v4, Radix UI primitives, wouter for routing, TanStack Query for data, framer-motion for animation.

## Getting started

```
npm install
npm run dev
```

The app runs at http://localhost:5173.

## Scripts

- `npm run dev` — Vite dev server (UI only; APIs need `vercel dev`)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built app locally
- `npm run typecheck` — TypeScript check without emit

## Wishlist & newsletter (Google Sheets)

Submissions go to Vercel APIs (`api/wishlist.ts`, `api/newsletter.ts`) and append rows via a Google service account.

**Setup:** [docs/GOOGLE-SHEETS-SETUP.md](docs/GOOGLE-SHEETS-SETUP.md)  
**Env template:** [.env.example](.env.example)  
**Vercel project:** `cangrants-betterhalf` — set `GOOGLE_*` variables in the dashboard (never in client code).

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

## Wishlist (homepage interest list)

The welcome page includes a wishlist banner (name, email, city, country). Submissions are stored in **Google Sheets** via Apps Script.

1. Follow **[docs/WISHLIST-SETUP.md](docs/WISHLIST-SETUP.md)** to create the sheet, deploy the script, and get the web app URL.
2. Copy [`.env.example`](.env.example) to `.env` locally, or set variables in **Vercel → Settings → Environment Variables**:
   - `VITE_WISHLIST_ENDPOINT` — Apps Script web app URL
   - `VITE_WISHLIST_SECRET` — (optional) shared secret for spam reduction
3. Redeploy on Vercel after adding env vars.

Export signups anytime from Google Sheets (**File → Download → CSV**).

## Notes

This project was exported from a Replit pnpm monorepo and flattened into a standalone Vite app. The original `catalog:` and `workspace:*` package references have been replaced with concrete versions. The `@workspace/api-client-react` workspace dependency was removed because it isn't used in the current source.

## License

Proprietary. (c) BetterHalf Films Ltd.
