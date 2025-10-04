# AbAI — Cloudflare Pages + Functions (No local run)
Deploy the antibody shopping/planner the **same way as your sentiment program**.

## What’s inside
- **Static frontend** (`index.html`) using Tailwind CDN (no build step)
- **Serverless API** at `/api/antibodies` implemented with **Cloudflare Pages Functions** (`functions/api/antibodies.ts`)
- **Mock data** in `functions/api/data.json` (swap for DB or vendor feeds later)

## One‑time setup (all in browser)
1. Push this folder to **GitHub** (new repo → upload).
2. In **Cloudflare Dashboard** → Pages → *Create a project* → *Connect to GitHub* → choose your repo.
3. **Build settings:**
   - Framework preset: **None**
   - Build command: **(leave blank)**
   - Build output directory: **/** (root)
   Pages will auto-detect the `functions/` directory and deploy the API.

You’ll get a live URL like `https://abai.pages.dev` with the UI and `/api/antibodies` available.

## Customization
- Extend scoring/filtering in `functions/api/antibodies.ts` (`score()`).
- Replace mock JSON with a database (Cloudflare **D1**, **KV**, or **Supabase**): fetch inside the function.
- Add routes: e.g., `/api/epitope` for BLAST/epitope scans.

---
Zero local tooling. Same Cloudflare flow as your sentiment app.
