export class InvalidDateError extends Error {
  constructor() {
    super('Invalid published_at value');
    this.name = 'InvalidDateError';
  }
}

export function parsePublishedAt(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw new InvalidDateError();
    }
    const date = new Date(value * 1000);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidDateError();
    }
    return date;
  }

  if (typeof value !== 'string') {
    throw new InvalidDateError();
  }

  const trimmed = value.trim();

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    if (!valid) {
      throw new InvalidDateError();
    }
    return date;
  }

  const naive = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(trimmed);
  if (naive) {
    const date = new Date(`${naive[1]}T${naive[2]}Z`);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidDateError();
    }
    return date;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new InvalidDateError();
  }
  return date;
}