import { Router } from 'express';
import {
  bulkMentionsController,
  searchMentionsController,
} from '../controllers/mention.controller.js';

export const mentionRouter = Router();

mentionRouter.post('/bulk', bulkMentionsController);

export const mentionSearchRouter = Router();

mentionSearchRouter.get('/', searchMentionsController);
