# Bubble Burst — manual

One static page that answers "will the AI bubble burst?" several times a day: a pressure score from 0 to 100, how that number is made, four signals, a basket of scored indicators, an unscored fundamentals check, the score's history, a short analysis and the sources behind every claim. Built with Astro, deployed as plain HTML to Cloudflare Pages. All copy lives in one JSON file; the history chart is built from the archived copies of it.

## Requirements

- Node 22.12 or newer (the project is verified on Node 26)
- npm

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 with live reload |
| `npm run validate` | Check `content/status.json` against the schema and print a summary. Exit code 1 on any problem |
| `npm test` | Run the unit tests (schema rules, bands, citation rendering, date formatting). Also asserts the shipped content is valid |
| `npm run check` | Astro and TypeScript type check |
| `npm run build` | Build the static site into `dist/`. Fails if the content is invalid |
| `npm run preview` | Serve `dist/` locally |
| `npm run deploy` | Build and upload `dist/` with Wrangler via `npx wrangler@4` (run `npx wrangler@4 login` once, and create a Pages project named `bubble-burst`) |

## Environment variables

Set these in `.env` locally (copy `.env.example`) and in the Cloudflare Pages project settings for production builds.

| Variable | Purpose |
| --- | --- |
| `PUBLIC_GA_MEASUREMENT_ID` | GA4 measurement ID, e.g. `G-ABC123XYZ`. When empty, no Google script is emitted at all |
| `PUBLIC_POSTHOG_KEY` | PostHog project API key, e.g. `phc_abc123`. When empty, no PostHog script is emitted at all |
| `PUBLIC_POSTHOG_HOST` | PostHog ingestion host. Defaults to PostHog Cloud EU, `https://eu.i.posthog.com`; set `https://us.i.posthog.com` for a project on PostHog Cloud US. A key sent to the wrong region is rejected and no data arrives |
| `PUBLIC_SITE_URL` | Canonical origin without a trailing slash, e.g. `https://bubbleburst.example`. Used for the canonical link, Open Graph URL and JSON-LD. When empty those tags are omitted |

With both `PUBLIC_GA_MEASUREMENT_ID` and `PUBLIC_POSTHOG_KEY` empty, the build has no analytics script, no consent bar and no "Cookie settings" link.

## Updating the copy

Edit `content/status.json`. Nothing else needs to change. The page can be updated any number of times a day; each update replaces the file and the previous one goes to `content/history/`. Then:

```bash
npm run validate && npm run build
```

Field by field:

| Field | Rules |
| --- | --- |
| `updatedAt` | ISO 8601 timestamp with a timezone, e.g. `2026-10-13T08:45:00Z`: the moment this status reflects. Shown on the page in the visitor's local time. Must not be in the future |
| `pressure` | Integer 0–100. Drives the gauge, the band label and the page title |
| `previousPressure` | Optional integer 0–100. When present the gauge shows the change since the previous reading |
| `headline` | ≤ 70 characters. The one-line answer to "will it burst?" |
| `summary` | ≤ 260 characters. Two or three sentences under the headline. May contain `[n]` citations, which are validated like the others |
| `signals` | 3–4 items. Each has `label` (≤ 36), `value` (≤ 18), `note` (≤ 72), optional `trend` (`up`, `down`, `flat`), optional `eli5` (≤ 200, see below) and `sources` (list of source numbers, at least one) |
| `analysis` | 2–3 paragraphs, each ≤ 520 characters. **Every paragraph must contain at least one `[n]` citation** |
| `sources` | 3–30 items with `title`, `publisher`, `url` (https only, unique) and `date`. **Every source must be cited at least once** — by a paragraph, a signal, a fundamentals tile, the summary or an indicator |
| `generatedBy` | Model or author identifier shown in the footer |
| `indicators` | Optional, 1–20 items: the scored basket (see below). When present, `composite` is required and the page shows the basket table and the "how the number is made" strip |
| `composite` | How the basket was combined: `method` (`"weighted-mean"`), `indicatorScore`, optional `fragilityScore`, `triggerScore`, `confirmationScore`, `newsAdjustment` (integer −5…5), optional `reason` (≤ 160), `indicatorCount` (must equal the number of indicators listed), `missingCount` |
| `fundamentals` | Optional, 1–3 tiles shaped like `signals`: the readings the score ignores on purpose. Shown as an outlined "Fundamentals check" strip |

Each indicator has `id` (camelCase, unique), `label` (≤ 56), `group` (`fragility`, `trigger` or `confirmation`), `value` (a number), `unit` (≤ 28), `asOf` (the date the figure refers to), `score` (0–100, one decimal), optional `previousScore`, `weight` (0.5–2), optional `direction` (`higher` or `lower` = more bubble), optional `trend`, optional `stale` (carried forward because both fetches failed), optional `verified` (false for a feed never fetched successfully in testing), `detail` (≤ 64, what the figure measures and where it comes from), optional `eli5` (≤ 200) and `sources`. The reference levels, fetch URLs and weights are not in the JSON; they live in `ROUTINE.md`.

