import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Stadium } from '../interfaces/stadium.interface';

const stadiumSchema = new Schema<Stadium>(
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
    capacity: {
      type: Number,
      min: 0,
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
    teams: [
      {
        type: Types.ObjectId,
        ref: 'Team',
      },
    ],
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

stadiumSchema.index({ teams: 1 });
stadiumSchema.index({ country: 1 });
stadiumSchema.index({ name: 1 });

export const StadiumModel =
  (models.Stadium as Model<Stadium> | undefined) ??
  model<Stadium>('Stadium', stadiumSchema);
