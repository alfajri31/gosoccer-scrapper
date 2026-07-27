import type { ImageFields } from './image.interface';

export interface Referee extends ImageFields {
  externalId: string;
  name: string;
  nationality?: string;
  sourceUrl?: string;
  scrapedAt: Date;
}
