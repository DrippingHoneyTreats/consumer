import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getSeoMenu } from "@/server/seo";

export const revalidate = 3600;

/** Every public page, including one per menu category. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories } = await getSeoMenu();
  const now = new Date();
  const latest = (dates: (string | null)[]) => {
    const t = dates.filter(Boolean).map((d) => new Date(d as string).getTime());
    return t.length ? new Date(Math.max(...t)) : now;
  };
  const menuUpdated = latest(categories.flatMap((c) => c.items.map((i) => i.updatedAt)));

  return [
    { url: `${SITE_URL}/`, lastModified: menuUpdated, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/menu`, lastModified: menuUpdated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/pastries`, lastModified: menuUpdated, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${SITE_URL}/pastries/${c.slug}`,
      lastModified: latest(c.items.map((i) => i.updatedAt)),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/events`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date("2026-11-20"), changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: new Date("2026-11-20"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
