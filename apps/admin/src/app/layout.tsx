import type { Metadata, Viewport } from "next";
import { AdminRoot } from "@/components/admin/AdminRoot";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DHT Admin",
    template: "%s · DHT Admin",
  },
  description: "Kitchen and ops for Dripping Honey Treats",
  applicationName: "DHT Admin",
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
    title: "DHT Admin",
  },
};

export const viewport: Viewport = {
  themeColor: "#3F5F46",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-off-white antialiased">
        <AdminRoot>{children}</AdminRoot>
      </body>
    </html>
  );
}
