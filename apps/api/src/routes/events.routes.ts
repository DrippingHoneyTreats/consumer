import { Router } from "express";
import * as eventsController from "../controllers/events.controller";
import { requireAuth } from "../middleware/requireAuth";

export const eventsRoutes = Router();

eventsRoutes.get("/events/types", eventsController.listTypes);
eventsRoutes.get("/events", requireAuth, eventsController.listMine);
