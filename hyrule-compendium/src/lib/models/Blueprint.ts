import mongoose from 'mongoose';

export interface IBlueprint extends mongoose.Document {
  name: string;
  creator: string;
  parts: {
    partName: string;
    quantity: number;
  }[];
  totalEnergyDrain: number;
  createdAt: Date;
}

const BlueprintSchema = new mongoose.Schema<IBlueprint>({
  name: { type: String, required: true, maxLength: 100 },
  creator: { type: String, required: true, maxLength: 50 },
  parts: [{
    partName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 21 }
  }],
  totalEnergyDrain: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Blueprint = mongoose.models.Blueprint || mongoose.model<IBlueprint>('Blueprint', BlueprintSchema);
