export function parseEngagement(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let number: number;

  if (typeof value === 'number') {
    number = value;
  } else if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s]/g, '');
    if (!/^\d+$/.test(cleaned)) {
      return null;
    }
    number = Number(cleaned);
  } else {
    return null;
  }

  if (!Number.isSafeInteger(number) || number < 0) {
    return null;
  }

  return number;
}