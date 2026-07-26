import type { Types } from 'mongoose';

export type MatchPeriod =
  | 'first-half'
  | 'half-time'
  | 'second-half'
  | 'extra-time'
  | 'penalties';

export interface LiveMatch {
  match: Types.ObjectId;
  minute: number;
  addedTime: number;
  period: MatchPeriod;
  homeScore: number;
  awayScore: number;
  lastUpdatedAt: Date;
}
