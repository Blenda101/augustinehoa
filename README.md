# Augustine Place HOA

Website for the Augustine Place Homeowners Association — a small, self-managed
neighborhood in southeast Tallahassee, Florida.

Static single-page site: dues, governing documents, board directory, meeting
dates, and a contact form. No build step.

## Structure

- `index.html` — the entire site (HTML, CSS, and vanilla JS inline)
- `uploads/entrance-sign.png` — hero image
- `netlify.toml` — Netlify config (publishes the repo root, no build)

## Local preview

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

## Demo access codes

The "Resident sign in" gating is a front-end demo:

- `resident` — homeowner view (reveals contact info, document downloads)
- `board` — board-member view (adds document upload / rename / delete)

> Note: the gating is cosmetic. Board contact details currently live in the
> client-side JavaScript, so they are visible in the page source regardless of
> sign-in. Real access control requires a backend.

## Deploy

Connected to Netlify — pushes to `main` deploy automatically.
