import type { Metadata, Viewport } from 'next';
import { Fraunces, JetBrains_Mono, Inter_Tight } from 'next/font/google';
import './globals.css';

// Variable serif with opsz axis — used for the hero numbers only. Never for
// UI chrome; restraint is the point. next/font forbids an explicit `weight`
// list alongside `axes` for variable fonts; the full range comes for free.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz', 'SOFT'],
  display: 'swap',
});

// Dense monospace for technical copy, latencies, terminal chrome.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

// Compact sans for body prose (Inter Tight — narrower than Inter).
const inter = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Helios · solar economics in 20 seconds',
  description:
    'Home solar ROI in the time it takes to type an address. 10 paid APIs fired in parallel through one Orthogonal SDK — tariff, weather, permits, financing, property value, demographics, reviews, carbon price. Built for DataHacks 2026.',
  metadataBase: new URL('https://helios.daniticau.com'),
  openGraph: {
    title: 'Helios · solar economics in 20 seconds',
    description: '10 paid APIs, 1 SDK. NPV + payback for any address.',
    type: 'website',
    siteName: 'Helios',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jetbrains.variable} ${inter.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
