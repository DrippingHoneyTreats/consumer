import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { BUSINESS, SEO_KEYWORDS, SITE_URL } from "@/lib/site";
import { JsonLd, bakeryJsonLd, websiteJsonLd } from "@/lib/jsonld";
import "./globals.css";
import { NavProgress } from "@/components/nav/NavProgress";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dripping Honey Treats | Fibre-Rich Pastries & Dessert Tables in Lagos",
    template: "%s | Dripping Honey Treats",
  },
  description:
    "Order fibre-rich pastries in Lagos: wheat chinchin, wheat cakes and puff-puff, baked fresh in Lekki. Pickup or delivery across Lagos, plus dessert & snack tables for birthdays, corporate events and weddings.",
  keywords: SEO_KEYWORDS,
  applicationName: BUSINESS.name,
  authors: [{ name: BUSINESS.name, url: SITE_URL }],
  creator: BUSINESS.name,
  publisher: BUSINESS.name,
  category: "food",
  // No canonical here: it would be inherited by every page. Each page sets its own.
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: BUSINESS.name,
    title: "Dripping Honey Treats | Fibre-Rich Pastries in Lagos",
    description:
      "Fibre-rich chinchin, wheat cakes and puff-puff, baked fresh in Lekki. Pickup or delivery across Lagos, plus dessert tables for events.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dripping Honey Treats | Fibre-Rich Pastries in Lagos",
    description: "Fibre-rich chinchin, wheat cakes and puff-puff, baked fresh in Lekki. Pickup or delivery across Lagos.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  other: {
    "geo.region": "NG-LA",
    "geo.placename": "Lekki, Lagos",
  },
  icons: {
    icon: [
      { url: "/assets/icons/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/assets/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/icons/favicon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/assets/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/assets/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/assets/icons/favicon-64.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DHT",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#F7C8CE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const INTRO_ONCE_SCRIPT = `try{var k="dht-app-splash-seen";if(sessionStorage.getItem(k)==="1"){document.documentElement.classList.add("dht-intro-seen")}else{sessionStorage.setItem(k,"1")}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        {/* Runs before first paint: skip the intro if it already played this session. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_ONCE_SCRIPT }} />
        {/* Who we are, where, and what we sell, for Google and AI search. */}
        <JsonLd data={[bakeryJsonLd(), websiteJsonLd()]} />
      </head>
      <body className={`${playfair.variable} ${montserrat.variable} antialiased`} suppressHydrationWarning>
        {/* Frosted-glass intro. Pure CSS (see globals.css): it opens on schedule even before JS loads. */}
        <div id="dht-intro" aria-hidden="true">
          <div className="dht-pane dht-pane-left" />
          <div className="dht-pane dht-pane-right" />
        </div>
        <NavProgress />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
