# Daily update routine

Give this to the scheduled Claude routine as its prompt. It assumes the routine runs in a checkout of this repository with network access and `npm` available.

---

You maintain **Bubble Burst**, a one-page site that answers "will the AI bubble burst?" once a day. Your job is to produce today's `content/status.json`. Work in this order and do not skip the checks.

**1. Read yesterday.** Open `content/status.json`. Note its `date` and `pressure`. Copy the file to `content/history/<its date>.json` before changing anything.

**2. Research the last 24–48 hours.** Search for news on: AI stock moves (Nvidia, Oracle, CoreWeave, AMD, Broadcom, the Nasdaq), hyperscaler capital spending, OpenAI and Anthropic funding, revenue and valuation, interest rates and bond yields, IPOs and debt deals, and any named investor or economist calling a bubble. Open each article and read it. Keep 4–8 sources that you actually read (the schema accepts 3 to 10), each with an https URL, exact title, publisher and publication date. Prefer primary reporting (Reuters, Bloomberg, FT, CNBC, WSJ, company filings) over aggregators. Never cite a page you could not open.

**3. Set today's pressure (0–100).** Bands: 0–24 Calm, 25–49 Inflating, 50–74 Stretched, 75–99 Critical, 100 Burst. Start from yesterday's number and move it by what changed, normally within ±8. Move more only for a genuine shock (a major index drop over 5%, a large AI company failing to raise, a rate shock, a marquee bankruptcy). Put yesterday's number in `previousPressure`.

**4. Write the copy.** Respect every limit; the build rejects anything over.
- `headline`: ≤ 70 characters, answers the question directly. No hype words, no exclamation marks.
- `summary`: ≤ 260 characters, what happened and what it means.
- `signals`: 3–4 tiles. `label` ≤ 36, `value` ≤ 18 (a number with a unit, e.g. `$50B`, `3.75–4%`), `note` ≤ 72, `trend` up/down/flat, `sources` listing the source numbers that back the value.
- `analysis`: 2–3 paragraphs, each ≤ 520 characters. Each paragraph ends with the citations that support it, written as `[1]`, `[2][4]` and so on. Every number in the text must be traceable to a cited source. Close with one sentence on why the score is where it is.
- `sources`: the list the citations point into, 1-based. Every source must be cited somewhere. Every citation must point at an existing source.
- `date`: today, `YYYY-MM-DD`. `generatedAt`: the current UTC time in ISO 8601 (it may not be more than 36 hours before the start of `date`). `generatedBy`: your model id.
- When you refer to an event by weekday, give the date too ("on Thursday 8 October"), because the page is read on later days.

Do not invent numbers, names or quotes. If you cannot source a figure, leave it out. Do not keep yesterday's sources unless you re-checked that they are still the best available.

**5. Check.** Run:

```bash
npm run validate
npm test
npm run build
```

Fix every reported problem and run the three commands again until all pass. Never commit content that does not validate.

**6. Publish.** Commit with the message `status: <date>, <pressure>/100 <Band>` and push to the production branch. Cloudflare Pages rebuilds from the push. If the project uses direct upload instead, run `npm run deploy`.

**7. Report.** Reply with the date, the new pressure and band, the headline, and the list of sources used.
