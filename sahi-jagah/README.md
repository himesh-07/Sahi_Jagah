# Sahi Jagah

Describe a problem in your own language. Sahi Jagah works out which office actually has
jurisdiction, warns you when the portal you were about to use is the wrong forum entirely,
drafts the complaint in the format a receiving officer expects, and keeps the appeal clock
so the complaint doesn't quietly die.

Built for **Build What Moves India**. Not a government product.

## Deploy (about 3 minutes)

No build step. Static page plus one serverless function.

```bash
cd sahi-jagah
npx vercel            # accept defaults, framework: Other
npx vercel env add OPENAI_API_KEY      # paste key, select Production
npx vercel --prod
```

Optional: `npx vercel env add OPENAI_MODEL` to override the default (`gpt-4o-mini`).

The site works without a key — the routing endpoint returns a stored example result and
says so on screen — so a reviewer never hits a dead end.

## Test locally

```bash
npx vercel dev
```

## Files

| Path | What it does |
|---|---|
| `index.html` | Whole app. Vanilla JS, no framework, ~20KB, loads on 3G. |
| `api/route.js` | Department taxonomy, routing prompt, complaint drafting. |

## Where to tune

- **Taxonomy** — `CENTRAL`, `STATE_SUBJECTS`, `SPECIAL_VENUES` in `api/route.js`. Add
  categories here; the prompt picks them up automatically.
- **SLA and appeal windows** — `SLA` and `APPEAL` constants near the bottom of `index.html`.

## Before you record the demo

1. Open on a real phone, throttled to Slow 3G.
2. Run one central case (PF claim pending), one state-subject case (no water in your ward
   for a week), and one special-venue case (bank reversed nothing after 40 days). The
   second and third are what make the point.
3. On the tracking page press **+30 days** to show the appeal appearing.
4. Open **What's real, what's mocked** on camera. The honesty criterion is scored.
