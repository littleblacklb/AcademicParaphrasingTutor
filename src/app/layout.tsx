import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/NavBar';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'APT | Academic Paraphrasing Tutor',
  description: 'Practice academic paraphrasing with real-time AI feedback and knowledge extraction.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased h-full flex flex-col bg-background selection:bg-primary/30 selection:text-primary-foreground`}
      >
        <NavBar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
