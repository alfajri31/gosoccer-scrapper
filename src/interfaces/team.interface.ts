import type { Types } from 'mongoose';

import type { ImageFields } from './image.interface';

export interface Team extends ImageFields {
  externalId: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  country?: Types.ObjectId;
  leagues: Types.ObjectId[];
  sourceUrl?: string;
  scrapedAt: Date;
}
