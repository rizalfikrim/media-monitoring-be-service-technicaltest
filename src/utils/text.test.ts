import { describe, expect, it } from 'vitest';
import { normalizeSource, normalizeText, stripHtml } from './text.js';

describe('normalizeText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('collapses repeated whitespace', () => {
    expect(normalizeText('a   b\n\n\tc')).toBe('a b c');
  });

  it('returns null for empty or non-string values', () => {
    expect(normalizeText('   ')).toBeNull();
    expect(normalizeText('')).toBeNull();
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText(undefined)).toBeNull();
    expect(normalizeText(123)).toBeNull();
  });
});

describe('normalizeSource', () => {
  it('trims, collapses whitespace and lowercases', () => {
    expect(normalizeSource('  BBC News  ')).toBe('bbc news');
    expect(normalizeSource('TWITTER')).toBe('twitter');
    expect(normalizeSource('malaysiakini ')).toBe('malaysiakini');
    expect(normalizeSource('The Star')).toBe('the star');
  });

  it('returns null for missing source', () => {
    expect(normalizeSource(null)).toBeNull();
    expect(normalizeSource('')).toBeNull();
    expect(normalizeSource(undefined)).toBeNull();
  });
});

describe('stripHtml', () => {
  it('strips tags and decodes entities', () => {
    expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    expect(stripHtml('<p>a&nbsp;&nbsp;b</p>')).toBe('a b');
    expect(stripHtml('<p>He said &quot;hi&quot;</p>')).toBe('He said "hi"');
  });

  it('removes script blocks entirely', () => {
    expect(stripHtml('<p>ok</p><script>alert(1)</script>')).toBe('ok');
  });

  it('removes wrapper divs and inner spans', () => {
    expect(stripHtml('<div class="article">Works <span>on</span> MRT3.</div>')).toBe('Works on MRT3.');
  });

  it('keeps emoji and unicode', () => {
    expect(stripHtml('Langkawi in July hits different ☀️🇲🇾')).toBe('Langkawi in July hits different ☀️🇲🇾');
  });

  it('returns empty string for pure markup', () => {
    expect(stripHtml('<p>   </p>')).toBe('');
  });
});