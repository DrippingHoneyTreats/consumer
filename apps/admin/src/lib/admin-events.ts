/** Event request as the admin API returns it. */
export type AdminEvent = {
  id: string;
  refNo: string;
  type: string;
  title?: string | null;
  date: string;
  time?: string;
  city: string;
  venueAddress?: string;
  guests: number;
  budget?: number | null;
  notes?: string | null;
  status: string;
  quoteAmount?: number | null;
  quoteNote?: string | null;
  quoteLink?: string | null;
  createdAt: string;
  user?: { id: string; fullName?: string | null; phone?: string | null; email?: string | null };
};

export const EVENT_STATUSES = ["submitted", "reviewing", "quote_sent", "confirmed", "completed", "cancelled"] as const;
