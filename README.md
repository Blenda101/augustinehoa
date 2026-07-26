# Augustine Place HOA

Website for the Augustine Place Homeowners Association — a small, self-managed
neighborhood in southeast Tallahassee, Florida.

Static single-page site (dues, governing documents, board directory, meeting
dates, contact form) plus a few Netlify Functions that gate homeowner-only
information behind a shared access code.

## Structure

```
public/
  index.html                # the entire front-end (HTML, CSS, vanilla JS inline)
  uploads/entrance-sign.png # hero image
netlify/
  functions/
    login.mts               # POST /api/login   — verify shared code, set session cookie
    logout.mts              # POST /api/logout  — clear session cookie
    session.mts             # GET  /api/session — return role + directory if signed in
  lib/
    auth.mts                # shared: code checking, signed cookies, Blobs directory
netlify.toml                # publish = public, functions in netlify/functions
package.json                # @netlify/functions, @netlify/blobs
```

## How access control works

- Board members' **emails and phone numbers are never in the client bundle.** They
  live server-side in `netlify/lib/auth.mts` and in Netlify Blobs, and are returned
  by `/api/login` and `/api/session` **only** for a valid signed-in session.
- Login uses **shared access codes** checked server-side:
  - `RESIDENT_CODE` → homeowner view (reveals contact info, document downloads)
  - `BOARD_CODE` → board view (adds document upload / rename / delete)
- A successful login sets a signed, HttpOnly `hoa_session` cookie (HMAC-signed with
  `SESSION_SECRET`, 30-day expiry). The browser cannot read or forge it.

### Environment variables (set in Netlify → Site settings → Environment variables)

| Variable         | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `RESIDENT_CODE`  | Shared homeowner access code             |
| `BOARD_CODE`     | Shared board-member access code          |
| `SESSION_SECRET` | Random secret used to sign session cookies |

### Editing the directory

The board directory is seeded into Netlify Blobs (store `directory`, key `board`)
on first read from the default in `netlify/lib/auth.mts`. To change it later,
update that blob (or the default and redeploy).

## Deploy

Connected to Netlify — pushes to `main` deploy automatically to
[augustineplacehoa.com](https://augustineplacehoa.com).

## Local development

```bash
npm install
npx netlify dev
```

`netlify dev` serves `public/` and runs the functions locally with Blobs emulation.
