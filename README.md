# facilitator

A small multi-site REST API on Vercel. It holds the secret keys (Groq, Web3Forms) so websites never see them. Websites call it, it uses the keys itself, and it returns only results. **It never returns a key to a client.**

Sites: **Dulhaniyaa** (dulahiya.com). SuperFarmFresh comes later.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/dulhaniyaa/services` | Rate card (cached at the edge for 5 min) |
| POST | `/api/dulhaniyaa/plan` | AI plan + server-calculated estimate (5/min per IP) |
| POST | `/api/dulhaniyaa/lead` | Emails the enquiry to Dulhaniyaa's inbox (3/min per IP) |
| POST | `/api/dulhaniyaa/chat` | AI chat reply for the website chat widget (15/min per IP) |

Errors are always JSON: `{ "error": "..." }`, with status codes 400 / 403 / 404 / 405 / 429 / 500 / 502.

## How it works

```
api/[site]/[action].js   one function for every site:
                         site lookup → CORS (that site's origins) → method → rate limit → action
lib/sites.js             site registry (origins, mail key env var, actions, limits)
lib/groq.js              Groq client + groqJSON() (JSON mode, zod-validated, retries once)
lib/mail.js              sendMail() via Web3Forms; all mail code lives here
sites/<site>/            that site's data and actions
```

- Everything goes through one dynamic function, so adding sites never runs into Vercel's function-count limit.
- **`plan` is not an AI proxy.** The client sends only basics and item ids. The server builds the prompt from its own rate card and drops any unknown ids.
- **The server does the math.** The AI writes only text. `estimate.js` calculates every price, subtotal and total, and also sets `budget_check.status`. Any numbers the AI sends back are thrown away. `on_request` items get a `null` price.
- **CORS is per site.** A browser on SuperFarm's origin calling `/api/dulhaniyaa/*` gets a 403. Requests with no `Origin` header (curl, servers) are allowed through. CORS is a browser rule, so the rate limiter is what protects against scripts.
- **Rate limiting** is per IP and keyed by `site:action`. It uses Upstash when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Otherwise it falls back to an in-memory counter, which is per instance and best effort.

## Local development

```bash
npm install
cp .env.example .env.local   # or .env; fill in keys
npm run local                # http://localhost:8787 (tries the next port if busy)
```

`local-server.js` runs the same handlers as Vercel with plain Node, so it doesn't need a Vercel login. `vercel dev` also works if you prefer it.

## Test with curl

```bash
BASE=http://localhost:8787     # or https://<your-project>.vercel.app
ORIGIN=http://localhost:5173

curl -s $BASE/api/health

# Rate card
curl -s $BASE/api/dulhaniyaa/services -H "Origin: $ORIGIN"

# Plan
curl -s -X POST $BASE/api/dulhaniyaa/plan \
  -H "Content-Type: application/json" -H "Origin: $ORIGIN" \
  -d '{
    "basics": { "events": ["Mehendi","Sangeet","Wedding"], "date": "2027-02-14", "city": "Jaipur", "guestCount": 300, "budget": "40 lakh" },
    "selectedIds": ["venue_layout","venue_vedi","cat_standard_menu","decor_stage","decor_entrance","ent_dj_sound","ent_celebrity","photo_wedding_day","mu_bridal_hd","meh_bridal","perm_police_noc"]
  }'

# Lead
curl -s -X POST $BASE/api/dulhaniyaa/lead \
  -H "Content-Type: application/json" -H "Origin: $ORIGIN" \
  -d '{
    "name": "Asha Sharma", "phone": "+91 98765 43210", "email": "asha@example.com",
    "basics": { "events": ["Wedding"], "city": "Jaipur", "guestCount": 300, "budget": 4000000 },
    "selectedIds": ["decor_stage","cat_standard_menu"]
  }'

# Chat (send the whole conversation each time; last message must be from the user)
curl -s -X POST $BASE/api/dulhaniyaa/chat \
  -H "Content-Type: application/json" -H "Origin: $ORIGIN" \
  -d '{ "messages": [ { "role": "user", "content": "What should we plan for a Sangeet night?" } ] }'

# Should fail
curl -si $BASE/api/dulhaniyaa/services -H "Origin: https://superfarmfresh.com" | head -1   # 403
curl -si $BASE/api/nope/plan | head -1                                                   # 404
curl -si $BASE/api/dulhaniyaa/plan | head -1                                             # 405
curl -si -X POST $BASE/api/dulhaniyaa/plan -H "Content-Type: application/json" -d '{}' | head -1  # 400
curl -si -X OPTIONS $BASE/api/dulhaniyaa/plan -H "Origin: $ORIGIN" | head -1             # 204
```

## Logs

Every request and every third-party call (Groq, Web3Forms, Upstash) is logged by `lib/log.js`. Each line carries a request id (also returned as the `X-Request-Id` header), so you can follow one website call through all of its third-party calls.

| Service | What is logged |
|---|---|
| `http incoming` | method, path, origin, client IP, user agent, and the request body |
| `http outgoing` | method, status, duration, origin, the error for 4xx/5xx, and the response body |
| `groq` | model, attempt, the prompt, the raw AI reply, token usage, finish reason, duration, retries and errors |
| `web3forms` | subject, name, phone, email, the message, Web3Forms' status and reply, duration |
| `upstash` | errors always; each call at `LOG_LEVEL=debug` |

Locally the logs print as readable blocks in the `npm run local` terminal. On Vercel each log is one JSON line, which you can search under **Project → Logs**.

API keys are never logged. Fields named like `*_key`/`secret`/`password` and values that look like `gsk_…` or `Bearer …` are redacted automatically. Request/response bodies, prompts, AI replies and emails **do** contain customer names and phone numbers. Set `LOG_PAYLOADS=false` in production if you don't want that in your logs.

## Deploy

1. Push this folder to a GitHub repo. `.env.local` is gitignored, so keys never get committed.
2. In Vercel, go to **Add New → Project** and import the repo. No framework preset or build command is needed.
3. Under **Settings → Environment Variables**, add `GROQ_API_KEY` and `WEB3FORMS_KEY_DULHANIYAA`. Optionally add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, which you get from a free Upstash Redis database.
4. Deploy, then point the website at `https://<project>.vercel.app/api/dulhaniyaa/...`. You can also attach a custom domain such as `api.dulahiya.com`.

> **Web3Forms note:** Web3Forms' free plan may block server-side submissions. If it does, `lead` returns 502 and the logs show the reason. To fix it, either upgrade Web3Forms or swap `lib/mail.js` for Nodemailer + Gmail SMTP (use an App Password). Keep the same `sendMail({ siteKey, subject, name, phone, email, message })` signature and nothing else needs to change.

> **Caching note:** `services` is cached at the edge with `Vary: Origin`. If a browser ever sees a CORS error on `services` after switching between localhost and production, remove `s-maxage` from `sites/dulhaniyaa/actions/services.js`.

## Editing the Dulhaniyaa rate card

Edit `sites/dulhaniyaa/services.js`. Each row is `[id, name, level, pricing_type, min, max]`. Quantities work like this:

- `per_guest` is multiplied by the guest count
- `per_event` is multiplied by the number of events
- `per_day` and `flat` count once
- `on_request` has `null` prices and is quoted by the planner

Keep ids stable because websites store them.

## How to add a new site

1. **Registry:** add an entry to `lib/sites.js` with `name`, `domain`, `origins` (production, www and local dev URLs), `mailKeyEnv`, `actions`, `limits` and `load: () => import("../sites/<site>/index.js")`. `load` must be a literal path so Vercel bundles the site's files.
2. **Folder:** create `sites/<site>/actions/<action>.js` files. Each one exports `method` (`"GET"` or `"POST"`) and `async handler({ body, query, site, siteKey })`, which returns `{ body, status?, headers? }` or throws `HttpError`. Also add `sites/<site>/index.js` exporting `{ <action>: module, ... }`. Reuse `lib/groq.js` and `lib/mail.js` (`sendMail({ siteKey, ... })`).
3. **Env vars:** create a Web3Forms key for that site's inbox and add it in Vercel under the `mailKeyEnv` name, for example `WEB3FORMS_KEY_SUPERFARM`. Add it to `.env.example` too.
4. **CORS:** list every origin the site's frontend runs on in `origins`. Nothing else needs changing, because the router, CORS and rate limits pick the new site up automatically.
