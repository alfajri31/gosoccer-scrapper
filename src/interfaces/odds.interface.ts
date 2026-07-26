import type { Types } from 'mongoose';

export interface OddsSelection {
  name: string;
  value: number;
}

export interface Odds {
  match: Types.ObjectId;
  bookmaker: string;
  market: string;
  selections: OddsSelection[];
  sourceUrl?: string;
  scrapedAt: Date;
}
