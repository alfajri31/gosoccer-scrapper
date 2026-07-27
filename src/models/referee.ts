import { type Model, model, models, Schema } from 'mongoose';

import type { Referee } from '../interfaces/referee.interface';

const refereeSchema = new Schema<Referee>(
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
    nationality: {
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

refereeSchema.index({ name: 1 });

export const RefereeModel =
  (models.Referee as Model<Referee> | undefined) ??
  model<Referee>('Referee', refereeSchema);
