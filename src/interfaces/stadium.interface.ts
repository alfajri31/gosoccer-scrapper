import type { Types } from 'mongoose';

import type { ImageFields } from './image.interface';

export interface Stadium extends ImageFields {
  externalId: string;
  name: string;
  capacity?: number;
  teams: Types.ObjectId[];
  country?: Types.ObjectId;
  sourceUrl?: string;
  scrapedAt: Date;
}
