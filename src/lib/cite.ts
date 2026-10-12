/** Citation markers look like [3]; they are 1-based indices into the sources list. */
const CITATION_PATTERN = /\[(\d+)\]/g;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

/** Returns every citation index in the text, in order, duplicates included. */
export function extractCitations(text: string): number[] {
  return Array.from(text.matchAll(CITATION_PATTERN), (m) => Number(m[1]));
}

/** Curly quotes, real apostrophes, em dashes and ellipses. Runs on plain text, before escaping. */
export function smarten(text: string): string {
  return text
    .replace(/\.\.\./g, '…')
    .replace(/(\s)--(\s)/g, '$1—$2')
    .replace(/(^|[\s(\[—])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s(\[—])'/g, '$1‘')
    .replace(/'/g, '’');
}

/** Plain text → safe HTML with typographic punctuation. Use for any text injected via set:html. */
export function renderText(text: string): string {
  return escapeHtml(smarten(text));
}

export function sourceAnchorId(index: number): string {
  return `source-${index}`;
}

/**
 * Escapes the text, smartens punctuation and turns [n] markers into superscript links
 * to the matching source. Markers that point outside the source list are left as plain
 * text, so a bad marker can never produce a broken link (the schema rejects them anyway).
 */
export function renderWithCitations(text: string, sourceCount: number): string {
  const escaped = renderText(text);
  return escaped.replace(CITATION_PATTERN, (match, digits: string) => {
    const index = Number(digits);
    if (index < 1 || index > sourceCount) return match;
    const id = sourceAnchorId(index);
    return `<sup class="cite"><a href="#${id}" aria-label="Source ${index}">${index}</a></sup>`;
  });
}

/** Renders a list of source indices as superscript links, e.g. for a signal's sources. */
export function renderCitationLinks(indices: number[], sourceCount: number): string {
  return indices
    .filter((index) => index >= 1 && index <= sourceCount)
    .map((index) => `<sup class="cite"><a href="#${sourceAnchorId(index)}" aria-label="Source ${index}">${index}</a></sup>`)
    .join('');
}
