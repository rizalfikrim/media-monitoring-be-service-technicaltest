import { describe, expect, it } from 'vitest';
import { normalizeRawMention } from './mention.service.js';

describe('normalizeRawMention', () => {
  it('normalizes a full valid record', () => {
    const result = normalizeRawMention({
      external_id: 'str-99120',
      source: '  The Star  ',
      title: '  Ringgit   strengthens against US dollar  ',
      content: '<p>Ringgit opens &nbsp;higher.</p>',
      url: ' https://x.com ',
      author: ' Aisyah ',
      published_at: '2026-08-10T08:15:00Z',
      engagement: '1,204',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.mention.external_id).toBe('str-99120');
    expect(result.mention.source).toBe('the star');
    expect(result.mention.title).toBe('Ringgit strengthens against US dollar');
    expect(result.mention.content).toBe('Ringgit opens higher.');
    expect(result.mention.url).toBe('https://x.com');
    expect(result.mention.author).toBe('Aisyah');
    expect(result.mention.engagement).toBe(1204);
    expect(result.mention.published_at?.toISOString()).toBe('2026-08-10T08:15:00.000Z');
    expect(result.mention.dedupe_key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates the same dedupe key for logically identical records', () => {
    const a = normalizeRawMention({
      source: 'The Star',
      title: 'Ringgit Strengthens',
      content: '<p>Hello World</p>',
      published_at: '2026-08-10T08:15:00Z',
      engagement: 412,
    });
    const b = normalizeRawMention({
      source: 'the star',
      title: 'ringgit strengthens',
      content: 'Hello  World',
      published_at: '2026-08-10 08:15:00',
      engagement: 415,
    });

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.mention.dedupe_key).toBe(b.mention.dedupe_key);
  });

  it('generates different dedupe keys for different content', () => {
    const a = normalizeRawMention({ source: 'x', title: 'T', content: 'one', published_at: '2026-08-10T08:15:00Z' });
    const b = normalizeRawMention({ source: 'x', title: 'T', content: 'two', published_at: '2026-08-10T08:15:00Z' });

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.mention.dedupe_key).not.toBe(b.mention.dedupe_key);
  });

  it('rejects a record without source', () => {
    const result = normalizeRawMention({ title: 'T', content: 'c' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('source is required');
  });

  it('rejects a record without title and content', () => {
    const result = normalizeRawMention({ source: 'x', title: '   ', content: '<p> </p>' });
    expect(result.ok).toBe(false);
  });

  it('rejects a record with invalid date', () => {
    const result = normalizeRawMention({ source: 'x', title: 'T', content: 'c', published_at: 'gibberish' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid published_at');
  });

  it('allows a missing date as NULL', () => {
    const result = normalizeRawMention({ source: 'x', title: 'T', content: 'c', published_at: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mention.published_at).toBeNull();
  });

  it('stores an invalid engagement as NULL', () => {
    const result = normalizeRawMention({ source: 'x', title: 'T', content: 'c', engagement: 'not-a-number' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mention.engagement).toBeNull();
  });

  it('rejects a record with a wrong published_at type', () => {
    const result = normalizeRawMention({ source: 'x', title: 'T', content: 'c', published_at: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid record structure');
  });
});