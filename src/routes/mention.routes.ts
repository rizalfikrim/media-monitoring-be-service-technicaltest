import { Router } from 'express';
import {
  bulkMentionsController,
  searchMentionsController,
  statsMentionsController,
} from '../controllers/mention.controller.js';

export const mentionRouter = Router();

mentionRouter.post('/bulk', bulkMentionsController);

export const mentionSearchRouter = Router();

mentionSearchRouter.get('/', searchMentionsController);
mentionSearchRouter.get('/stats', statsMentionsController);
