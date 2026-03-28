import mongoose from 'mongoose';

export interface IUserProgress extends mongoose.Document {
  userId: string; // Typically a unique identifier like session ID or device ID for non-authed
  completedShrines: string[];
  completedKoroks: string[];
  updatedAt: Date;
}

const UserProgressSchema = new mongoose.Schema<IUserProgress>({
  userId: { type: String, required: true, unique: true, index: true },
  completedShrines: [{ type: String }],
  completedKoroks: [{ type: String }],
  updatedAt: { type: Date, default: Date.now }
});

export const UserProgress = mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
