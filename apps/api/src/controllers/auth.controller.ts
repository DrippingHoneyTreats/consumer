import type { NextFunction, Request, Response } from "express";
import type { AuthedRequest } from "../middleware/requireAuth";
import * as authService from "../services/auth.service";
import { clearAccessCookie, setAccessCookie } from "../utils/cookies";
import { unauthorized } from "../utils/errors";
import { signAccessToken } from "../utils/tokens";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(result.created ? 201 : 200).json(result.user.toPublic());
  } catch (err) {
    next(err);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.sendOtp(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.verifyOtp(req.body);
    const token = signAccessToken({ sub: user.id, role: user.role });
    setAccessCookie(res, token);
    res.status(200).json(user.toPublic());
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    clearAccessCookie(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw unauthorized();
    }
    res.status(200).json(req.user.toPublic());
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw unauthorized();
    }
    const user = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json(user.toPublic());
  } catch (err) {
    next(err);
  }
}
