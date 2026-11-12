"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const slides = [
  {
    image: "/assets/catalogue/cake-wholewheat.jpg",
    title: "Fibre-rich treats,",
    accent: "delivered sharp sharp",
    body: "Cakes, chinchin, puff-puff and more — baked fresh for Lagos.",
  },
  {
    image: "/assets/catalogue/chinchin.jpg",
    title: "Snack jars & party packs",
    accent: "ready when you are",
    body: "Build your order in minutes. Pay securely. Track to your door.",
  },
  {
    image: "/assets/catalogue/cake-carrot.jpg",
    title: "Celebrate with Dripping Treats",
    accent: "tables that taste good",
    body: "Birthdays, boardrooms, dessert bars — Lagos & Ibadan when booked early.",
  },
];

export default function WelcomePage() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-[calc(24px+var(--safe-bottom))] pt-[calc(16px+var(--safe-top))]">
      <div className="mb-4 flex items-center justify-between">
        <BrandLogo size="sm" href={null} />
        <Link href="/" className="text-sm font-semibold text-tea">
          Skip
        </Link>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-[32px] bg-deep shadow-[var(--shadow-card)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.image}
            initial={{ opacity: 0.4, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0"
          >
            <Image src={slide.image} alt="" fill className="object-cover" sizes="100vw" unoptimized priority />
            <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/40 to-deep/10" />
          </motion.div>
        </AnimatePresence>

        <div className="relative flex h-full min-h-[48dvh] flex-col justify-end p-6 text-white md:min-h-[52dvh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-[34px] leading-[1.05] md:text-[40px]">
                {slide.title}{" "}
                <span className="text-honey">{slide.accent}</span>
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">{slide.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-7 bg-honey" : "w-1.5 bg-white/35")}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 space-y-2.5">
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
        <p className="pt-1 text-center text-[11px] text-deep/45">By continuing you agree to our Terms and Privacy Policy.</p>
      </div>
    </div>
  );
}
