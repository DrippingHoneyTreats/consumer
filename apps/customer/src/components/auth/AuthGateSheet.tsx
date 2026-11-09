"use client";

import Link from "next/link";
import Image from "next/image";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { LOGO } from "@/lib/placeholders";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  returnTo?: string;
};

export function AuthGateSheet({
  open,
  onClose,
  title = "Sign in to continue",
  message = "Sign in to checkout and book events.",
  returnTo,
}: Props) {
  const verifyHref = returnTo
    ? `/verify?returnTo=${encodeURIComponent(returnTo)}`
    : "/verify";

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="mb-6 space-y-3 rounded-[24px] bg-deep p-4">
        <Image
          src={LOGO}
          alt="Dripping Honey Treats"
          width={180}
          height={72}
          unoptimized
          className="h-12 w-auto object-contain"
        />
        <p className="text-sm leading-relaxed text-white/80">{message}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Link href={verifyHref} onClick={onClose}>
          <Button fullWidth variant="dark">
            Get started
          </Button>
        </Link>
        <Button variant="ghost" fullWidth onClick={onClose}>
          Maybe later
        </Button>
      </div>
    </BottomSheet>
  );
}
