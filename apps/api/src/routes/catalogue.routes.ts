import { Router } from "express";
import * as catalogueController from "../controllers/catalogue.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireStaff } from "../middleware/requireStaff";
import { validate } from "../middleware/validate";
import {
  createBannerSchema,
  createCategorySchema,
  createItemSchema,
  updateBannerSchema,
  updateItemSchema,
} from "../validators/catalogue.validators";

export const catalogueRoutes = Router();

catalogueRoutes.get("/home", catalogueController.home);
catalogueRoutes.get("/categories", catalogueController.listCategories);
catalogueRoutes.get("/categories/:idOrSlug/items", catalogueController.categoryItems);
catalogueRoutes.get("/items/:id", catalogueController.getItem);
catalogueRoutes.get("/search", catalogueController.search);

catalogueRoutes.get(
  "/admin/categories",
  requireAuth,
  requireStaff,
  catalogueController.adminListCategories,
);
catalogueRoutes.post(
  "/admin/categories",
  requireAuth,
  requireStaff,
  validate(createCategorySchema),
  catalogueController.adminCreateCategory,
);
catalogueRoutes.post(
  "/admin/items",
  requireAuth,
  requireStaff,
  validate(createItemSchema),
  catalogueController.adminCreateItem,
);
catalogueRoutes.patch(
  "/admin/items/:id",
  requireAuth,
  requireStaff,
  validate(updateItemSchema),
  catalogueController.adminUpdateItem,
);

catalogueRoutes.get(
  "/admin/banners",
  requireAuth,
  requireStaff,
  catalogueController.adminListBanners,
);
catalogueRoutes.post(
  "/admin/banners",
  requireAuth,
  requireStaff,
  validate(createBannerSchema),
  catalogueController.adminCreateBanner,
);
catalogueRoutes.patch(
  "/admin/banners/:id",
  requireAuth,
  requireStaff,
  validate(updateBannerSchema),
  catalogueController.adminUpdateBanner,
);
