import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { catalogueRoutes } from "./catalogue.routes";
import { eventsRoutes } from "./events.routes";
import { healthRoutes } from "./health.routes";

export const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(authRoutes);
apiRouter.use(catalogueRoutes);
apiRouter.use(eventsRoutes);
