import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(1).max(80).optional(),
  image: z.string().trim().min(1).max(500).optional(),
  sort: z.number().int().optional(),
});

export const createItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  images: z.array(z.string().trim().min(1)).max(8).optional(),
  basePrice: z.number().int().min(0),
  status: z.enum(["available", "few_left", "sold_out", "pre_order"]).optional(),
  maxQty: z.number().int().min(1).max(200).optional(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  description: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
});

export const createBannerSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  image: z.string().trim().min(1),
  ctaType: z.string().trim().max(40).optional(),
  ctaTarget: z.string().trim().max(500).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  priority: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const updateBannerSchema = createBannerSchema.partial().extend({
  subtitle: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  ctaType: z.string().trim().max(40).nullable().optional(),
  ctaTarget: z.string().trim().max(500).nullable().optional(),
  ctaLabel: z.string().trim().max(80).nullable().optional(),
});
