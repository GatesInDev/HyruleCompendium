'use client';

import { useEffect, useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Home, BookOpen, PenTool, Map, RefreshCw, ArrowLeft } from 'lucide-react';

export default function CustomContextMenu() {
  const router = useRouter();
  const [contextData, setContextData] = useState({ visible: false, x: 0, y: 0 });

  useEffect(() => {
    const handleContextMenu = (e: globalThis.MouseEvent) => {
      e.preventDefault();
      // Ensure the menu stays within window bounds
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - 300);
      setContextData({ visible: true, x, y });
    };

    const handleClick = () => {
      if (contextData.visible) {
        setContextData({ visible: false, x: 0, y: 0 });
      }
    };

    const handleScroll = () => {
      if (contextData.visible) {
         setContextData({ visible: false, x: 0, y: 0 });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [contextData.visible]);

  if (!contextData.visible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        left: contextData.x,
        top: contextData.y,
        zIndex: 9999,
        background: 'var(--card)',
        border: '1px solid var(--muted)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
        minWidth: '200px',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the menu
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .ctx-item {
          display: flex; align-items: center; gap: 0.75rem; 
          padding: 0.6rem 0.75rem; border-radius: 0.25rem;
          color: var(--foreground); cursor: pointer;
          font-size: 0.875rem; font-weight: 500;
          transition: background 0.1s ease;
        }
        .ctx-item:hover { background: var(--muted); color: var(--primary); }
        .ctx-divider { height: 1px; background: var(--muted); margin: 0.25rem 0; }
      `}</style>
      
      <div className="ctx-item" onClick={() => { router.back(); setContextData({ visible: false, x: 0, y: 0}); }}>
        <ArrowLeft size={16} /> Go Back
      </div>
      <div className="ctx-item" onClick={() => { window.location.reload(); setContextData({ visible: false, x: 0, y: 0}); }}>
        <RefreshCw size={16} /> Reload Page
      </div>
      
      <div className="ctx-divider" />
      
      <div className="ctx-item" onClick={() => { router.push('/'); setContextData({ visible: false, x: 0, y: 0}); }}>
        <Home size={16} /> Hub (Home)
      </div>
      <div className="ctx-item" onClick={() => { router.push('/compendium'); setContextData({ visible: false, x: 0, y: 0}); }}>
        <BookOpen size={16} /> Compendium
      </div>
      <div className="ctx-item" onClick={() => { router.push('/builder'); setContextData({ visible: false, x: 0, y: 0}); }}>
        <PenTool size={16} /> Eng. Builder
      </div>
      <div className="ctx-item" onClick={() => { router.push('/progress'); setContextData({ visible: false, x: 0, y: 0}); }}>
        <Map size={16} /> Progress Tracker
      </div>
    </div>
  );
}
