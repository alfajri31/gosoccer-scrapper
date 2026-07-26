import {
  type Model,
  model,
  models,
  Schema,
  Types,
} from 'mongoose';

import type { Player } from '../interfaces/player.interface';

const playerSchema = new Schema<Player>(
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
    position: {
      type: String,
      trim: true,
      uppercase: true,
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

playerSchema.index({ team: 1 });
playerSchema.index({ name: 1 });

export const PlayerModel =
  (models.Player as Model<Player> | undefined) ??
  model<Player>('Player', playerSchema);
