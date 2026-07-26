import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Classement } from '../interfaces/classement.interface';

const classementSchema = new Schema<Classement>(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    position: {
      type: Number,
      required: true,
      min: 1,
    },
    played: {
      type: Number,
      required: true,
      min: 0,
    },
    won: {
      type: Number,
      required: true,
      min: 0,
    },
    drawn: {
      type: Number,
      required: true,
      min: 0,
    },
    lost: {
      type: Number,
      required: true,
      min: 0,
    },
    goalsFor: {
      type: Number,
      required: true,
      min: 0,
    },
    goalsAgainst: {
      type: Number,
      required: true,
      min: 0,
    },
    goalDifference: {
      type: Number,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    team: {
      type: Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    league: {
      type: Types.ObjectId,
      ref: 'League',
      required: true,
    },
    year: {
      type: Types.ObjectId,
      ref: 'Year',
      required: true,
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

classementSchema.index(
  {
    league: 1,
    year: 1,
    team: 1,
  },
  {
    unique: true,
  },
);
classementSchema.index({ league: 1, year: 1, position: 1 });

export const ClassementModel =
  (models.Classement as Model<Classement> | undefined) ??
  model<Classement>('Classement', classementSchema);
