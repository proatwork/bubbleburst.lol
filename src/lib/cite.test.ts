import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, extractCitations, renderCitationLinks, renderText, renderWithCitations, smarten } from './cite.ts';

test('escapeHtml neutralises markup', () => {
  assert.equal(escapeHtml('<b>"a" & \'b\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
});

test('extractCitations finds every [n] marker in order', () => {
  assert.deepEqual(extractCitations('Fell 3% [1] then rose [12][3].'), [1, 12, 3]);
  assert.deepEqual(extractCitations('no markers'), []);
});

test('renderWithCitations links valid markers and leaves invalid ones as text', () => {
  const html = renderWithCitations('A [1] B [9]', 2);
  assert.equal(html, 'A <sup class="cite"><a href="#source-1" aria-label="Source 1">1</a></sup> B [9]');
});

test('renderWithCitations escapes content before linking', () => {
  const html = renderWithCitations('<script>x</script> [1]', 1);
  assert.ok(html.startsWith('&lt;script&gt;x&lt;/script&gt;'));
  assert.ok(html.includes('href="#source-1"'));
});

test('smarten produces typographic punctuation', () => {
  assert.equal(smarten('He said "hi" -- it\'s fine...'), 'He said “hi” — it’s fine…');
  assert.equal(smarten('"Quoted" start'), '“Quoted” start');
});

test('renderCitationLinks drops out-of-range indices', () => {
  assert.equal(renderCitationLinks([2, 5], 3), '<sup class="cite"><a href="#source-2" aria-label="Source 2">2</a></sup>');
});

test('renderText escapes markup and smartens punctuation', () => {
  assert.equal(renderText('R&D <b>bold</b> is "fine"'), 'R&amp;D &lt;b&gt;bold&lt;/b&gt; is \u201Cfine\u201D');
});
