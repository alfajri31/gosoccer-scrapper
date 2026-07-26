import type { Types } from 'mongoose';

export interface Classement {
  externalId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  team: Types.ObjectId;
  league: Types.ObjectId;
  year: Types.ObjectId;
  sourceUrl: string;
  scrapedAt: Date;
}
