import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { TopScorer } from '../interfaces/top-scorer.interface';

const topScorerSchema = new Schema<TopScorer>(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
    goals: {
      type: Number,
      required: true,
      min: 0,
    },
    player: {
      type: Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    team: {
      type: Types.ObjectId,
      ref: 'Team',
    },
    season: {
      type: Types.ObjectId,
      ref: 'Season',
      required: true,
    },
    league: {
      type: Types.ObjectId,
      ref: 'League',
    },
    cup: {
      type: Types.ObjectId,
      ref: 'Cup',
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

topScorerSchema.index({ season: 1, player: 1 }, { unique: true });
topScorerSchema.index({ season: 1, rank: 1 });

export const TopScorerModel =
  (models.TopScorer as Model<TopScorer> | undefined) ??
  model<TopScorer>('TopScorer', topScorerSchema);
