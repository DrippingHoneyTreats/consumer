import type { Request, Response } from "express";
import { sequelize } from "../config/database";

export async function health(_req: Request, res: Response) {
  let database: "up" | "down" = "down";
  try {
    await sequelize.authenticate();
    database = "up";
  } catch {
    database = "down";
  }

  res.status(database === "up" ? 200 : 503).json({
    ok: database === "up",
    service: "dhtcustomers-server",
    database,
  });
}
