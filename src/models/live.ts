import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { LiveMatch } from '../interfaces/live.interface';

const liveSchema = new Schema<LiveMatch>(
  {
    match: {
      type: Types.ObjectId,
      ref: 'Match',
      required: true,
      unique: true,
    },
    minute: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    addedTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    period: {
      type: String,
      enum: ['first-half', 'half-time', 'second-half', 'extra-time', 'penalties'],
      required: true,
      default: 'first-half',
    },
    homeScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    awayScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastUpdatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

liveSchema.index({ lastUpdatedAt: -1 });

export const LiveModel =
  (models.LiveMatch as Model<LiveMatch> | undefined) ??
  model<LiveMatch>('LiveMatch', liveSchema);
