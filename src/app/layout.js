import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext'
import LayoutContent from '@/components/LayoutContent'
import RouteProtection from "@/components/RouteProtection";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';


const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata = {
  title: "Aegis View",
  description: "Aegis View - Your Comprehensive Security Intelligence Platform. Combining advanced threat detection with intuitive visualization, Aegis View provides real-time security insights and automated response capabilities for modern enterprises.",
  keywords: "Aegis View, security intelligence, threat visualization, security analytics, cloud security, SOC, security operations center, threat detection, cybersecurity, security monitoring, security dashboard",
  openGraph: {
    title: "Aegis View - Security Intelligence Platform",
    description: "Transform your security operations with real-time threat visualization and automated response capabilities",
    url: "https://atracaas.cisoasaservice.io",
    siteName: "Aegis View",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Aegis View Security Intelligence Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegis View - Security Intelligence Platform",
    description: "Transform your security operations with real-time threat visualization and automated response capabilities",
    images: ["/twitter-image.jpg"],
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
  alternates: {
    canonical: "https://atracaas.cisoasaservice.io",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}
      >
        <AuthProvider>
          <RouteProtection>
            <LayoutContent>
              {children}
            </LayoutContent>
          </RouteProtection>
          <SpeedInsights />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}