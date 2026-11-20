import { ImageResponse } from "next/og";

export const alt = "Dripping Honey Treats: fibre-rich pastries baked fresh in Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded preview shown when the site is shared on WhatsApp, X, Facebook, LinkedIn… */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #3F5F46 0%, #2c4532 60%, #23382a 100%)",
          color: "#F7F3EE",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, color: "#F3E2B0", textTransform: "uppercase" }}>
          Lekki · Lagos
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 1.05, fontWeight: 700 }}>Dripping Honey Treats</div>
          <div style={{ marginTop: 22, fontSize: 40, color: "#F6D5D0" }}>Fibre-rich chinchin, wheat cakes & puff-puff</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30 }}>
          <span>Pickup or delivery across Lagos · Dessert tables for events</span>
          <span style={{ color: "#D4A017", fontWeight: 700 }}>drippinghoneytreats.com</span>
        </div>
      </div>
    ),
    size,
  );
}
