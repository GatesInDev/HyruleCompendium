import { NextResponse } from 'next/server';
import { CompendiumRepository } from '@/lib/repositories/CompendiumRepository';
import { rateLimit } from '@/utils/rate-limit';
import { sanitizeInput } from '@/utils/sanitize';

const repository = new CompendiumRepository();
const PAGE_SIZE = 24;

export async function GET(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    if (!rateLimit(ip, 150, 60000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);

    // Distinct games list
    if (searchParams.get('games') === 'true') {
      const games = await repository.getDistinctGames();
      return NextResponse.json({ success: true, data: games });
    }

    // Batch lookup by name list (for linked item cards in detail view)
    const namesParam = searchParams.get('names');
    if (namesParam) {
      const names = namesParam.split(',').map(n => sanitizeInput(n.trim())).filter(Boolean);
      const data = await repository.getByNames(names);
      return NextResponse.json({ success: true, data });
    }

    const category = searchParams.get('category') ? sanitizeInput(searchParams.get('category')!) : null;
    const search   = searchParams.get('search')   ? sanitizeInput(searchParams.get('search')!)   : null;
    const game     = searchParams.get('game')      ? sanitizeInput(searchParams.get('game')!)      : null;
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

    const { data, total } = await repository.getFiltered({
      search, category, game,
      limit: PAGE_SIZE,
      skip:  (page - 1) * PAGE_SIZE,
    });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: page * PAGE_SIZE < total,
      },
    });
  } catch (error: unknown) {
    console.error('[Compendium API] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch compendium data or database unreachable' },
      { status: 500 }
    );
  }
}
