import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";

export const metadata: Metadata = {
  title: { absolute: "Dripping Honey Treats | Fibre-Rich Pastries & Dessert Tables in Lagos" },
  description:
    "Fibre-rich wheat chinchin, wheat cakes and puff-puff, baked fresh in Lekki, Lagos. Order online for pickup or delivery across Lagos, or book a dessert table for your event.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <HomeView />;
}
