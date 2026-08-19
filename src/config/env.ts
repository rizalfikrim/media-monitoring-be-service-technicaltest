import 'dotenv/config';

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: "${value}". Expected integer between 1 and 65535.`);
  }
  return port;
}

export const config = {
  port: parsePort(process.env.PORT),
} as const;
