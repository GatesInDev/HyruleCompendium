'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Download, Upload } from 'lucide-react';

const TOTAL_SHRINES = 152;
const TOTAL_KOROKS = 1000;
const STORAGE_KEY = 'hyrule_tracker_save';

export default function ProgressTracker() {
  const [shrines, setShrines] = useState(0);
  const [koroks, setKoroks] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.shrines === 'number') setShrines(Math.min(data.shrines, TOTAL_SHRINES));
        if (typeof data.koroks === 'number') setKoroks(Math.min(data.koroks, TOTAL_KOROKS));
      }
    } catch(e) {
      console.error('Failed to load local storage save:', e);
    }
  }, []);

  // Sync to local storage on changes
  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ shrines, koroks }));
    } catch(e) {
      console.error('Failed to save to local storage', e);
    }
  }, [shrines, koroks, isClient]);

  const exportData = () => {
    try {
      const data = JSON.stringify({ shrines, koroks }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hyrule_save_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSaveStatus('Backup exported!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch(e) {
      setSaveStatus('Export failed.');
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (typeof data.shrines === 'number' && typeof data.koroks === 'number') {
          setShrines(Math.min(data.shrines, TOTAL_SHRINES));
          setKoroks(Math.min(data.koroks, TOTAL_KOROKS));
          setSaveStatus('Data imported successfully!');
        } else {
          setSaveStatus('Invalid save file format.');
        }
      } catch(err) {
        setSaveStatus('Failed to read save file.');
      }
      setTimeout(() => setSaveStatus(null), 3000);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (!isClient) return null; // Prevent hydration mismatch

  const shrinePercent = Math.round((shrines / TOTAL_SHRINES) * 100);
  const korokPercent = Math.round((koroks / TOTAL_KOROKS) * 100);

  return (
    <div className="flex-col gap-4">
      <div className="grid-cols-2">
        {/* Shrines Card */}
        <div className="modern-card flex-col gap-4">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Shrines of Light</h2>
          <div className="flex-row gap-4 justify-between" style={{ padding: '1rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{shrines} <span style={{ fontSize: '1rem', opacity: 0.6 }}>/ {TOTAL_SHRINES}</span></div>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{shrinePercent}% Completed</div>
            </div>
            <div className="flex-col gap-2">
              <button className="zonai-button" onClick={() => setShrines(Math.min(shrines + 1, TOTAL_SHRINES))}>+ Add</button>
              <button className="zonai-button-outline" onClick={() => setShrines(Math.max(shrines - 1, 0))}>- Remove</button>
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${shrinePercent}%`, height: '100%', background: 'var(--foreground)', transition: 'width 0.3s ease' }}></div>
          </div>
        </div>

        {/* Koroks Card */}
        <div className="modern-card flex-col gap-4">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Korok Seeds</h2>
          <div className="flex-row gap-4 justify-between" style={{ padding: '1rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{koroks} <span style={{ fontSize: '1rem', opacity: 0.6 }}>/ {TOTAL_KOROKS}</span></div>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{korokPercent}% Found</div>
            </div>
            <div className="flex-col gap-2">
              <button className="zonai-button" onClick={() => setKoroks(Math.min(koroks + 1, TOTAL_KOROKS))}>+ Add</button>
              <button className="zonai-button-outline" onClick={() => setKoroks(Math.max(koroks - 1, 0))}>- Remove</button>
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${korokPercent}%`, height: '100%', background: 'var(--foreground)', transition: 'width 0.3s ease' }}></div>
          </div>
        </div>
      </div>
      
      {/* Save / Export Strip */}
      <div className="modern-card flex-row justify-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex-col">
          <span style={{ fontWeight: 600 }}>Data is saved locally to this device.</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Use Exporting to back up or transfer between devices. {saveStatus}</span>
        </div>
        
        <div className="flex-row gap-4">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={importData} 
            style={{ display: 'none' }} 
          />
          <button className="zonai-button-outline flex-row gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import Data
          </button>
          <button className="zonai-button flex-row gap-2" onClick={exportData}>
            <Download size={16} /> Export Backup
          </button>
        </div>
      </div>
    </div>
  );
}
