import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { BookOpen, Map, Home, PenTool } from "lucide-react";
import CustomContextMenu from "@/components/ContextMenu";

const outfit = Outfit({ subsets: ["latin"], display: 'swap' });

export const metadata: Metadata = {
  title: "Hyrule Hub",
  description: "The ultimate modern companion for your Zelda engineering and exploration.",
};

export const viewport: Viewport = {
  userScalable: false,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        
        <main>
          {children}
        </main>

        {/* Floating Island Navigation Dock (Mobile-First Paradigm) */}
        <nav className="floating-island">
          <Link href="/" className="nav-link" aria-label="Home">
            <Home size={24} />
          </Link>
          <div style={{ width: '1px', height: '24px', background: 'var(--muted)', margin: '0 0.25rem' }}></div>
          <Link href="/compendium" className="nav-link" aria-label="Compendium">
            <BookOpen size={24} />
          </Link>
          <Link href="/builder" className="nav-link" aria-label="Builder">
            <PenTool size={24} />
          </Link>
          <Link href="/progress" className="nav-link" aria-label="Tracker">
            <Map size={24} />
          </Link>
        </nav>

        <footer style={{ padding: '2rem 1.5rem', marginTop: '2rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.875rem' }}>
             &copy; {new Date().getFullYear()} Hyrule Hub. Unofficial Companion App.
          </div>
        </footer>

        <CustomContextMenu />
      </body>
    </html>
  );
}
