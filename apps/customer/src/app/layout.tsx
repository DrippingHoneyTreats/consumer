import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { TabBar } from "@/components/nav/TabBar";
import { CartBanner } from "@/components/nav/CartBanner";
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
      { url: "/assets/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/assets/icons/apple-touch-icon.png", sizes: "180x180" }],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className={`${playfair.variable} ${montserrat.variable} antialiased`}>
        <AppProviders>
          <div className="app-shell">
            <main id="app-scroll" className="app-scroll">
              <div className="app-frame">{children}</div>
            </main>
            <CartBanner />
            <TabBar />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
