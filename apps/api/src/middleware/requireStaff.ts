import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./requireAuth";
import { forbidden, unauthorized } from "../utils/errors";

export function requireStaff(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  if (req.user.role !== "STAFF" && req.user.role !== "SUPER_ADMIN") {
    next(forbidden("Staff only"));
    return;
  }
  next();
}
