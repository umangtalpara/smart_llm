import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'ProxyLLM - Smart AI API Gateway & Rotation Layer',
  description:
    'Maximize your AI API key utilization, configure custom failover groups, and route key usage dynamically through a single unified endpoint with multi-tenant tracking.',
  keywords: [
    'AI Gateway',
    'API Rotation',
    'OpenAI Proxy',
    'Gemini Key Router',
    'SaaS AI',
    'Indie Hackers',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} dark`}>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

