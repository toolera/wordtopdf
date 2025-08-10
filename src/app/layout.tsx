import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Word to PDF Converter - Free Online Document Converter",
  description: "Convert Word documents (.doc, .docx) to PDF format instantly. Fast, secure, and completely free online tool. No signup required.",
  keywords: "word to pdf, doc to pdf, docx to pdf, convert word, document converter, pdf converter, free converter",
  authors: [{ name: "Word to PDF Converter" }],
  creator: "Word to PDF Converter",
  publisher: "Word to PDF Converter",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://wordtopdf.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Word to PDF Converter - Free Online Document Converter",
    description: "Convert Word documents to PDF format instantly. Fast, secure, and completely free.",
    url: 'https://wordtopdf.vercel.app',
    siteName: 'Word to PDF Converter',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Word to PDF Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word to PDF Converter - Free Online Tool',
    description: 'Convert Word documents to PDF format instantly. Fast, secure, and completely free.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
