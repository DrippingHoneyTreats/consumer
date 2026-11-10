"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { LOGO } from "@/lib/placeholders";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";

const PREVIEW_ADMIN: User = {
  id: "local-admin",
  fullName: "Admin",
  role: "SUPER_ADMIN",
  email: "admin@drippinghoneytreats.com",
};

/** Temporary open login — no OTP validation while we polish the admin UI. */
export default function AdminLoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const enterDashboard = () => {
    setUser(PREVIEW_ADMIN);
    router.replace("/catalogue");
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-deep/10 bg-white p-8 shadow-[var(--shadow-soft)]">
      <div className="mb-6 overflow-hidden rounded-2xl bg-deep px-4 py-5">
        <Image
          src={LOGO}
          alt="Dripping Honey Treats"
          width={220}
          height={88}
          unoptimized
          priority
          className="mx-auto h-14 w-auto object-contain"
        />
      </div>
      <p className="font-display text-2xl font-semibold text-deep">Admin dashboard</p>
      <p className="mt-1 text-sm text-deep/60">Preview the kitchen & ops UI.</p>

      <div className="mt-6">
        <Button fullWidth onClick={enterDashboard}>
          Enter dashboard
        </Button>
      </div>
    </div>
  );
}
