import mongoose from 'mongoose';

export interface ICompendiumEntry extends mongoose.Document {
  id: number;
  name: string;
  category: 'creatures' | 'equipment' | 'materials' | 'monsters' | 'treasure';
  description: string;
  lore?: string;
  image: string;
  game?: string;
  // Physical / lore attributes
  species?: string;
  gender?: string;
  age?: string;
  height?: string;
  // Locations & social
  common_locations?: string[];
  habitat?: string;
  // Drops & obtaining
  drops?: string[];
  obtaining_methods?: string[];
  // Game cross-references
  appearances?: string[];
  related_items?: string[];
  // Combat (monsters / equipment)
  weaknesses?: string[];
  cooking_effect?: string;
  hearts_recovered?: number;
  properties?: {
    attack?: number;
    damage?: number;
    defense?: number;
    hp?: number;
    health?: number;
    effect?: string;
    durability?: number;
    sell_price?: number;
    buy_price?: number;
  };
}

const CompendiumEntrySchema = new mongoose.Schema<ICompendiumEntry>({
  id:          { type: Number, required: true, unique: true },
  name:        { type: String, required: true, index: true },
  category:    { type: String, required: true, enum: ['creatures','equipment','materials','monsters','treasure'], index: true },
  description: { type: String, default: '' },
  lore:        { type: String },
  image:       { type: String, default: '' },
  game:        { type: String, index: true },
  species:     { type: String },
  gender:      { type: String },
  age:         { type: String },
  height:      { type: String },
  habitat:     { type: String },
  common_locations:  [{ type: String }],
  drops:             [{ type: String }],
  obtaining_methods: [{ type: String }],
  appearances:       [{ type: String }],
  related_items:     [{ type: String }],
  weaknesses:        [{ type: String }],
  cooking_effect:   { type: String },
  hearts_recovered: { type: Number },
  properties: {
    attack:     { type: Number },
    damage:     { type: Number },
    defense:    { type: Number },
    hp:         { type: Number },
    health:     { type: Number },
    effect:     { type: String },
    durability: { type: Number },
    sell_price: { type: Number },
    buy_price:  { type: Number },
  },
}, { strict: false });

delete (mongoose.models as any).CompendiumEntry;
export const CompendiumEntry = mongoose.model<ICompendiumEntry>('CompendiumEntry', CompendiumEntrySchema);
