import he from 'he';

export function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSource(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text.toLowerCase() : null;
}

export function stripHtml(value: string): string {
  let cleaned = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  cleaned = he.decode(cleaned);
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}