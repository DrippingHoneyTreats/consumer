export type Role = "CUSTOMER" | "STAFF" | "SUPER_ADMIN";

export type User = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  role: Role;
  avatar?: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  sort?: number;
};

export type ItemVariant = {
  id: string;
  name: string;
  price: number;
};

export type Item = {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  images: string[];
  basePrice: number;
  status: "available" | "few_left" | "sold_out" | "pre_order";
  maxQty: number;
  leadTimeHours?: number | null;
  variants?: ItemVariant[];
};

export type Banner = {
  id: string;
  title: string;
  /** Short line under the title on the customer promo card */
  subtitle?: string | null;
  /** Longer promo copy (admin-managed) */
  description?: string | null;
  image: string;
  ctaType?: string;
  ctaTarget?: string | null;
  ctaLabel?: string | null;
};

export type OrderItem = {
  id: string;
  itemId: string;
  variantId?: string | null;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
  note?: string | null;
  item?: Item;
};

export type Order = {
  id: string;
  orderNo: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  notes?: string | null;
  scheduledFor?: string | null;
  addressSnapshot?: Record<string, unknown> | null;
  distanceKm?: number | null;
  items: OrderItem[];
  createdAt: string;
  delivery?: {
    riderName?: string | null;
    riderPhone?: string | null;
    etaMinutes?: number | null;
  } | null;
  statusLogs?: { status: string; createdAt: string; note?: string | null }[];
};

export type Address = {
  id: string;
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  landmark?: string | null;
  note?: string | null;
  contactPhone?: string | null;
  isDefault: boolean;
};

export type EventType = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  includes: string[];
};

export type EventRequest = {
  id: string;
  refNo: string;
  type: string;
  title?: string | null;
  date: string;
  time: string;
  city: string;
  venueAddress: string;
  guests: number;
  budget?: number | null;
  services: string[];
  notes?: string | null;
  status: string;
  quoteAmount?: number | null;
  quoteNote?: string | null;
  quoteLink?: string | null;
};

export type HomePayload = {
  banners: Banner[];
  categories: Category[];
  settings?: {
    pauseOrders?: boolean;
    operatingHours?: unknown;
    whatsappNumber?: string | null;
  };
};

export type Paginated<T> = {
  data: T[];
  meta?: { page: number; limit: number; total: number };
};

export type AdminListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type AdminOrderRow = Order & {
  user?: { id: string; fullName: string; phone?: string | null };
};

export type Promo = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder?: number | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  active?: boolean;
};

export type AdminBanner = Banner & {
  startAt?: string | null;
  endAt?: string | null;
  priority?: number;
  active?: boolean;
};

export type AdminCategory = Category & { active?: boolean };

export type AdminSettings = {
  kitchenLat?: number | null;
  kitchenLng?: number | null;
  kitchenAddress?: string | null;
  baseFee?: number | null;
  freeKm?: number | null;
  perKmRate?: number | null;
  minFee?: number | null;
  maxFee?: number | null;
  maxRadiusKm?: number | null;
  freeDeliveryThreshold?: number | null;
  pauseOrders?: boolean;
  operatingHours?: Record<string, unknown> | null;
  minEventLeadDays?: number | null;
  whatsappNumber?: string | null;
  supportPhone?: string | null;
};

export type AdminCustomer = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  _count?: { orders: number };
};

export type ReportsSummary = {
  ordersToday: number;
  revenueTodayKobo: number;
  ordersByStatus: { status: string; _count: { _all: number } }[];
  topItems: { itemId: string; _sum: { qty: number | null } }[];
  averageDeliveryDistanceKm: number;
  eventLeadsByCity: { city: string; _count: { _all: number } }[];
};
