import Link from "next/link";
import { Search, PenTool, BarChart3, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex-col">
      {/* Hero Section */}
      <section style={{ 
        padding: '6rem 0', 
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Subtle background gradient to make it feel modern */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, var(--muted) 0%, transparent 70%)',
          zIndex: -1,
          opacity: 0.5
        }} />

        <div className="flex-col gap-6" style={{ alignItems: 'center' }}>
          <div style={{ 
            display: 'inline-block', 
            padding: '0.35rem 1rem', 
            background: 'var(--muted)', 
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            Fully Flat Mobile-First Experience
          </div>
          
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 800, 
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            maxWidth: '100%',
            margin: 0
          }}>
            Your journey in the palm of your hand.
          </h1>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'var(--muted-foreground)', 
            maxWidth: '600px',
            lineHeight: 1.6,
            margin: 0
          }}>
            Explore a detailed compendium, design and analyze complex engineering builds, and track your seamless progression—all in one place.
          </p>
          
          <div className="flex-row gap-4" style={{ marginTop: '1rem' }}>
            <Link href="/compendium" className="zonai-button" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>
              Explore Compendium <ArrowRight size={18} />
            </Link>
            <Link href="/builder" className="zonai-button-outline" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>
              Start Building
            </Link>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section style={{ padding: '4rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Everything you need.
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
            Powerful tools tailored for researchers, engineers, and completionists. Designed with a meticulous focus on speed and clarity.
          </p>
        </div>

        <div className="grid-cols-3">
          {/* Feature 1 */}
          <div className="modern-card flex-col gap-4">
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '8px', 
              background: 'var(--foreground)', color: 'var(--background)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Search size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Vast Database</h3>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0, flex: 1 }}>
              Instantly search through hundreds of creatures, equipment, and materials. View high-quality imagery and detailed stats without loading delays.
            </p>
            <Link href="/compendium" style={{ color: 'var(--foreground)', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              Launch Compendium <ArrowRight size={16} />
            </Link>
          </div>

          {/* Feature 2 */}
          <div className="modern-card flex-col gap-4">
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '8px', 
              background: 'var(--foreground)', color: 'var(--background)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <PenTool size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Engineering Toolkit</h3>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0, flex: 1 }}>
              Draft blueprints by selecting parts from an organized inventory. Automatically calculate energy drain to optimize your builds before taking them into the field.
            </p>
            <Link href="/builder" style={{ color: 'var(--foreground)', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              Open Builder <ArrowRight size={16} />
            </Link>
          </div>
          
          {/* Feature 3 */}
          <div className="modern-card flex-col gap-4">
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '8px', 
              background: 'var(--foreground)', color: 'var(--background)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <BarChart3 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Progress Analytics</h3>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0, flex: 1 }}>
              Keep strict tabs on your journey. Manage completed points of interest and calculate remaining milestones with a synchronized offline-first dashboard.
            </p>
            <Link href="/progress" style={{ color: 'var(--foreground)', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              View Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: 'var(--muted)', padding: '5rem 1.5rem', margin: '4rem -1.5rem -2rem -1.5rem', borderRadius: '1.5rem 1.5rem 0 0' }}>
        <div className="flex-col gap-6" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            Ready to explore?
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.125rem', maxWidth: '500px', margin: 0 }}>
            Start leveraging the ultimate toolset to enhance your adventure today. No sign-up required.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/compendium" className="zonai-button" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
