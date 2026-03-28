'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, MapPin, Sword, Shield, Zap, Heart, ShoppingBag,
  Flame, BookOpen, Link2, Package, Unlock, Gamepad2, Bug, Gem,
  Leaf, Skull, AlertTriangle, User, Clock, Ruler, Dna, Swords,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import { ICompendiumEntry } from '@/lib/models/CompendiumEntry';
import { capitalize } from '@/utils/capitalize';

interface Props {
  entry: ICompendiumEntry & Record<string, any>;
  onClose: () => void;
}

const CATEGORY_COLOR: Record<string, string> = {
  creatures: '#5c8c6a',
  equipment: '#8b6f47',
  materials: '#4a7a5a',
  monsters:  '#b05040',
  treasure:  '#b89a28',
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  creatures: <Bug   size={13} />,
  equipment: <Sword size={13} />,
  materials: <Leaf  size={13} />,
  monsters:  <Skull size={13} />,
  treasure:  <Gem   size={13} />,
};

const CATEGORY_PLACEHOLDER_LG: Record<string, React.ReactNode> = {
  creatures: <Bug   size={56} strokeWidth={1.2} />,
  equipment: <Sword size={56} strokeWidth={1.2} />,
  materials: <Leaf  size={56} strokeWidth={1.2} />,
  monsters:  <Skull size={56} strokeWidth={1.2} />,
  treasure:  <Gem   size={56} strokeWidth={1.2} />,
};

const CATEGORY_PLACEHOLDER_SM: Record<string, React.ReactNode> = {
  creatures: <Bug   size={20} strokeWidth={1.4} />,
  equipment: <Sword size={20} strokeWidth={1.4} />,
  materials: <Leaf  size={20} strokeWidth={1.4} />,
  monsters:  <Skull size={20} strokeWidth={1.4} />,
  treasure:  <Gem   size={20} strokeWidth={1.4} />,
};

// Full lightweight entry type (only fields needed for a linked card)
type LinkedEntry = Pick<ICompendiumEntry, 'id' | 'name' | 'category' | 'description' | 'image'> & { game?: string };

type Entry = ICompendiumEntry & Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div className="stat-card" style={accent ? { background: 'var(--primary)' } : {}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
        <span style={{ opacity: 0.65, display: 'flex', color: accent ? 'rgba(255,255,255,0.8)' : 'var(--primary)' }}>{icon}</span>
        <span className="stat-card-label" style={accent ? { color: 'rgba(255,255,255,0.65)' } : {}}>{label}</span>
      </div>
      <span className="stat-card-value" style={accent ? { color: '#fff' } : {}}>{value}</span>
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="detail-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <span style={{ display: 'flex', color: 'var(--primary)', opacity: 0.8 }}>{icon}</span>
        <p className="detail-section-label" style={{ margin: 0 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function PillList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="detail-tag-row">
      {items.map((item, i) => <span key={i} className="detail-pill">{item}</span>)}
    </div>
  );
}

// Mini card for a linked compendium entry
interface LinkedCardProps {
  item: LinkedEntry;
  onClick: (item: LinkedEntry) => void;
}

function LinkedCard({ item, onClick }: LinkedCardProps) {
  const color = CATEGORY_COLOR[item.category] ?? 'var(--primary)';
  return (
    <button className="linked-card" onClick={() => onClick(item)}>
      {/* Thumbnail */}
      <div className="linked-card-thumb">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} unoptimized sizes="48px" />
        ) : (
          <span style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
            {CATEGORY_PLACEHOLDER_SM[item.category] ?? <BookOpen size={20} strokeWidth={1.4} />}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="linked-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
            padding: '0.1rem 0.45rem', borderRadius: '9999px',
            fontSize: '0.65rem', fontWeight: 700, background: color, color: '#fff'
          }}>
            {CATEGORY_ICON[item.category]} {capitalize(item.category)}
          </span>
        </div>
        <p className="linked-card-name">{item.name}</p>
        <p className="linked-card-meta">
          {item.description ? item.description.slice(0, 80) + (item.description.length > 80 ? '…' : '') : (item.game ?? '')}
        </p>
      </div>

      <ChevronRight size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

