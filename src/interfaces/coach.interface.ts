import type { Types } from 'mongoose';

import type { ImageFields } from './image.interface';

export interface Coach extends ImageFields {
  externalId: string;
  name: string;
  team: Types.ObjectId;
  sourceUrl?: string;
  scrapedAt: Date;
}
