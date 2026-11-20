import {
  Bike,
  CalendarHeart,
  ChefHat,
  Clock,
  CreditCard,
  Heart,
  Leaf,
  MapPin,
  MessageCircle,
  Palette,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  Wheat,
} from "lucide-react";
import type { Feature, Step } from "./Editorial";

export const ORDER_STEPS: Step[] = [
  { title: "Pick your treats", text: "Browse the menu and add what you're craving to your order.", icon: ShoppingBag },
  { title: "Pickup or delivery", text: "Collect from us, or we deliver anywhere in Lagos.", icon: Bike },
  { title: "Pay securely", text: "Card, bank transfer or USSD. Quick and safe.", icon: CreditCard },
  { title: "We bake & deliver", text: "Fresh from the oven, with updates on WhatsApp.", icon: ChefHat },
];

export const EVENT_STEPS: Step[] = [
  { title: "Choose a package", text: "Birthdays, hangouts, dessert bars: pick the vibe you love.", icon: Sparkles },
  { title: "Date & venue", text: "Tell us when, where and roughly how many guests.", icon: CalendarHeart },
  { title: "Get your quote", text: "We send a tailored quote on WhatsApp, usually same day.", icon: MessageCircle },
  { title: "We set up", text: "We style the table on the day. You enjoy the party.", icon: PartyPopper },
];

export const WHY_PASTRIES: Feature[] = [
  { title: "Fibre-rich recipes", text: "Whole grains and real fibre in every bite.", icon: Wheat },
  { title: "Baked fresh daily", text: "Small batches, so nothing sits on a shelf.", icon: Leaf },
  { title: "Made by hand", text: "Every treat is shaped and finished with care.", icon: Heart },
  { title: "Lagos delivery", text: "From our kitchen to your door, or pick up.", icon: Truck },
  { title: "Order in minutes", text: "Add to your order, pay, and you're done.", icon: Clock },
  { title: "WhatsApp updates", text: "We message you as your order moves.", icon: MessageCircle },
];

export const WHY_EVENTS: Feature[] = [
  { title: "Styled dessert tables", text: "Beautiful set-ups that match your theme.", icon: Palette },
  { title: "Treats guests love", text: "Fibre-rich pastries that taste as good as they look.", icon: Heart },
  { title: "Any size of party", text: "Intimate hangouts to big celebrations.", icon: Users },
  { title: "On time, every time", text: "We arrive early and set up before guests do.", icon: Clock },
  { title: "Lagos & Ibadan", text: "We bring the sweetness to your venue.", icon: MapPin },
  { title: "Easy planning", text: "Everything sorted with you on WhatsApp.", icon: MessageCircle },
];

export const TRUST_WORDS = ["Fresh daily", "Fibre-rich", "Handmade in Lagos", "Small batches", "Dessert tables", "Lagos delivery"];
