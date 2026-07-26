import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Odds } from '../interfaces/odds.interface';

const oddsSchema = new Schema<Odds>(
  {
    match: {
      type: Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    bookmaker: {
      type: String,
      required: true,
      trim: true,
    },
    market: {
      type: String,
      required: true,
      trim: true,
    },
    selections: [
      {
        _id: false,
        name: {
          type: String,
          required: true,
          trim: true,
        },
        value: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    sourceUrl: {
      type: String,
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

oddsSchema.index({ match: 1, bookmaker: 1, market: 1 }, { unique: true });
oddsSchema.index({ scrapedAt: -1 });

export const OddsModel =
  (models.Odds as Model<Odds> | undefined) ??
  model<Odds>('Odds', oddsSchema);
