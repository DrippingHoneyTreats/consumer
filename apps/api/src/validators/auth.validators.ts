import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(3).max(160),
  channel: z.enum(["sms", "email", "whatsapp"]).default("sms"),
  consent: z.boolean().optional(),
});

export const sendOtpSchema = z.object({
  contact: z.string().trim().min(3).max(160),
  channel: z.enum(["sms", "email", "whatsapp"]).default("sms"),
  purpose: z.string().trim().min(1).max(40).default("register"),
});

export const verifyOtpSchema = z.object({
  contact: z.string().trim().min(3).max(160),
  code: z.string().trim().min(4).max(8),
});
