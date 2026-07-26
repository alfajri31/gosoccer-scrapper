import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Schedule } from '../interfaces/schedule.interface';

const scheduleSchema = new Schema<Schedule>(
  {
    match: {
      type: Types.ObjectId,
      ref: 'Match',
      required: true,
      unique: true,
    },
    kickoffAt: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'postponed', 'cancelled'],
      required: true,
      default: 'scheduled',
    },
    previousKickoffAt: {
      type: Date,
    },
    scrapedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

scheduleSchema.index({ kickoffAt: 1, status: 1 });

export const ScheduleModel =
  (models.Schedule as Model<Schedule> | undefined) ??
  model<Schedule>('Schedule', scheduleSchema);
