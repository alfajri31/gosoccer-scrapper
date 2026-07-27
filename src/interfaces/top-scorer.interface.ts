import type { Types } from 'mongoose';

export interface TopScorer {
  externalId: string;
  rank: number;
  goals: number;
  player: Types.ObjectId;
  team?: Types.ObjectId;
  season: Types.ObjectId;
  league?: Types.ObjectId;
  cup?: Types.ObjectId;
  sourceUrl: string;
  scrapedAt: Date;
}
