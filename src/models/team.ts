import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Team } from '../interfaces/team.interface';

const teamSchema = new Schema<Team>(
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
    country: {
      type: Types.ObjectId,
      ref: 'Country',
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

teamSchema.index({ externalId: 1 }, { unique: true });
teamSchema.index({ name: 1 });

export const TeamModel =
  (models.Team as Model<Team> | undefined) ?? model<Team>('Team', teamSchema);
