import { Op, type WhereOptions } from "sequelize";
import { User, type UserAttributes, type UserRole } from "../models/User";
import { badRequest, conflict } from "../utils/errors";
import * as authService from "./auth.service";

export type ListUsersOpts = {
  role?: UserRole | "all";
  q?: string;
  limit?: number;
};

export async function listUsers(opts: ListUsersOpts = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const role = opts.role && opts.role !== "all" ? opts.role : undefined;
  const q = opts.q?.trim();

  const where: WhereOptions<UserAttributes> = {};
  if (role) Object.assign(where, { role });
  if (q) {
    Object.assign(where, {
      [Op.or]: [
        { fullName: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
        { phone: { [Op.iLike]: `%${q}%` } },
      ],
    });
  }

  const rows = await User.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
  });

  return rows.map((u) => u.toAdmin());
}

export async function listStaff(opts: { q?: string; limit?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const q = opts.q?.trim();

  const where: WhereOptions<UserAttributes> = {
    role: { [Op.in]: ["STAFF", "SUPER_ADMIN"] },
  };
  if (q) {
    Object.assign(where, {
      [Op.or]: [
        { fullName: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
        { phone: { [Op.iLike]: `%${q}%` } },
      ],
    });
  }

  const rows = await User.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
  });

  return rows.map((u) => u.toAdmin());
}

export async function inviteStaff(input: {
  email: string;
  fullName?: string;
  role?: "STAFF" | "SUPER_ADMIN";
}) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw badRequest("Enter a valid email");

  const role = input.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STAFF";
  const fullName = input.fullName?.trim() || email.split("@")[0] || "Admin";

  const existing = await User.findOne({ where: { email } });

  if (existing) {
    if (existing.role === "STAFF" || existing.role === "SUPER_ADMIN") {
      throw conflict("This email is already on the admin team");
    }
    existing.role = role;
    if (input.fullName?.trim()) existing.fullName = input.fullName.trim();
    await existing.save();

    await authService.sendOtp({
      contact: email,
      channel: "email",
      purpose: "login",
    });

    console.log(`[staff-invite] Upgraded ${email} to ${role}`);
    return { user: existing.toAdmin(), created: false, invited: true };
  }

  const user = await User.create({
    fullName,
    email,
    role,
    emailVerified: false,
  });

  await authService.sendOtp({
    contact: email,
    channel: "email",
    purpose: "login",
  });

  console.log(`[staff-invite] Created ${email} as ${role}`);
  return { user: user.toAdmin(), created: true, invited: true };
}