`eli5` is the plain-language "what is this?" for a signal, a fundamentals tile or an indicator: one or two sentences for someone who has never heard of the figure. When present, the tile's label or the indicator's name gets a dotted underline and shows the text on hover, keyboard focus or tap. The fixed wording for each basket indicator is in `ROUTINE.md`; the "how the number is made" strip has its own, kept in `src/components/Composite.astro`.

The build checks the arithmetic: `indicatorScore` must be within one point of the weighted mean of the listed scores, each sub-score within one point of its group's weighted mean, and `indicatorCount` must equal the number of indicators. A score of 100 means the reading is at or beyond the level reached before a past burst; the page labels those rows rather than treating them as a move.

Citations are written inline as `[3]` and refer to the 3rd entry in `sources` (1-based). The build turns them into superscript links. A citation that points past the end of the list, a paragraph without a citation, or a source nobody cites all fail validation. Unknown keys fail too, so a typo can never ship silently.

Plain straight quotes and `...` are fine in the JSON; the build converts them to typographic punctuation.

The limits live in `src/lib/limits.ts` and the bands in `src/lib/bands.ts`.

## History

Every archived reading is also its own page at `/archive/<timestamp>/`, rendered with the same components as the live page and a banner linking back; the rows of the "All readings as a table" list link to them.

Every run copies the previous `content/status.json` to `content/history/<updatedAt with the colons removed>.json` before writing the new one. The build reads every file in that folder plus the live file, keeps `updatedAt`, `pressure`, `composite.indicatorScore` and each indicator's `score`, de-duplicates by timestamp, and draws the "Pressure over time" chart and the per-indicator sparklines from them. A file that cannot be parsed is skipped with a warning in the build log, never a failed build, so old archives that predate a field still work.

## Pressure bands

| Pressure | Label | Meaning shown on the page |
| --- | --- | --- |
| 0–24 | Calm | Prices roughly track earnings. Nothing to pop. |
| 25–49 | Inflating | Spending and valuations are running ahead of revenue. |
| 50–74 | Stretched | Most classic bubble signals are flashing. Timing is the open question. |
| 75–99 | Critical | Cracks are visible. One trigger could do it. |
| 100 | Burst | It popped. |

## Deploying to Cloudflare Pages

Option A, Git integration (recommended for the daily routine): push the repo to GitHub, create a Pages project from it, and set

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `NODE_VERSION=22`, plus the `PUBLIC_*` variables above

Every push to the production branch then rebuilds and publishes the page.

Option B, direct upload: `npm run deploy` after `npx wrangler@4 login`. This uploads `dist/` to the `bubble-burst` Pages project.

The site is fully static, so it also works on any host that serves files.

## How the page behaves

- **Theme.** The switch in the header cycles Auto → Light → Dark. Auto follows the operating system. A manual choice is stored in `localStorage` under `bb:theme` and applied before first paint, so there is no flash.
- **Analytics.** GA4 and PostHog are independent; each is emitted only when its variable is set. Both load on every visit with no consent bar, because the audience is US-only (`consentMode: 'none'` in `src/config.ts`). Before serving EU visitors switch it to `advanced` or `basic`; both bring back the consent bar and the "Cookie settings" footer link, and declining deletes the `_ga` cookies and opts PostHog out, which clears its stored visitor ID (only its opt-out record stays in `localStorage`).
  - `advanced`: GA4 runs Consent Mode v2 and sends cookieless pings until the visitor allows cookies. PostHog loads but captures and stores nothing until the visitor chooses; a decline is then counted cookielessly, which only works with "Cookieless server hash mode" switched on in the PostHog project (Settings → Web analytics). Without it declined visits are dropped.
  - `basic`: nothing loads from Google or PostHog until allowed.
  - PostHog runs with the library defaults pinned by `POSTHOG_DEFAULTS_DATE` in `src/config.ts` (pageviews, pageleaves, autocapture of clicks). Session replay, heatmaps and surveys are switched on or off in the PostHog project, not in this repo.
- **Fonts.** Newsreader (display), IBM Plex Sans (body and figures) and IBM Plex Mono (labels), self-hosted from the `@fontsource` packages so no request goes to Google Fonts. To change them, swap the imports at the top of `src/pages/index.astro` and the `--font-*` tokens in `src/styles/tokens.css`.
- **Times.** The HTML carries every timestamp in UTC; a few lines of script convert them to the visitor's local time zone, so the page is correct without JavaScript and friendlier with it.
- **Meter.** Plain HTML and CSS. A track split into the four bands fills up to the score and the number counts up on load; both are skipped when the visitor prefers reduced motion. Without JavaScript the final value renders statically.

## Repository layout

```
content/status.json      the daily copy and sources (the only file the routine edits)
content/history/         archive of previous readings, one file per update, named by timestamp
src/pages/index.astro    the page: head tags, layout, build-time validation
src/components/          Header, Meter, Composite, Signals, Indicators, Explain (hover explanations), History, Analysis, Sources, Footer, ThemeToggle, Analytics (GA4), Posthog, ConsentBar
src/lib/                 schema, bands, citation rendering, formatting, and their tests
src/styles/              tokens.css (colours, type, spacing) and global.css
src/config.ts            site name, description, builder credit, consent flag, PostHog defaults date, env lookups
scripts/validate.ts      the validator behind `npm run validate`
ROUTINE.md               the prompt for the daily Claude routine
```
