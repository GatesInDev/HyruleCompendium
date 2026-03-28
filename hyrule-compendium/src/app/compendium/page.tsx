import { Suspense } from 'react';
import CompendiumBrowser from '@/components/CompendiumBrowser';

export const metadata = {
  title: 'Compendium Explorer - Hyrule Wiki'
};

export default function CompendiumPage() {
  return (
    <div className="flex-col gap-8">
      <header className="zonai-header" style={{ marginBottom: '0.5rem' }}>
        Interactive Compendium
      </header>
      
      <p style={{ color: 'var(--muted-foreground)', maxWidth: '800px', fontSize: '1.125rem' }}>
        Search, filter, and explore records of wildlife, monsters, ancient materials, and equipment.
      </p>

      {/* Wrapping the client component in suspense for streaming */}
      <Suspense fallback={<div className="modern-card" style={{ padding: '2rem', textAlign: 'center' }}>Loading Database...</div>}>
        <CompendiumBrowser />
      </Suspense>
    </div>
  );
}
