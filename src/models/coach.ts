import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Coach } from '../interfaces/coach.interface';

const coachSchema = new Schema<Coach>(
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
    team: {
      type: Types.ObjectId,
      ref: 'Team',
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

coachSchema.index({ team: 1 });
coachSchema.index({ name: 1 });

export const CoachModel =
  (models.Coach as Model<Coach> | undefined) ??
  model<Coach>('Coach', coachSchema);
