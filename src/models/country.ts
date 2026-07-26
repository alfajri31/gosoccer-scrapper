import {
  type Model,
  model,
  models,
  Schema,
} from 'mongoose';

import type { Country } from '../interfaces/country.interface';

const countrySchema = new Schema<Country>(
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
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    flagUrl: {
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
  },
  {
    timestamps: true,
  },
);

countrySchema.index({ name: 1 });

export const CountryModel =
  (models.Country as Model<Country> | undefined) ??
  model<Country>('Country', countrySchema);
