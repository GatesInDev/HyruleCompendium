import ProgressTracker from '@/components/ProgressTracker';

export const metadata = {
  title: 'Journey Progress - Hyrule Wiki'
};

export default function ProgressPage() {
  return (
    <div className="flex-col gap-8">
      <header className="zonai-header" style={{ marginBottom: '0.5rem' }}>
        Progress Analytics
      </header>
      
      <p style={{ color: 'var(--muted-foreground)', maxWidth: '800px', fontSize: '1.125rem' }}>
        Manage and track completed milestones across your journey with real-time analytics.
      </p>

      <ProgressTracker />
    </div>
  );
}
