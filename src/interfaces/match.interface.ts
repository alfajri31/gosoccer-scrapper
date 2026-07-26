import type { Types } from 'mongoose';

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled';

export interface MatchScore {
  home: number | null;
  away: number | null;
}

export interface Match {
  externalId: string;
  league: Types.ObjectId;
  season: string;
  homeTeam: Types.ObjectId;
  awayTeam: Types.ObjectId;
  score: MatchScore;
  status: MatchStatus;
  kickoffAt: Date;
  venue?: string;
  sourceUrl: string;
  scrapedAt: Date;
}
