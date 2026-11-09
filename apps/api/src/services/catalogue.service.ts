import { Op } from "sequelize";
import { Banner } from "../models/Banner";
import { Category } from "../models/Category";
import { Item, type ItemStatus } from "../models/Item";
import { badRequest, conflict, notFound } from "../utils/errors";
import { slugify } from "../utils/slug";

export async function getHome() {
  const [banners, categories] = await Promise.all([
    Banner.findAll({
      where: { active: true },
      order: [
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ],
    }),
    Category.findAll({
      where: { active: true },
      order: [
        ["sort", "ASC"],
        ["name", "ASC"],
      ],
    }),
  ]);

  return {
    banners: banners.map((b) => b.toPublic()),
    categories: categories.map((c) => c.toPublic()),
  };
}

export async function listCategories(opts?: { admin?: boolean }) {
  const where = opts?.admin ? {} : { active: true };
  const rows = await Category.findAll({
    where,
    order: [
      ["sort", "ASC"],
      ["name", "ASC"],
    ],
  });
  return rows.map((c) => (opts?.admin ? c.toAdmin() : c.toPublic()));
}

export async function createCategory(input: { name: string; slug?: string; image?: string; sort?: number }) {
  const slug = slugify(input.slug || input.name);
  if (!slug) throw badRequest("Invalid slug");
  const existing = await Category.findOne({ where: { slug } });
  if (existing) throw conflict("Category slug already exists");
  const row = await Category.create({
    name: input.name.trim(),
    slug,
    image: input.image?.trim() || null,
    sort: input.sort ?? 0,
  });
  return row.toAdmin();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findCategory(idOrSlug: string) {
  if (UUID_RE.test(idOrSlug)) {
    return Category.findByPk(idOrSlug);
  }
  return Category.findOne({ where: { slug: idOrSlug } });
}

export async function listCategoryItems(idOrSlug: string, opts?: { admin?: boolean }) {
  const category = await findCategory(idOrSlug);
  if (!category) throw notFound("Category not found");
  if (!opts?.admin && !category.active) throw notFound("Category not found");

  const where: Record<string, unknown> = { categoryId: category.id };
  if (!opts?.admin) where.active = true;

  const items = await Item.findAll({
    where,
    order: [
      ["sort", "ASC"],
      ["name", "ASC"],
    ],
  });

  return {
    category: opts?.admin ? category.toAdmin() : category.toPublic(),
    data: items.map((i) => i.toPublic()),
  };
}

export async function getItem(id: string) {
  const item = await Item.findByPk(id);
  if (!item || !item.active) throw notFound("Item not found");
  return item.toPublic();
}

export async function searchItems(q: string) {
  const query = q.trim();
  if (!query) return [];
  const items = await Item.findAll({
    where: {
      active: true,
      name: { [Op.iLike]: `%${query}%` },
    },
    order: [["name", "ASC"]],
    limit: 40,
  });
  return items.map((i) => i.toPublic());
}

export async function createItem(input: {
  categoryId: string;
  name: string;
  description?: string;
  images?: string[];
  basePrice: number;
  status?: ItemStatus;
  maxQty?: number;
}) {
  const category = await Category.findByPk(input.categoryId);
  if (!category) throw badRequest("Invalid category");
  if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
    throw badRequest("basePrice must be a non-negative integer (kobo)");
  }
  const item = await Item.create({
    categoryId: input.categoryId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    images: input.images ?? [],
    basePrice: Math.round(input.basePrice),
    status: input.status ?? "available",
    maxQty: input.maxQty ?? 20,
  });
  return item.toPublic();
}

export async function updateItem(
  id: string,
  input: Partial<{
    categoryId: string;
    name: string;
    description: string | null;
    images: string[];
    basePrice: number;
    status: ItemStatus;
    maxQty: number;
    active: boolean;
  }>,
) {
  const item = await Item.findByPk(id);
  if (!item) throw notFound("Item not found");
  if (input.categoryId) {
    const category = await Category.findByPk(input.categoryId);
    if (!category) throw badRequest("Invalid category");
  }
  await item.update({
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.images !== undefined ? { images: input.images } : {}),
    ...(input.basePrice !== undefined ? { basePrice: Math.round(input.basePrice) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.maxQty !== undefined ? { maxQty: input.maxQty } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  });
  return item.toPublic();
}

export async function listBanners(opts?: { admin?: boolean }) {
  const where = opts?.admin ? {} : { active: true };
  const rows = await Banner.findAll({
    where,
    order: [
      ["priority", "DESC"],
      ["createdAt", "DESC"],
    ],
  });
  return rows.map((b) => (opts?.admin ? b.toAdmin() : b.toPublic()));
}

export async function createBanner(input: {
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  ctaType?: string;
  ctaTarget?: string;
  ctaLabel?: string;
  priority?: number;
  active?: boolean;
}) {
  const row = await Banner.create({
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    description: input.description?.trim() || null,
    image: input.image.trim(),
    ctaType: input.ctaType || null,
    ctaTarget: input.ctaTarget?.trim() || null,
    ctaLabel: input.ctaLabel?.trim() || null,
    priority: input.priority ?? 0,
    active: input.active ?? true,
  });
  return row.toAdmin();
}

export async function updateBanner(
  id: string,
  input: Partial<{
    title: string;
    subtitle: string | null;
    description: string | null;
    image: string;
    ctaType: string | null;
    ctaTarget: string | null;
    ctaLabel: string | null;
    priority: number;
    active: boolean;
  }>,
) {
  const row = await Banner.findByPk(id);
  if (!row) throw notFound("Banner not found");
  await row.update({
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.image !== undefined ? { image: input.image.trim() } : {}),
    ...(input.ctaType !== undefined ? { ctaType: input.ctaType } : {}),
    ...(input.ctaTarget !== undefined ? { ctaTarget: input.ctaTarget } : {}),
    ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  });
  return row.toAdmin();
}
