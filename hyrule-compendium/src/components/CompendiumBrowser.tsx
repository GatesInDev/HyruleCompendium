'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Bug, Sword, Leaf, Skull, Gem, BookOpen } from 'lucide-react';
import { ICompendiumEntry } from '@/lib/models/CompendiumEntry';
import Image from 'next/image';
import EntryDetailModal from './EntryDetailModal';
import { capitalize } from '@/utils/capitalize';

const GAMES = [
  "The Legend of Zelda", "Zelda II: The Adventure of Link", "A Link to the Past",
  "Link's Awakening", "Ocarina of Time", "Majora's Mask", "Oracle of Ages",
  "Oracle of Seasons", "The Wind Waker", "Four Swords Adventures", "The Minish Cap",
  "Twilight Princess", "Phantom Hourglass", "Spirit Tracks", "Skyward Sword",
  "A Link Between Worlds", "Tri Force Heroes", "Breath of the Wild", "Tears of the Kingdom",
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  creatures: <Bug   size={12} />,
  equipment: <Sword size={12} />,
  materials: <Leaf  size={12} />,
  monsters:  <Skull size={12} />,
  treasure:  <Gem   size={12} />,
};

const CATEGORY_PLACEHOLDER: Record<string, React.ReactNode> = {
  creatures: <Bug   size={36} strokeWidth={1.2} />,
  equipment: <Sword size={36} strokeWidth={1.2} />,
  materials: <Leaf  size={36} strokeWidth={1.2} />,
  monsters:  <Skull size={36} strokeWidth={1.2} />,
  treasure:  <Gem   size={36} strokeWidth={1.2} />,
};

const CATEGORY_COLOR: Record<string, string> = {
  creatures: '#5c8c6a',
  equipment: '#8b6f47',
  materials: '#4a7a5a',
  monsters:  '#b05040',
  treasure:  '#b89a28',
};

type Entry = ICompendiumEntry & Record<string, any>;
interface PageMeta { page: number; pageSize: number; total: number; hasMore: boolean; }
interface PageData { success: boolean; data: Entry[]; meta: PageMeta; }

async function fetchPage(params: URLSearchParams, page: number): Promise<PageData> {
  const p = new URLSearchParams(params);
  p.set('page', String(page));
  const res = await fetch(`/api/compendium?${p.toString()}`);
  if (!res.ok) throw new Error('API error');
  return res.json();
}

