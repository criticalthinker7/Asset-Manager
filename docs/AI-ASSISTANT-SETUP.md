# Activate the AI Grant Assistant

The **AI Assistant** tab is already built in the dashboard. Today it falls back to a local keyword matcher when the chat API is unavailable. To enable real AI responses, add one server-side API key and redeploy.

## What is already wired up

- UI: dashboard tab at `/assistant` in `src/App.tsx`
- Client: `POST /api/chat` with conversation history + applicant profile
- Server: `api/chat.ts` calls OpenAI (preferred) or Claude with your grant catalog as context (`server/chat.ts`)

## Provider priority

| Priority | Variable | Notes |
|----------|----------|--------|
| **1. OpenAI (recommended if you have credits)** | `OPENAI_API_KEY` | Uses ChatGPT models via the OpenAI API |
| **2. Anthropic fallback** | `ANTHROPIC_API_KEY` | Used only if `OPENAI_API_KEY` is not set |
| **3. No key** | — | Local keyword assistant (deadlines, basic eligibility, draft outlines) |

## Step 1 — Get an OpenAI API key

1. Sign in at [platform.openai.com](https://platform.openai.com/)
2. Go to **API keys** and create a key
3. Confirm your account has credits or billing enabled

Keep this key **server-only**. Never put it in `VITE_*` variables or client code.

## Step 2 — Add environment variables in Vercel

Project: **cangrants-betterhalf** (or your connected Vercel project)

**Settings → Environment Variables**

| Name | Environments | Value |
|------|----------------|-------|
| `OPENAI_API_KEY` | Production, Preview, Development | `sk-...` |
| `OPENAI_MODEL` | Optional | `gpt-4o-mini` (default) or `gpt-4o` |

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
# Add OPENAI_API_KEY=sk-... to .env

npm install
npm run dev:api
```

`npm run dev:api` runs `vercel dev`, which serves both the Vite app and `/api/chat`. Plain `npm run dev` only serves the frontend (chat will use the local fallback).

## Model suggestions

| Model | Best for |
|-------|----------|
| `gpt-4o-mini` | Default — lower cost, good for eligibility Q&A and drafts |
| `gpt-4o` | Higher quality for longer proposal drafting |

## Optional improvements

- **Rate limiting** — add per-user or per-IP limits in `api/chat.ts` before going viral
- **Auth check** — require a valid Supabase session server-side for `/api/chat`

## Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Chat UI + client `sendMessage()` |
| `api/chat.ts` | Vercel serverless entrypoint |
| `server/chat.ts` | System prompt, grant context, OpenAI/Anthropic API calls |
| `src/lib/grant-assistant.ts` | Unused richer local mock (not wired to UI) |
