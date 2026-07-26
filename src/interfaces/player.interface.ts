import type { Types } from 'mongoose';

import type { ImageFields } from './image.interface';

export interface Player extends ImageFields {
  externalId: string;
  name: string;
  position?: string;
  nationality?: string;
  team: Types.ObjectId;
  sourceUrl?: string;
  scrapedAt: Date;
}
