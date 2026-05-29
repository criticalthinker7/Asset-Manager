# CanGrants wishlist (Google Sheets)

The homepage wishlist banner sends signups to a Google Sheet via Apps Script. No Hostinger or Vercel server code is required.

## 1. Create the sheet

1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet (e.g. **CanGrants Wishlist**).
2. In row 1, add headers:

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | timestamp | name | email | city | country | source |

## 2. Add Apps Script

1. In the sheet: **Extensions → Apps Script**.
2. Delete any default code and paste the contents of [`wishlist-apps-script.gs`](./wishlist-apps-script.gs) from this repo.
3. **Save** the project.

### Optional spam protection

1. In Apps Script: **Project Settings** (gear) → **Script properties** → Add property:
   - Name: `WISHLIST_SECRET`
   - Value: a long random string you generate
2. Use the **same** value in Vercel as `VITE_WISHLIST_SECRET`.

## 3. Deploy the web app

1. **Deploy → New deployment**.
2. Type: **Web app**.
3. **Execute as:** Me  
4. **Who has access:** Anyone  
5. Deploy and **copy the Web app URL** (ends with `/exec`).

## 4. Configure Vercel

In your Vercel project → **Settings → Environment Variables**:

| Variable | Value |
|----------|--------|
| `VITE_WISHLIST_ENDPOINT` | Web app URL from step 3 |
| `VITE_WISHLIST_SECRET` | (optional) same as Script property |

Redeploy the project so the build picks up the variables.

## 5. Local development

Copy `.env.example` to `.env` and set the same variables. Restart `npm run dev` after changing `.env`.

## 6. Test

1. Open the site welcome page and submit the wishlist form.
2. Confirm a new row appears in the sheet within a few seconds.

If submissions fail, check the browser network tab. The app uses `Content-Type: text/plain` to avoid CORS preflight issues with Apps Script.

## Export

Use **File → Download → CSV** in Google Sheets anytime you need a spreadsheet export for your test-user interest list.
