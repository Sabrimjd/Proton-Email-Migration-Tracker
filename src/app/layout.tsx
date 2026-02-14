import type { Metadata } from 'next';
import './globals.css';
import { jetbrainsMono, spaceGrotesk } from './font';

export const metadata: Metadata = {
  title: 'Email Migration Tracker',
  description: 'Track Gmail to ProtonMail migration progress',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
