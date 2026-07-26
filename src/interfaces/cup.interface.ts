import type { Types } from 'mongoose';

import type { ImageFields } from './image.interface';

export interface Cup extends ImageFields {
  externalId: string;
  name: string;
  country: Types.ObjectId;
  sourceUrl?: string;
  scrapedAt: Date;
}
