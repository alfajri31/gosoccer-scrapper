import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Season } from '../interfaces/season.interface';

const seasonSchema = new Schema<Season>(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startYear: {
      type: Number,
      required: true,
    },
    endYear: {
      type: Number,
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
    isCurrent: {
      type: Boolean,
      required: true,
      default: true,
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

seasonSchema.index(
  { league: 1, startYear: 1 },
  {
    unique: true,
    partialFilterExpression: { league: { $exists: true } },
  },
);
seasonSchema.index(
  { cup: 1, startYear: 1 },
  {
    unique: true,
    partialFilterExpression: { cup: { $exists: true } },
  },
);

export const SeasonModel =
  (models.Season as Model<Season> | undefined) ??
  model<Season>('Season', seasonSchema);
