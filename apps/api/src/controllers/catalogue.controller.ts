import type { NextFunction, Request, Response } from "express";
import * as catalogue from "../services/catalogue.service";

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function home(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.getHome());
  } catch (err) {
    next(err);
  }
}

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.listCategories());
  } catch (err) {
    next(err);
  }
}

export async function categoryItems(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await catalogue.listCategoryItems(param(req.params.idOrSlug));
    // Frontend `asArray` accepts either a bare array or `{ data: [] }`.
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getItem(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.getItem(param(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.searchItems(String(req.query.q ?? "")));
  } catch (err) {
    next(err);
  }
}

export async function adminListCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.listCategories({ admin: true }));
  } catch (err) {
    next(err);
  }
}

export async function adminCreateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await catalogue.createCategory(req.body));
  } catch (err) {
    next(err);
  }
}

export async function adminCreateItem(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await catalogue.createItem(req.body));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateItem(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.updateItem(param(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function adminListBanners(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.listBanners({ admin: true }));
  } catch (err) {
    next(err);
  }
}

export async function adminCreateBanner(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await catalogue.createBanner(req.body));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateBanner(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await catalogue.updateBanner(param(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}
