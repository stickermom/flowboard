import { ClientProviders } from '@/components/ClientProviders';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StickerMOM | Stickers for Phones , Laptops | Budget Friendly Stickers in India',
  description: 'Premium stickers for phones and laptops at budget-friendly prices',
  icons: {
    icon: '/store-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

