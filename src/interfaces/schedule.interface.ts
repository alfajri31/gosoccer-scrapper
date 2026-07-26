import type { Types } from 'mongoose';

export type ScheduleStatus = 'scheduled' | 'postponed' | 'cancelled';

export interface Schedule {
  match: Types.ObjectId;
  kickoffAt: Date;
  timezone: string;
  status: ScheduleStatus;
  previousKickoffAt?: Date;
  scrapedAt: Date;
}
