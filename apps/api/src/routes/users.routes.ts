import { Router } from "express";
import * as usersController from "../controllers/users.controller";

export const usersRoutes = Router();

// TODO: restore requireAuth + requireStaff when admin sign-in is re-enabled
usersRoutes.get("/admin/users", usersController.adminListUsers);
usersRoutes.get("/admin/staff", usersController.adminListStaff);
usersRoutes.post("/admin/staff/invite", usersController.adminInviteStaff);
