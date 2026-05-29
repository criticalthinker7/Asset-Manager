# Google Sheets setup (Wishlist + Newsletter)

CanGrants saves form submissions through **Vercel serverless APIs** (`/api/wishlist`, `/api/newsletter`). Credentials stay on the server — nothing Google-related goes in Vite client env vars.

## 1. Prepare the spreadsheet

**Sheet:** [CanGrants WishList](https://docs.google.com/spreadsheets/d/1AMihb-bA1uRk6tnuXT-5T-LMnJVXAjIE-z9JcFA3_tg/edit)

**Spreadsheet ID:** `1AMihb-bA1uRk6tnuXT-5T-LMnJVXAjIE-z9JcFA3_tg`

Create two tabs (exact names matter unless you override env vars):

### Tab `Wishlist` — row 1 headers

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| created_at | source | name | email | city | country |

### Tab `Newsletter` — row 1 headers

| A | B | C | D |
|---|---|---|---|
| created_at | source | name | email |

**Source values** written by the app:

| Value | When |
|-------|------|
| `homepage` | Homepage wishlist or newsletter form |
| `signout_prompt` | User chose “Yes, add me” on sign-out sheet |

## 2. Google Cloud service account

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
4. Create the account → **Keys → Add key → JSON** → download the file.
5. **Do not commit the JSON file.** Store it locally outside the repo.

From the JSON you need:

- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

## 3. Share the sheet with the service account

1. Open the Google Sheet.
2. **Share** → paste the service account email (e.g. `cangrants-sheets@....iam.gserviceaccount.com`).
3. Role: **Editor** → Send.

Without this step, API calls return 500 errors in Vercel logs.

## 4. Vercel environment variables

Project: **cangrants-betterhalf**

**Settings → Environment Variables**  
Direct link pattern:  
`https://vercel.com/simranscarborough-9150s-projects/cangrants-betterhalf/settings/environment-variables`

Add for **Production** and **Preview**:

| Name | Value |
|------|--------|
| `GOOGLE_SHEET_ID` | `1AMihb-bA1uRk6tnuXT-5T-LMnJVXAjIE-z9JcFA3_tg` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from JSON |
| `GOOGLE_PRIVATE_KEY` | Full `private_key` from JSON (see below) |
| `GOOGLE_WISHLIST_TAB` | `Wishlist` |
| `GOOGLE_NEWSLETTER_TAB` | `Newsletter` |

### Private key formatting on Vercel

Paste the key **including** `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`.

Either:

- Paste as one line with `\n` between lines (Vercel stores escapes; the app converts `\\n` → newlines), **or**
- Paste multi-line in Vercel’s value field if the UI allows it.

Wrong key format → `Unable to save submission` in the UI and auth errors in **Runtime Logs**.

## 5. Deploy

Push `main` to the connected GitHub repo, or **Deployments → Redeploy** after env vars are set.

Confirm APIs exist (should **not** be 404):

```bash
curl -sS -X POST "https://cangrants-betterhalf.vercel.app/api/wishlist" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"you@example.com","city":"Toronto","country":"Canada","source":"homepage"}'
```

Expected: `{"ok":true}` and a new row on the **Wishlist** tab.

## 6. Verification checklist

- [ ] Homepage **Wishlist** form → row on `Wishlist`, `source=homepage`
- [ ] Homepage **Newsletter** form → row on `Newsletter`, `source=homepage`
- [ ] Demo login → **Sign Out** → **Yes, add me** → submit → row with `source=signout_prompt`, then sign out
- [ ] **No, sign out** → signs out with **no** new row
- [ ] “Sign out without adding” → no row

## 7. Local development

API routes are **not** served by `npm run dev` alone.

```bash
cp .env.example .env
# Fill in Google values from your service account JSON

npx vercel link    # once, select cangrants-betterhalf
npx vercel env pull .env.local   # optional: pull from Vercel
npx vercel dev
```

Test at the URL `vercel dev` prints (usually `http://localhost:3000`).

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `404` on `/api/wishlist` | Deployment missing `api/` folder — redeploy latest `main` |
| `Unable to save submission` | Missing env vars, wrong private key, or sheet not shared with service account |
| Wrong tab | Tab name mismatch — fix sheet tab or `GOOGLE_*_TAB` env vars |
| CORS error locally | Use `vercel dev`, not plain `vite` |

**Runtime logs:** Vercel → project → **Logs** (filter Production).
