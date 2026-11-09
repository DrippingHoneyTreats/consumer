import type { NextFunction, Request, Response } from "express";

/** Phase stub: event types/leads land in a later slice. Keep customer empty-state friendly. */
export async function listTypes(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json([]);
  } catch (err) {
    next(err);
  }
}

export async function listMine(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json([]);
  } catch (err) {
    next(err);
  }
}
