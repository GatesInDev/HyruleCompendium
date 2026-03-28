import dbConnect from '../db/mongodb';
import { CompendiumEntry, ICompendiumEntry } from '../models/CompendiumEntry';

export class CompendiumRepository {
  async getFiltered(params: {
    search?: string | null;
    category?: string | null;
    game?: string | null;
    limit?: number;
    skip?: number;
  }): Promise<{ data: ICompendiumEntry[]; total: number }> {
    await dbConnect();
    const { search, category, game, limit = 24, skip = 0 } = params;
    const query: Record<string, unknown> = {};

    if (search)   query.name     = { $regex: search,   $options: 'i' };
    if (category) query.category = category;
    if (game)     query.game     = { $regex: `^${game}$`, $options: 'i' };

    const [data, total] = await Promise.all([
      CompendiumEntry.find(query).sort({ id: 1 }).skip(skip).limit(limit).lean(),
      CompendiumEntry.countDocuments(query),
    ]);

    return { data, total };
  }

  async getDistinctGames(): Promise<string[]> {
    await dbConnect();
    const games: string[] = await CompendiumEntry.distinct('game');
    return games.filter(Boolean).sort();
  }

  async getById(id: number): Promise<ICompendiumEntry | null> {
    await dbConnect();
    return CompendiumEntry.findOne({ id }).lean();
  }

  /**
   * Lookup multiple entries by exact name (case-insensitive).
   * Used by the detail view to resolve drop/related item links.
   */
  async getByNames(names: string[]): Promise<ICompendiumEntry[]> {
    if (!names.length) return [];
    await dbConnect();
    // Build a list of case-insensitive exact-match regexes
    const regexes = names.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
    return CompendiumEntry.find({ name: { $in: regexes } })
      .select('id name category description image game')
      .limit(20)
      .lean();
  }

  async insertMany(entries: Partial<ICompendiumEntry>[]): Promise<void> {
    await dbConnect();
    await CompendiumEntry.insertMany(entries, { ordered: false }).catch((err) => {
      if (err.code !== 11000) throw err;
    });
  }
}
