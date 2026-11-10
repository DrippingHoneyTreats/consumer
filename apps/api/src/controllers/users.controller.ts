import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../models/User";
import * as users from "../services/users.service";

const ROLES = new Set(["CUSTOMER", "STAFF", "SUPER_ADMIN", "all"]);

export async function adminListUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRole = typeof req.query.role === "string" ? req.query.role : "CUSTOMER";
    const role = ROLES.has(rawRole) ? (rawRole as UserRole | "all") : "CUSTOMER";
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const items = await users.listUsers({ role, q, limit });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
}

export async function adminListStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const items = await users.listStaff({ q, limit });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
}

export async function adminInviteStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await users.inviteStaff({
      email: String(req.body?.email ?? ""),
      fullName: req.body?.fullName ? String(req.body.fullName) : undefined,
      role: req.body?.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STAFF",
    });
    res.status(result.created ? 201 : 200).json(result);
  } catch (err) {
    next(err);
  }
}
