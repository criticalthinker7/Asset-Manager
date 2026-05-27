# Deploy CanGrants to Vercel (with wishlist)

## Why the banner might not appear

Vercel only updates when it **builds from GitHub**. If the live site still serves `index-DoG8k5tO.js`, it is an **old deployment** — not your latest `main` branch.

Confirm in **Deployments** that the latest build used commit `cc08276` or newer and status is **Ready**.

## Connect Git (one time)

1. Vercel → project **cangrants-betterhalf** → **Settings → Git**
2. Repository should be: `criticalthinker7/Asset-Manager`
3. Production branch: **main**
4. If wrong or missing: **Connect Git Repository** and select that repo

## Deploy latest code

**Option A — Redeploy from Git**

1. **Deployments** tab
2. Open the **⋯** menu on the latest deployment (or **Create Deployment**)
3. Choose branch **main**, commit **cc08276** or newer
4. Deploy → wait for **Ready**

**Option B — Push triggers deploy** (after Git is connected)

```bash
git push origin main
```

## Environment variables

**Settings → Environment Variables** (direct link):

`https://vercel.com/[your-team]/cangrants-betterhalf/settings/environment-variables`

| Name | Value |
|------|--------|
| `VITE_WISHLIST_ENDPOINT` | Your Google Apps Script URL ending in `/exec` |

Redeploy after adding or changing variables.

## Verify the new build

After deploy, view page source. The script tag should **not** be `index-DoG8k5tO.js` — it will be a **new hash** (e.g. `index-D1u_kZbX.js`).

Search the page (or JS bundle) for: `useful in your work`

## URLs

- **Production:** https://cangrants-betterhalf.vercel.app/
- **Preview URLs** (e.g. `...-nrskvazbw-...`) are tied to **one** deployment; use production or the newest preview from the Deployments list

## CLI deploy (optional)

```bash
npm i -g vercel
cd ~/Projects/Asset-Manager
vercel link
vercel --prod
```
