import type { Types } from 'mongoose';

export interface Season {
  externalId: string;
  name: string;
  startYear: number;
  endYear: number;
  league?: Types.ObjectId;
  cup?: Types.ObjectId;
  isCurrent: boolean;
  sourceUrl: string;
  scrapedAt: Date;
}