async function fetchLinkedItems(names: string[]): Promise<LinkedEntry[]> {
  if (!names.length) return [];
  // Deduplicate without Set spread
  const seen: Record<string, boolean> = {};
  const unique: string[] = [];
  for (const n of names) {
    const k = n.trim();
    if (k && !seen[k]) { seen[k] = true; unique.push(k); }
    if (unique.length >= 20) break;
  }
  const url = `/api/compendium?names=${unique.map(encodeURIComponent).join(',')}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data as LinkedEntry[]) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EntryDetailModal({ entry, onClose }: Props) {
  const [linkedDrops,    setLinkedDrops]    = useState<LinkedEntry[]>([]);
  const [linkedRelated,  setLinkedRelated]  = useState<LinkedEntry[]>([]);
  const [loadingLinks,   setLoadingLinks]   = useState(false);

  // Navigate from a linked card — push a new entry onto a local history stack
  const [history, setHistory] = useState<Entry[]>([]);
  const current = history.length > 0 ? history[history.length - 1] : entry;

  const navigateTo = useCallback((linked: LinkedEntry) => {
    setHistory(h => [...h, linked as Entry]);
  }, []);

  const goBack = useCallback(() => {
    if (history.length > 0) {
      setHistory(h => h.slice(0, -1));
    } else {
      onClose();
    }
  }, [history.length, onClose]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') goBack(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [goBack]);

  // Fetch linked items whenever the displayed entry changes
  useEffect(() => {
    const drops    = (current as any).drops          ?? [];
    const related  = (current as any).related_items  ?? [];
    const allNames = [...drops, ...related];

    if (!allNames.length) {
      setLinkedDrops([]);
      setLinkedRelated([]);
      return;
    }

    setLoadingLinks(true);
    fetchLinkedItems(allNames).then(found => {
      // Build lookup map without Map constructor spread
      const nameToItem: Record<string, LinkedEntry> = {};
      found.forEach(f => { nameToItem[f.name.toLowerCase()] = f; });
      setLinkedDrops(drops.map((n: string) => nameToItem[n.toLowerCase()]).filter(Boolean));
      setLinkedRelated(related.map((n: string) => nameToItem[n.toLowerCase()]).filter(Boolean));
      setLoadingLinks(false);
    });
  }, [current]);

  // ── Derived values ──────────────────────────────────────────────────────
  const props  = (current as any).properties ?? {};
  const accent = CATEGORY_COLOR[current.category] ?? 'var(--primary)';
  const catIcon = CATEGORY_ICON[current.category] ?? <BookOpen size={13} />;

  type Stat = { icon: React.ReactNode; label: string; value: string | number; accent?: boolean };
  const stats: Stat[] = [];
  if (props.attack)   stats.push({ icon: <Sword size={14} />,        label: 'Attack',     value: props.attack,    accent: true });
  if (props.damage)   stats.push({ icon: <Swords size={14} />,       label: 'Damage',     value: props.damage,    accent: true });
  if (props.defense)  stats.push({ icon: <Shield size={14} />,       label: 'Defense',    value: props.defense,   accent: true });
  if (props.hp || props.health) stats.push({ icon: <Heart size={14} />, label: 'HP',      value: Number(props.hp ?? props.health) });
  if (props.durability) stats.push({ icon: <Zap size={14} />,        label: 'Durability', value: Number(props.durability) });
  if ((current as any).hearts_recovered) stats.push({ icon: <Heart size={14} />, label: 'HP Restore', value: `+${(current as any).hearts_recovered}` });
  if (props.sell_price) stats.push({ icon: <ShoppingBag size={14} />, label: 'Sell',      value: `${props.sell_price} R` });
  if (props.buy_price)  stats.push({ icon: <ShoppingBag size={14} />, label: 'Buy',       value: `${props.buy_price} R` });
  if (props.effect || (current as any).cooking_effect)
    stats.push({ icon: <Flame size={14} />, label: 'Effect', value: String(props.effect ?? (current as any).cooking_effect ?? '') });

  const height  = (current as any).height;
  const age     = (current as any).age;
  const species = (current as any).species;
  const gender  = (current as any).gender;
  const hasLore = height || age || species || gender || (current as any).lore;

  // Unresolved names (not found in DB) rendered as plain pills
  const resolvedDropNames   = new Set(linkedDrops.map(l => l.name.toLowerCase()));
  const resolvedRelatedNames = new Set(linkedRelated.map(l => l.name.toLowerCase()));
  const unresolvedDrops     = ((current as any).drops ?? []).filter((n: string) => !resolvedDropNames.has(n.toLowerCase()));
  const unresolvedRelated   = ((current as any).related_items ?? []).filter((n: string) => !resolvedRelatedNames.has(n.toLowerCase()));

  return (
    <div className="detail-overlay">
      {/* Back / close button */}
      <button
        className="detail-back-btn zonai-button-outline"
        onClick={goBack}
        aria-label={history.length > 0 ? 'Go back' : 'Close'}
        style={{ padding: 0, width: '44px', height: '44px', borderRadius: '50%' }}
      >
        <ArrowLeft size={20} />
      </button>

      {/* Breadcrumb trail when navigating linked items */}
      {history.length > 0 && (
        <div style={{
          position: 'fixed', top: '1.25rem', left: '4.5rem', right: '1rem',
          zIndex: 400, display: 'flex', alignItems: 'center', gap: '0.35rem',
          overflow: 'hidden'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
          {history.map((h, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted-foreground)', fontSize: '0.78rem', overflow: 'hidden' }}>
              <ChevronRight size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="detail-hero">
        {(current as any).image ? (
          <Image
            src={(current as any).image}
            alt={current.name}
            fill
            style={{ objectFit: 'contain', objectPosition: 'center center' }}
            unoptimized priority
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted-foreground)', opacity: 0.35
          }}>
            {CATEGORY_PLACEHOLDER_LG[current.category] ?? <BookOpen size={56} strokeWidth={1.2} />}
          </div>
        )}
        <div className="detail-hero-gradient" />
      </div>

      {/* Content */}
      <div className="detail-content" style={{ marginTop: '-3.5rem' }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.85rem', borderRadius: '9999px',
            fontSize: '0.78rem', fontWeight: 700, background: accent, color: '#fff'
          }}>
            {catIcon} {capitalize(current.category)}
          </span>
          {(current as any).game && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.25rem 0.85rem', borderRadius: '9999px',
              fontSize: '0.78rem', fontWeight: 600, background: 'var(--card)', color: 'var(--muted-foreground)'
            }}>
              <BookOpen size={12} /> {(current as any).game}
            </span>
          )}
        </div>

        {/* Name */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800,
          margin: '0 0 1rem', lineHeight: 1.15, textTransform: 'capitalize'
        }}>
          {current.name}
        </h1>

        {/* Description */}
        <p style={{ fontSize: '1rem', color: 'var(--muted-foreground)', lineHeight: 1.8, margin: 0 }}>
          {(current as any).description}
        </p>
        {(current as any).lore && (
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: 1.75, marginTop: '0.75rem', fontStyle: 'italic' }}>
            {(current as any).lore}
          </p>
        )}

        {/* Lore stats (character info) */}
        {hasLore && (
          <Section icon={<User size={14} />} title="Character Info">
            <div className="stat-grid">
              {species && <StatCard icon={<Dna   size={14} />} label="Species" value={species} />}
              {gender  && <StatCard icon={<User  size={14} />} label="Gender"  value={gender}  />}
              {age     && <StatCard icon={<Clock size={14} />} label="Age"     value={age}     />}
              {height  && <StatCard icon={<Ruler size={14} />} label="Height"  value={height}  />}
            </div>
          </Section>
        )}

        {/* Combat stats */}
        {stats.length > 0 && (
          <Section icon={<Sword size={14} />} title="Stats & Properties">
            <div className="stat-grid">
              {stats.map((s, i) => (
                <StatCard key={i} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
              ))}
            </div>
          </Section>
        )}

        {/* Weaknesses */}
        {!!((current as any).weaknesses?.length) && (
          <Section icon={<AlertTriangle size={14} />} title="Weaknesses">
            <PillList items={(current as any).weaknesses} />
          </Section>
        )}

        {/* Locations */}
        {!!((current as any).common_locations?.length) && (
          <Section icon={<MapPin size={14} />} title={`Locations (${(current as any).common_locations.length})`}>
            <PillList items={(current as any).common_locations} />
          </Section>
        )}

        {/* Drops — linked cards + unresolved pills */}
        {(linkedDrops.length > 0 || unresolvedDrops.length > 0) && (
          <Section icon={<Package size={14} />} title="Drops">
            {linkedDrops.length > 0 && (
              <div className="linked-cards-grid" style={{ marginBottom: unresolvedDrops.length ? '0.75rem' : 0 }}>
                {linkedDrops.map(item => (
                  <LinkedCard key={item.id} item={item} onClick={navigateTo} />
                ))}
              </div>
            )}
            {unresolvedDrops.length > 0 && <PillList items={unresolvedDrops} />}
          </Section>
        )}

        {/* How to obtain */}
        {!!((current as any).obtaining_methods?.length) && (
          <Section icon={<Unlock size={14} />} title="How to Obtain">
            <PillList items={(current as any).obtaining_methods} />
          </Section>
        )}

        {/* Appearances */}
        {((current as any).appearances?.length ?? 0) > 1 && (
          <Section icon={<Gamepad2 size={14} />} title={`Appears In (${(current as any).appearances.length} games)`}>
            <PillList items={(current as any).appearances ?? []} />
          </Section>
        )}

        {/* Related Items — linked cards + unresolved pills */}
        {(linkedRelated.length > 0 || unresolvedRelated.length > 0) && (
          <Section icon={<Link2 size={14} />} title="Related Items">
            {linkedRelated.length > 0 && (
              <div className="linked-cards-grid" style={{ marginBottom: unresolvedRelated.length ? '0.75rem' : 0 }}>
                {linkedRelated.map(item => (
                  <LinkedCard key={item.id} item={item} onClick={navigateTo} />
                ))}
              </div>
            )}
            {unresolvedRelated.length > 0 && <PillList items={unresolvedRelated} />}
          </Section>
        )}

        {loadingLinks && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0', opacity: 0.5 }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              border: '2px solid var(--muted)', borderTopColor: 'var(--primary)',
              animation: 'spin 0.7s linear infinite'
            }} />
          </div>
        )}

        <div style={{ height: '5rem' }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
