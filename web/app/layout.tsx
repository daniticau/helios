import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Helios — solar economics in 20 seconds',
  description:
    'Mobile-first AI agent for home solar. 10 paid APIs fired in parallel through Orthogonal: tariff, weather, permits, financing, property value, demographics, reviews, carbon price. One SDK integration instead of ten.',
  metadataBase: new URL('https://helios.daniticau.com'),
  openGraph: {
    title: 'Helios — solar economics in 20 seconds',
    description: '10 paid APIs, 1 SDK. NPV + payback for any address in 20 seconds.',
    type: 'website',
    siteName: 'Helios',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
