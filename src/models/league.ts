import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { League } from '../interfaces/league.interface';

const leagueSchema = new Schema<League>(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    mobileImageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: Types.ObjectId,
      ref: 'Country',
      required: true,
    },
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

leagueSchema.index({ externalId: 1, country: 1 }, { unique: true });
leagueSchema.index({ name: 1 });

export const LeagueModel =
  (models.League as Model<League> | undefined) ??
  model<League>('League', leagueSchema);
