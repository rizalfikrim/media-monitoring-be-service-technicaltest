import express from 'express';
import { mentionRouter, mentionSearchRouter } from './routes/mention.routes.js';

export const app = express();

app.use(express.json());
app.use('/internal/mentions', mentionRouter);
app.use('/mentions', mentionSearchRouter);
