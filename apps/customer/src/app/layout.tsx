import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

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
  title: {
    default: "Dripping Honey Treats",
    template: "%s · DHT",
  },
  description: "Fibre-based pastries delivered in Lagos, plus event catering — order sharp sharp.",
  applicationName: "Dripping Honey Treats",
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
      </head>
      <body className={`${playfair.variable} ${montserrat.variable} antialiased`} suppressHydrationWarning>
        {/* Frosted-glass intro. Pure CSS (see globals.css): it opens on schedule even before JS loads. */}
        <div id="dht-intro" aria-hidden="true">
          <div className="dht-pane dht-pane-left" />
          <div className="dht-pane dht-pane-right" />
        </div>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
