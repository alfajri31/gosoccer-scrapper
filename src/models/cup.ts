import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Cup } from '../interfaces/cup.interface';

const cupSchema = new Schema<Cup>(
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

cupSchema.index({ externalId: 1, country: 1 }, { unique: true });
cupSchema.index({ name: 1 });

export const CupModel =
  (models.Cup as Model<Cup> | undefined) ?? model<Cup>('Cup', cupSchema);