export default function CompendiumBrowser() {
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory]           = useState('');
  const [game, setGame]                   = useState('');
  const [entries, setEntries]             = useState<Entry[]>([]);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(false);
  const [initialLoad, setInitialLoad]     = useState(true);
  const [error, setError]                 = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  // Reset on filter change
  useEffect(() => {
    setEntries([]); setPage(1); setHasMore(true); setInitialLoad(true); setError(false);
  }, [debouncedSearch, category, game]);

  const filterParams = new URLSearchParams();
  if (debouncedSearch) filterParams.set('search', debouncedSearch);
  if (category)        filterParams.set('category', category);
  if (game)            filterParams.set('game', game);

  const loadPage = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await fetchPage(filterParams, pageNum);
      setEntries(prev => pageNum === 1 ? result.data : [...prev, ...result.data]);
      setHasMore(result.meta?.hasMore ?? false);
      setTotal(result.meta?.total ?? 0);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); setInitialLoad(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, game]);

  useEffect(() => { loadPage(1); }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [debouncedSearch, category, game]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && hasMore && !loading) {
        const next = page + 1;
        setPage(next);
        loadPage(next);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPage]);

  const hasFilters = !!search || !!category || !!game;
  const clearFilters = () => { setSearch(''); setDebouncedSearch(''); setCategory(''); setGame(''); };

  return (
    <>
      <div className="flex-col" style={{ gap: '1.25rem' }}>
        {/* ── Filter bar ─────────────────────────────────── */}
        <div className="modern-card flex-col" style={{ gap: '0.875rem' }}>

          {/* Row 1: Search */}
          <div style={{ position: 'relative' }}>
            <Search size={17} style={{
              position: 'absolute', left: '1rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              className="zonai-input"
              style={{ paddingLeft: '2.75rem', paddingRight: hasFilters ? '2.75rem' : '1.25rem' }}
              placeholder="Search by name or keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* Inline clear X inside search */}
            {search && (
              <button
                onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none', border: 'none',
                  color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center',
                  padding: '0.25rem', borderRadius: '50%'
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Row 2: Dropdowns + Clear button on same row */}
          <div
            className="filter-dropdowns"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.625rem', alignItems: 'center' }}
          >
            <select
              className="zonai-input"
              value={game}
              onChange={(e) => setGame(e.target.value)}
            >
              <option value="">All Games</option>
              {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select
              className="zonai-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="creatures">Creatures</option>
              <option value="monsters">Monsters</option>
              <option value="materials">Materials</option>
              <option value="equipment">Equipment</option>
              <option value="treasure">Treasure</option>
            </select>

            {/* Clear all button — always takes auto width, hidden when no filters */}
            <button
              className="zonai-button-outline"
              onClick={clearFilters}
              aria-label="Clear all filters"
              style={{
                height: '52px', width: '52px', padding: 0, flexShrink: 0,
                opacity: hasFilters ? 1 : 0, pointerEvents: hasFilters ? 'auto' : 'none',
                transition: 'opacity 0.18s ease'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Row 3: Active filter badges + result count */}
          {(hasFilters || total > 0) && (
            <div className="flex-row gap-2" style={{ flexWrap: 'wrap', minHeight: '24px' }}>
              {game && (
                <span className="zonai-badge" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', gap: '0.3rem', display: 'inline-flex', alignItems: 'center' }}>
                  <BookOpen size={11} /> {game}
                </span>
              )}
              {category && (
                <span className="zonai-badge" style={{ gap: '0.3rem', display: 'inline-flex', alignItems: 'center' }}>
                  {CATEGORY_ICON[category]} {capitalize(category)}
                </span>
              )}
              {search && <span className="zonai-badge">&ldquo;{search}&rdquo;</span>}
              <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', alignSelf: 'center', marginLeft: 'auto' }}>
                {loading && entries.length === 0 ? 'Searching…' : total > 0 ? `${total.toLocaleString()} entries` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="modern-card" style={{ borderLeft: '4px solid #cc4444' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Connection Error</h3>
            <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>Could not reach the database. Try again shortly.</p>
          </div>
        )}

        {/* Skeleton on first load */}
        {initialLoad && loading && (
          <div className="grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="modern-card"
                style={{ height: '260px', background: 'var(--muted)', animation: 'pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!initialLoad && !loading && entries.length === 0 && !error && (
          <div className="modern-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Leaf size={32} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>No records found matching your filters.</p>
          </div>
        )}

        {/* Results grid */}
        {entries.length > 0 && (
          <div className="grid-cols-3">
            {entries.map((entry, idx) => {
              const color = CATEGORY_COLOR[entry.category];
              return (
                <div
                  key={`${entry.id}-${idx}`}
                  className="modern-card card-clickable flex-col"
                  style={{ padding: 0, overflow: 'hidden' }}
                  onClick={() => setSelectedEntry(entry)}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '100%', height: '180px', background: 'var(--muted)', overflow: 'hidden', flexShrink: 0 }}>
                    {entry.image ? (
                      <Image src={entry.image} alt={entry.name} fill style={{ objectFit: 'cover' }} loading="lazy" unoptimized />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', opacity: 0.35 }}>
                        {CATEGORY_PLACEHOLDER[entry.category] ?? <BookOpen size={36} strokeWidth={1.2} />}
                      </div>
                    )}
                    {/* Category badge */}
                    <span className="zonai-badge" style={{
                      position: 'absolute', top: '0.5rem', left: '0.5rem',
                      background: color, color: '#fff', fontSize: '0.65rem',
                      gap: '0.25rem', display: 'inline-flex', alignItems: 'center'
                    }}>
                      {CATEGORY_ICON[entry.category]} {capitalize(entry.category)}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="flex-col gap-1" style={{ padding: '0.875rem 1rem 1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'capitalize', lineHeight: 1.3 }}>
                      {entry.name}
                    </h3>
                    {entry.game && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>{entry.game}</span>
                    )}
                    <p style={{
                      fontSize: '0.78rem', color: 'var(--muted-foreground)', margin: '0.2rem 0 0',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', display: '-webkit-box', overflow: 'hidden', lineHeight: 1.5
                    }}>
                      {entry.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loader for subsequent pages */}
        {loading && entries.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2.5px solid var(--muted)', borderTopColor: 'var(--primary)',
              animation: 'spin 0.7s linear infinite'
            }} />
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: '2px' }} />

        {/* End of results */}
        {!hasMore && entries.length > 0 && !loading && (
          <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.82rem', padding: '0.5rem 0 1rem' }}>
            All {total} entries loaded
          </p>
        )}
      </div>

      {selectedEntry && (
        <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:.9} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}
