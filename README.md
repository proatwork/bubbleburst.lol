# Bubble Burst — manual

One static page that answers "will the AI bubble burst?" every day: a pressure score from 0 to 100, four signals, a short analysis and the sources behind every claim. Built with Astro, deployed as plain HTML to Cloudflare Pages. All copy lives in one JSON file.

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
| `PUBLIC_GA_MEASUREMENT_ID` | GA4 measurement ID, e.g. `G-ABC123XYZ`. When empty, no Google script, no consent bar and no "Cookie settings" link are emitted at all |
| `PUBLIC_SITE_URL` | Canonical origin without a trailing slash, e.g. `https://bubbleburst.example`. Used for the canonical link, Open Graph URL and JSON-LD. When empty those tags are omitted |

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
| `signals` | 3–4 items. Each has `label` (≤ 36), `value` (≤ 18), `note` (≤ 72), optional `trend` (`up`, `down`, `flat`) and `sources` (list of source numbers, at least one) |
| `analysis` | 2–3 paragraphs, each ≤ 520 characters. **Every paragraph must contain at least one `[n]` citation** |
| `sources` | 3–10 items with `title`, `publisher`, `url` (https only, unique) and `date`. **Every source must be cited at least once** |
| `generatedBy` | Model or author identifier shown in the footer |

Citations are written inline as `[3]` and refer to the 3rd entry in `sources` (1-based). The build turns them into superscript links. A citation that points past the end of the list, a paragraph without a citation, or a source nobody cites all fail validation. Unknown keys fail too, so a typo can never ship silently.

Plain straight quotes and `...` are fine in the JSON; the build converts them to typographic punctuation.

The limits live in `src/lib/limits.ts` and the bands in `src/lib/bands.ts`.

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
- Environment variables: `NODE_VERSION=22`, plus the two `PUBLIC_*` variables above

Every push to the production branch then rebuilds and publishes the page.

Option B, direct upload: `npm run deploy` after `npx wrangler@4 login`. This uploads `dist/` to the `bubble-burst` Pages project.

The site is fully static, so it also works on any host that serves files.

## How the page behaves

- **Theme.** The switch in the header cycles Auto → Light → Dark. Auto follows the operating system. A manual choice is stored in `localStorage` under `bb:theme` and applied before first paint, so there is no flash.
- **Analytics.** GA4 runs with Consent Mode v2 and every storage type defaulted to denied. `consentMode` in `src/config.ts` picks the strictness: `advanced` (default) loads gtag.js on every visit, so until a visitor clicks "Allow analytics" Google only receives cookieless pings and can model the missing traffic; `basic` loads nothing from Google until the visitor allows it, which is the strictest reading of EU guidance but gives you no data on visitors who decline or ignore the bar. The choice is stored under `bb:consent`; declining after an earlier allow also deletes the `_ga` cookies. "Cookie settings" in the footer reopens the bar. Set `consentBanner: false` to drop the bar if you move consent to a dedicated consent management platform. The bar names no data controller and links no privacy notice because the site has none yet; add both before launch.
- **Fonts.** Newsreader (display), IBM Plex Sans (body and figures) and IBM Plex Mono (labels), self-hosted from the `@fontsource` packages so no request goes to Google Fonts. To change them, swap the imports at the top of `src/pages/index.astro` and the `--font-*` tokens in `src/styles/tokens.css`.
- **Times.** The HTML carries every timestamp in UTC; a few lines of script convert them to the visitor's local time zone, so the page is correct without JavaScript and friendlier with it.
- **Meter.** Plain HTML and CSS. A track split into the four bands fills up to the score and the number counts up on load; both are skipped when the visitor prefers reduced motion. Without JavaScript the final value renders statically.

## Repository layout

```
content/status.json      the daily copy and sources (the only file the routine edits)
content/history/         archive of previous readings, one file per update, named by timestamp
src/pages/index.astro    the page: head tags, layout, build-time validation
src/components/          Header, Meter, Signals, Analysis, Sources, Footer, ThemeToggle, Analytics, ConsentBar
src/lib/                 schema, bands, citation rendering, formatting, and their tests
src/styles/              tokens.css (colours, type, spacing) and global.css
src/config.ts            site name, description, consent flag, env lookups
scripts/validate.ts      the validator behind `npm run validate`
ROUTINE.md               the prompt for the daily Claude routine
```
