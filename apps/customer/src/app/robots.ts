import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PRIVATE = ["/api/", "/checkout", "/orders", "/account", "/payment", "/verify", "/welcome"];

/**
 * Search engines AND AI assistants are welcome on public pages (menu, about,
 * pastries, events). GEO: explicitly allowing AI crawlers lets ChatGPT,
 * Perplexity, Claude, Gemini etc. read and recommend the bakery.
 */
export default function robots(): MetadataRoute.Robots {
  const aiBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "Bingbot",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: aiBots, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
