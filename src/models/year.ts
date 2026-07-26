import { type Model, model, models, Schema } from 'mongoose';

import type { Year } from '../interfaces/year.interface';

const yearSchema = new Schema<Year>(
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
    year: {
      type: Number,
      required: true,
      unique: true,
      min: 2000,
      max: 2026,
    },
  },
  {
    timestamps: true,
  },
);

export const YearModel =
  (models.Year as Model<Year> | undefined) ?? model<Year>('Year', yearSchema);
