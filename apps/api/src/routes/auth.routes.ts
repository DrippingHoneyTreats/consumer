import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import {
  registerSchema,
  sendOtpSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "../validators/auth.validators";

export const authRoutes = Router();

authRoutes.post("/auth/register", validate(registerSchema), authController.register);
authRoutes.post("/auth/otp/send", validate(sendOtpSchema), authController.sendOtp);
authRoutes.post("/auth/otp/verify", validate(verifyOtpSchema), authController.verifyOtp);
authRoutes.post("/auth/logout", authController.logout);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.patch("/me", requireAuth, validate(updateProfileSchema), authController.updateProfile);
