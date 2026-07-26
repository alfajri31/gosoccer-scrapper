import type { Types } from 'mongoose';

export interface League {
  externalId: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  country: Types.ObjectId;
  sourceUrl?: string;
  scrapedAt: Date;
}
