'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Save, Battery } from 'lucide-react';

const ZONAI_PARTS = [
  { id: 1, name: 'Fan', drain: 0.5 },
  { id: 2, name: 'Wing', drain: 0 },
  { id: 3, name: 'Cart', drain: 0 },
  { id: 4, name: 'Balloon', drain: 0 },
  { id: 5, name: 'Rocket', drain: 5 },
  { id: 6, name: 'Time Bomb', drain: 0 },
  { id: 7, name: 'Portable Pot', drain: 0 },
  { id: 8, name: 'Flame Emitter', drain: 2 },
  { id: 9, name: 'Frost Emitter', drain: 2 },
  { id: 10, name: 'Shock Emitter', drain: 2 },
  { id: 11, name: 'Beam Emitter', drain: 3 },
  { id: 12, name: 'Hydrant', drain: 1 },
  { id: 13, name: 'Steering Stick', drain: 0 },
  { id: 14, name: 'Big Wheel', drain: 1 },
  { id: 15, name: 'Small Wheel', drain: 0.5 },
  { id: 16, name: 'Battery', drain: 0 }, // Provides energy, but keeping simple
  { id: 17, name: 'Spring', drain: 0 },
  { id: 18, name: 'Cannon', drain: 4 },
  { id: 19, name: 'Construct Head', drain: 1 },
  { id: 20, name: 'Stabilizer', drain: 0.5 },
  { id: 21, name: 'Hover Stone', drain: 1.5 },
  { id: 22, name: 'Light', drain: 0.2 },
  { id: 23, name: 'Stake', drain: 0 },
  { id: 24, name: 'Mirror', drain: 0 },
  { id: 25, name: 'Homing Cart', drain: 1.5 },
];

export default function BuilderUI() {
  const [blueprintName, setBlueprintName] = useState('New Schematic');
  const [creator, setCreator] = useState('Engineer');
  const [partsList, setPartsList] = useState<{partId: number, qty: number}[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: communityBlueprints, mutate } = useSWR('/api/blueprints', fetcher);

  const totalDrain = partsList.reduce((acc, part) => {
    const partDef = ZONAI_PARTS.find(p => p.id === part.partId);
    return acc + (partDef ? partDef.drain * part.qty : 0);
  }, 0);

  const totalParts = partsList.reduce((acc, part) => acc + part.qty, 0);

  const addPart = (id: number) => {
    if (totalParts >= 21) {
      alert("Assembly limit is 21 parts!");
      return;
    }
    setPartsList(prev => {
      const existing = prev.find(p => p.partId === id);
      if (existing) {
        return prev.map(p => p.partId === id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { partId: id, qty: 1 }];
    });
  };

  const removePart = (id: number) => {
    setPartsList(prev => {
      const existing = prev.find(p => p.partId === id);
      if (existing && existing.qty > 1) {
        return prev.map(p => p.partId === id ? { ...p, qty: p.qty - 1 } : p);
      }
      return prev.filter(p => p.partId !== id);
    });
  };

  const saveBlueprint = async () => {
    if (partsList.length === 0) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        name: blueprintName,
        creator: creator,
        parts: partsList.map(p => ({
          partName: ZONAI_PARTS.find(z => z.id === p.partId)?.name || 'Unknown',
          quantity: p.qty
        })),
        totalEnergyDrain: totalDrain
      };

      const res = await fetch('/api/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveStatus('Schematic synced to database successfully.');
        setPartsList([]);
        mutate(); // Refresh community list
      } else {
        setSaveStatus('Failed to sync blueprint.');
      }
    } catch (e) {
      setSaveStatus('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid-cols-3">
      
      {/* 2 columns for Builder Workspace */}
      <div style={{ gridColumn: 'span 2' }} className="flex-col gap-4">
        <div className="modern-card flex-col gap-4">
          <div className="flex-row gap-4" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Active Assembly</h2>
            <div className="flex-row gap-2" style={{ fontWeight: 600 }}>
               <Battery size={20} /> 
               Drain/sec: <span style={{ color: totalDrain > 5 ? 'var(--muted-foreground)' : 'inherit' }}>{totalDrain.toFixed(1)} Units</span>
            </div>
          </div>
          
          <div className="flex-row gap-4">
             <input 
               className="zonai-input" 
               value={blueprintName} 
               onChange={e => setBlueprintName(e.target.value)}
               placeholder="Blueprint Designation"
             />
             <input 
               className="zonai-input" 
               value={creator} 
               onChange={e => setCreator(e.target.value)}
               placeholder="Engineer Name"
             />
          </div>

          <div style={{ minHeight: '200px', background: 'var(--muted)', borderRadius: 'var(--radius)', padding: '1rem', flexWrap: 'wrap' }} className="flex-row gap-2">
            {partsList.length === 0 ? (
              <p style={{ opacity: 0.5, margin: 'auto' }}>Select parts from inventory to begin assembly.</p>
            ) : (
              partsList.map(item => {
                const partDef = ZONAI_PARTS.find(p => p.id === item.partId);
                return (
                  <div key={item.partId} className="modern-card flex-row gap-2" style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center' }}>
                     <strong>{partDef?.name} x{item.qty}</strong>
                     <button onClick={() => removePart(item.partId)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.25rem', padding: '0 0.5rem' }}>&times;</button>
                  </div>
                )
              })
            )}
          </div>
          
          <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>Parts count: {totalParts}/21</span>
            
            <div className="flex-row gap-4">
              {saveStatus && <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{saveStatus}</span>}
              <button className="zonai-button flex-row gap-2" onClick={saveBlueprint} disabled={isSaving || partsList.length === 0}>
                <Save size={16} /> {isSaving ? 'Syncing...' : 'Save Schematic'}
              </button>
            </div>
          </div>
        </div>

        <div className="modern-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Inventory</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
            {ZONAI_PARTS.map(part => (
               <button 
                 key={part.id} 
                 className="modern-card"  
                 style={{ textAlign: 'center', padding: '1rem 0.5rem', cursor: 'pointer' }}
                 onClick={() => addPart(part.id)}
               >
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{part.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>{part.drain} drain</div>
               </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1 column for Community Schematics */}
      <div className="modern-card flex-col gap-4" style={{ height: 'fit-content' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Community Schematics</h2>
        <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>Latest builds synced from the network.</p>
        
        {communityBlueprints?.data ? (
          <div className="flex-col gap-4">
            {communityBlueprints.data.map((bp: any) => (
               <div key={bp._id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                 <div style={{ fontWeight: 600 }}>{bp.name}</div>
                 <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>By: {bp.creator} | Drain: {bp.totalEnergyDrain}</div>
               </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>
             Fetching Schematics...
          </div>
        )}
      </div>

    </div>
  );
}
