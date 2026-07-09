# Deploy CanGrants to Hostinger

**Live URL:** https://betterhalffilms.com/cangrants/

## 1. Build (on your Mac, in this project)

```bash
cd ~/Projects/Asset-Manager
npm run build
```

## 2. Upload via Hostinger File Manager

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com).
2. Open **Websites** → your site → **File Manager**.
3. Go to **`public_html`** (your site root).
4. Open or create folder **`cangrants`**.
5. **Delete old files** inside `cangrants` if you are replacing a placeholder.
6. Upload **everything inside** the local `dist` folder:
   - `index.html`
   - `assets/` (folder)
   - `cangrants-logo.svg`
   - `favicon.svg`
   - `.htaccess`

Do **not** upload the `dist` folder itself — upload its **contents**.

## 3. Test

Open https://betterhalffilms.com/cangrants/

QA credentials are managed in Supabase and should be shared out-of-band. Do not store live passwords in this repo.

## WordPress note

If `/cangrants` is also a WordPress **page**, a physical `public_html/cangrants/` folder usually takes priority. If the app does not load, remove or unpublish the WordPress page with slug `cangrants`, or ask your developer to point the menu link to this static folder only.

## Updates later

After code changes: run `npm run build` again and re-upload the new `dist` contents to `public_html/cangrants/`.
