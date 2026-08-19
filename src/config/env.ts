import 'dotenv/config';

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: "${value}". Expected integer between 1 and 65535.`);
  }
  return port;
}

function parseDatabaseUrl(value: string | undefined): string {
  if (!value || !/^postgres(ql)?:\/\//.test(value)) {
    throw new Error('DATABASE_URL is required and must be a valid postgresql:// connection string.');
  }
  return value;
}

export const config = {
  port: parsePort(process.env.PORT),
  databaseUrl: parseDatabaseUrl(process.env.DATABASE_URL),
} as const;
