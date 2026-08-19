import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { mentionRouter, mentionSearchRouter } from './routes/mention.routes.js';

export const app = express();

app.use(express.json());
app.use('/internal/mentions', mentionRouter);
app.use('/mentions', mentionSearchRouter);

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ success: false, message: 'Invalid JSON body' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

app.use(notFoundHandler);
app.use(errorHandler);