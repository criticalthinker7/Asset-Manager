# Activate the AI Grant Assistant

The **AI Assistant** tab is already built in the dashboard. Today it falls back to a local keyword matcher when the chat API is unavailable. To enable real Claude responses, add one server-side API key and redeploy.

## What is already wired up

- UI: dashboard tab at `/assistant` in `src/App.tsx`
- Client: `POST /api/chat` with conversation history + applicant profile
- Server: `api/chat.ts` calls Claude with your grant catalog as context (`server/chat.ts`)

## Cost note (important)

Neither **ChatGPT** nor **Claude** offer unlimited free API access for a public website.

| Option | Notes |
|--------|--------|
| **Claude (recommended)** | Matches the “Powered by Claude” label. Pay-per-use via [Anthropic Console](https://console.anthropic.com/). New accounts often include a small starter credit. |
| **ChatGPT / OpenAI** | Paid API at [platform.openai.com](https://platform.openai.com/). Would require swapping the handler in `server/chat.ts`. |
| **Google Gemini** | Has a more generous free tier for light traffic; also requires a code change to use the Gemini API. |
| **No API key** | The app keeps working with the built-in local assistant (deadlines, eligibility keywords, draft outlines). |

For a small applicant audience, Claude API costs are usually modest if you cap `max_tokens` and keep conversations short (already set in `server/chat.ts`).

## Step 1 — Get an Anthropic API key

1. Sign in at [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key
3. Add a payment method or use any starter credits on the account

Keep this key **server-only**. Never put it in `VITE_*` variables or client code.

## Step 2 — Add environment variables in Vercel

Project: **cangrants-betterhalf** (or your connected Vercel project)

**Settings → Environment Variables**

| Name | Environments | Value |
|------|----------------|-------|
| `ANTHROPIC_API_KEY` | Production, Preview, Development | `sk-ant-...` |
| `ANTHROPIC_MODEL` | Optional | `claude-sonnet-4-20250514` (default) |

Redeploy after saving variables.

## Step 3 — Deploy

If Git is connected, merge the branch with `api/chat.ts` and push to `main`, or redeploy the latest commit from the Vercel dashboard.

Production site: [https://www.canadianartgrants.com](https://www.canadianartgrants.com)

## Step 4 — Verify

1. Sign in and open **AI Assistant**
2. Ask: `Which grants am I eligible for as a South Asian director in Ontario?`
3. You should get a specific, catalog-grounded answer (not the generic local fallback)

If the API key is missing or invalid, the UI still responds using the local assistant so applicants are never blocked.

## Local development

```bash
cp .env.example .env
# Add ANTHROPIC_API_KEY=sk-ant-... to .env

npm install
npm run dev:api
```

`npm run dev:api` runs `vercel dev`, which serves both the Vite app and `/api/chat`. Plain `npm run dev` only serves the frontend (chat will use the local fallback).

## Optional improvements

- **Rate limiting** — add per-user or per-IP limits in `api/chat.ts` before going viral
- **Auth check** — require a valid Supabase session server-side for `/api/chat`
- **OpenAI instead** — replace `generateAssistantReply` in `server/chat.ts` with the OpenAI Chat Completions API
- **Gemini free tier** — similar swap using Google AI Studio

## Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Chat UI + client `sendMessage()` |
| `api/chat.ts` | Vercel serverless entrypoint |
| `server/chat.ts` | System prompt, grant context, Claude API call |
| `src/lib/grant-assistant.ts` | Unused richer local mock (not wired to UI) |
