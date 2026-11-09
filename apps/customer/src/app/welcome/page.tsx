"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";

const floaters = [
  { src: "/assets/placeholders/category-cakes.svg", className: "left-[5%] top-[7%] w-[23%]", rot: -10, delay: 0.1 },
  { src: "/assets/placeholders/category-doughnuts.svg", className: "right-[7%] top-[5%] w-[20%]", rot: 12, delay: 0.2 },
  { src: "/assets/placeholders/category-chinchin.svg", className: "left-[9%] bottom-[6%] w-[19%]", rot: 8, delay: 0.3 },
  { src: "/assets/placeholders/category-meat-pies.svg", className: "right-[5%] bottom-[8%] w-[24%]", rot: -8, delay: 0.4 },
];

export default function WelcomePage() {
  return (
    <div className="flex min-h-dvh flex-col px-5 pb-[calc(24px+var(--safe-bottom))] pt-[calc(16px+var(--safe-top))]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex min-h-[46dvh] flex-1 items-center justify-center overflow-hidden rounded-[36px] bg-hero shadow-[var(--shadow-card)]"
      >
        {floaters.map((f, i) => (
          <motion.div
            key={f.src}
            initial={{ opacity: 0, y: 30, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: f.rot }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: f.delay }}
            className={`absolute ${f.className}`}
          >
            <div className="animate-float" style={{ animationDelay: `${i * 0.8}s` }}>
              <div className="relative aspect-square overflow-hidden rounded-[24px] shadow-[var(--shadow-float)] ring-4 ring-white/70">
                <Image src={f.src} alt="" fill className="object-cover" sizes="160px" unoptimized priority />
              </div>
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.5 }}
          className="relative"
        >
          <BrandLogo size="hero" href={null} />
        </motion.div>
      </motion.div>

      <div className="pt-7">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-tea"
        >
          Sweet, with substance
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-2 font-display text-[38px] leading-[1.05] text-deep"
        >
          Fibre-rich treats, delivered sharp sharp.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-3 text-sm leading-relaxed text-deep/65"
        >
          Cakes, meat pies, chinchin and more, delivered in Lagos — plus catering for celebrations, including Ibadan when booked early.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-7 space-y-2.5"
        >
          <Link href="/verify?returnTo=/" className="block">
            <Button fullWidth variant="dark" rightIcon={<ArrowRight size={18} />}>
              Get started
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="tertiary" fullWidth>
              Continue as guest
            </Button>
          </Link>
          <p className="pt-2 text-center text-[11px] text-deep/45">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
