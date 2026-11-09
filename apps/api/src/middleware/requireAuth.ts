import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User";
import { ACCESS_COOKIE } from "../utils/cookies";
import { unauthorized } from "../utils/errors";
import { verifyAccessToken } from "../utils/tokens";

export type AuthedRequest = Request & {
  user?: User;
};

export async function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token || typeof token !== "string") {
      throw unauthorized();
    }

    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.sub);
    if (!user) {
      throw unauthorized();
    }

    req.user = user;
    next();
  } catch {
    next(unauthorized());
  }
}
