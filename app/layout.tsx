import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ListingsAI - AI-Powered Multi-Marketplace Listing Automation",
  description:
    "Automate your reselling business with AI. Post to eBay, Poshmark, and Mercari instantly. Generate optimized listings, track analytics, and save 95% of your time. Start your 14-day free trial today.",
  keywords: [
    "reseller automation",
    "AI listing generator",
    "eBay automation",
    "Poshmark automation",
    "Mercari automation",
    "multi-marketplace tool",
    "listing optimization",
    "reselling software",
  ],
  authors: [{ name: "ListingsAI" }],
  creator: "ListingsAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://listingsai.io",
    title: "ListingsAI - Automate Your Listings. Grow Your Reselling Business.",
    description:
      "AI-powered platform to post, optimize, and manage your listings across eBay, Poshmark, and Mercari — all in one place.",
    siteName: "ListingsAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "ListingsAI - AI-Powered Multi-Marketplace Automation",
    description:
      "Save 95% of your listing time with AI. Start your 14-day free trial today.",
    creator: "@listingsai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (prefersDark ? 'dark' : 'light');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
