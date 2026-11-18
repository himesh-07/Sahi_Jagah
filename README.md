# Sahi Jagah

**Complaints that reach the right desk — and don't die there.**

Live demo link : https://sahi-jagah-t8k9.vercel.app

Built for **Build What Moves India** (August 2026). An independent prototype. Not a
government product, not affiliated with or approved by any ministry or department.

---

## The problem

A citizen with a grievance faces a portal that asks them to pick a Ministry, a Department,
and a Category from long dropdowns before they can type a single word about what actually
happened. Most people have no idea which of the ~90 central ministries owns their problem.
So they guess.

Three things then go wrong, and none of them are visible on screen:

1. **The complaint is filed against the wrong office.** Weeks later it is transferred, or
   closed with a line meaning *this does not concern us*. The clock restarts, or it doesn't
   restart at all.
2. **The complaint was never a central matter to begin with.** Water supply, local roads,
   ration cards, caste and income certificates, land mutation, electricity billing, police
   — these are state responsibilities. A central grievance portal cannot act on them, but it
   will happily accept them.
3. **The deadline passes and nothing happens.** There is a right to appeal. Almost nobody
   uses it, because nobody is told it exists or when the window opens.

The interface is not the hard part. Jurisdiction is.

---

## What Sahi Jagah does

Four screens, one journey.

**1 · Describe.** One text box. Type or speak, in Hindi, English, Chhattisgarhi, Tamil,
whatever is easiest. No categories, no ministry dropdown. Three optional context fields:
state, when it started, any reference number already in hand.

**2 · Route.** An OpenAI model reads the description against a curated jurisdiction
taxonomy and returns the office that actually owns it — with a confidence score, a one-line
plain-language reason, and two alternates the citizen can switch to in a tap. If the
substance is a state subject or belongs to a statutory ombudsman instead, a warning appears
*before* anything is drafted, naming the correct venue.

**3 · Draft.** The complaint is written twice, side by side: in the citizen's own language,
and in the formal English structure a receiving officer expects — addressee, subject,
dated chronology, specific relief sought. Both are editable. Nothing is invented; the model
is instructed never to add facts, names, amounts or dates the citizen didn't give.

**4 · Track.** A mock acknowledgement, a file-movement register, and a live clock against
the 21-day norm. When the deadline passes, the first appeal to the Appellate Authority is
already drafted and waiting. A demo control fast-forwards the clock so a reviewer can see
this in ten seconds instead of three weeks.

---

## What makes it different

Most redesigns of a government portal make the same form prettier. This one attacks the
failure that happens *after* the form looks fine.

- **Routing is the product, not the polish.** Jurisdiction is inferred from a free-text
  description instead of being outsourced to the citizen as a dropdown they cannot answer.
- **It tells you when not to use it.** The state-subject and ombudsman detection sends
  people *away* from the portal when the portal is the wrong forum. A product that
  redirects users away from itself is unusual, and it is the single highest-value thing
  here — a wrongly-filed complaint is worse than no complaint, because it costs the citizen
  weeks of waiting for a rejection.
- **The routing shows its reasoning.** Confidence, a plain-sentence justification, and
  switchable alternates. The citizen can overrule the model. Trust is built by being
  legible, not by being confident.
- **The appeal is pre-written.** The right to escalate is worthless if it arrives as a
  legal term nobody recognises on a date nobody tracked.
- **Built for the actual device.** ~26KB page, no framework, no build step, one webfont,
  server-rendered static HTML. Usable on a mid-range Android phone on a 3G connection.

---

## Folder structure

```
sahi-jagah/
├── index.html              Entire frontend. Vanilla JS, no framework, ~26KB.
│                           All four screens, speech input, escalation clock,
│                           and the mock-disclosure page.
├── api/
│   └── route.js            Serverless function. Holds the jurisdiction taxonomy,
│                           the routing + drafting prompt, and a stored fallback
│                           result used when no API key is available.
├── package.json            Node 18+, ESM. No dependencies.
├── .env.local.example      Template for the local API key file.
├── .gitignore
├── README.md
└── docs/
    └── screenshots/        Screenshots referenced below.
```

Two files carry the whole product. That is deliberate — it keeps the page small enough to
load on a slow connection and simple enough to audit in one sitting.

---



## What's real and what's mocked

**Real:** jurisdiction routing, confidence and reasoning (live model call against the
taxonomy); state-subject detection; ombudsman-venue detection; bilingual complaint
drafting; speech input where the browser supports it; escalation logic and the drafted
appeal.

**Mocked:** nothing is filed anywhere. There is no connection to CPGRAMS, any ministry, or
any state portal — no request leaves the site except the model call. Registration numbers
are generated locally and prefixed `MOCK`. Officer designations, statuses and file-movement
entries are synthetic. The taxonomy is a curated subset of high-volume categories, not the
full government directory. The 21-day and 30-day windows follow published norms but real
timelines vary by department. Routing accuracy has not been measured against a labelled
grievance dataset — it has been tested by hand only. If the model key is unavailable the
app returns a stored example result and says so on screen.

The same disclosure is a linked page inside the app, not buried in a repo.

---

## How this would work at scale

A layer **in front of** the existing portal, not a replacement.

Every grievance a department transfers away is already a labelled example of a misroute.
That transfer history is a training and evaluation set the government already owns, at
volume, at no collection cost. The classifier improves on its own errors.

Rollout is read-only first: suggest the category, let the citizen confirm or overrule,
measure transfer rates against a control group, and automate nothing until the numbers
justify it. Confidence below a threshold falls back to human-assisted categorisation rather
than guessing. The citizen's override is always logged as ground truth.

The unit economics are simple. Each prevented misroute saves a manual transfer at the
receiving end and weeks at the citizen's end.

---

## Run it

No build step. Static page plus one serverless function.

```bash
cd sahi-jagah
npx vercel                          # framework: Other
npx vercel env add OPENAI_API_KEY   # select Production
npx vercel --prod
```

Locally: create `.env.local` with `OPENAI_API_KEY=sk-...`, then `npx vercel dev`.

Opening `index.html` directly with a double-click will render the page but the routing call
will fail — there is no server to answer `/api/route`.

Optional: set `OPENAI_MODEL` to override the default.

### Where to change things

- **Taxonomy** — `CENTRAL`, `STATE_SUBJECTS` and `SPECIAL_VENUES` arrays in `api/route.js`.
  The prompt picks up additions automatically.
- **Timelines** — `SLA` and `APPEAL` constants near the bottom of `index.html`.

---

## Try these three cases

They are the fastest way to see what the build is for.

1. `Mera PF claim do mahine se pending hai, portal pe status change nahi ho raha`
   → routes to EPFO. The ordinary case.
2. `Hamare ward mein ek hafte se paani nahi aa raha`
   → flagged as a state subject. This is the complaint that would have been filed centrally
   and closed without action.
3. `Bank ne 40 din pehle galat charge kata, abhi tak reverse nahi kiya`
   → redirected to the RBI Ombudsman, which is the venue with actual teeth.

---

## Constraints and honest limitations

- Speech recognition depends on the browser; there is no fallback ASR.
- The taxonomy is hand-curated and incomplete outside high-volume categories.
- Language coverage in drafting is whatever the model handles; low-resource languages will
  be weaker and this has not been systematically evaluated.
- No accessibility audit has been run beyond keyboard focus, contrast and reduced-motion
  handling.
- Routing quality is unmeasured. Claiming otherwise without a labelled dataset would be
  dishonest.
