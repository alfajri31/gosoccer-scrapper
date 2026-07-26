import type { ImageFields } from './image.interface';

export interface Country extends ImageFields {
  externalId: string;
  name: string;
  code?: string;
  flagUrl?: string;
  sourceUrl?: string;
}
