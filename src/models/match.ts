import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Match } from '../interfaces/match.interface';

const matchSchema = new Schema<Match>(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
    },
    league: {
      type: Types.ObjectId,
      ref: 'League',
      required: true,
    },
    season: {
      type: String,
      required: true,
      trim: true,
    },
    homeTeam: {
      type: Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    awayTeam: {
      type: Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    score: {
      home: {
        type: Number,
        default: null,
        min: 0,
      },
      away: {
        type: Number,
        default: null,
        min: 0,
      },
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'finished', 'postponed', 'cancelled'],
      required: true,
      default: 'scheduled',
    },
    kickoffAt: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      trim: true,
    },
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
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

matchSchema.index({ externalId: 1, sourceUrl: 1 }, { unique: true });
matchSchema.index({ kickoffAt: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ league: 1, season: 1 });

export const MatchModel =
  (models.Match as Model<Match> | undefined) ??
  model<Match>('Match', matchSchema);
