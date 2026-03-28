import BuilderUI from '@/components/BuilderUI';

export const metadata = {
  title: 'Zonai Blueprint Builder - Hyrule Wiki'
};

export default function BuilderPage() {
  return (
    <div className="flex-col gap-8">
      <header className="zonai-header" style={{ marginBottom: '0.5rem' }}>
        Engineering Builder
      </header>
      
      <p style={{ color: 'var(--muted-foreground)', maxWidth: '800px', fontSize: '1.125rem' }}>
        Draft blueprints by selecting parts from inventory, calculate total energy constraints, and manage saved schematics.
      </p>

      <BuilderUI />
    </div>
  );
}
