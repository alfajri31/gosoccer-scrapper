import type { Types } from 'mongoose';

export interface Team {
  externalId: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  country?: Types.ObjectId;
  sourceUrl?: string;
  scrapedAt: Date;
}
