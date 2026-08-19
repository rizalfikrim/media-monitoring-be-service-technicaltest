import { Router } from 'express';
import { bulkMentionsController } from '../controllers/mention.controller.js';

export const mentionRouter = Router();

mentionRouter.post('/bulk', bulkMentionsController);
