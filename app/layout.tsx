import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Face Scanner',
  description: 'Mobile-first minimalist facial analysis application with True Black aesthetic.',
  openGraph: {
    title: 'Face Scanner',
    description: 'Mobile-first minimalist facial analysis application with True Black aesthetic.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Face Scanner',
    description: 'Mobile-first minimalist facial analysis application with True Black aesthetic.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`dark bg-black ${inter.variable}`}>
      <body className="bg-black text-white antialiased font-sans selection:bg-neutral-800 selection:text-white min-h-dvh overflow-x-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}


