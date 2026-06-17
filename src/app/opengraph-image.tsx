import { ImageResponse } from "next/og";

export const alt = "Watcher — website monitoring with Telegram alerts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b1220 0%, #0a0a0a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "96px",
              height: "96px",
              borderRadius: "24px",
              background: "#2563eb",
              fontSize: "56px",
              fontWeight: 700,
            }}
          >
            W
          </div>
          <div style={{ fontSize: "64px", fontWeight: 700 }}>Watcher</div>
        </div>

        <div style={{ marginTop: "40px", fontSize: "52px", fontWeight: 700, lineHeight: 1.1 }}>
          Know first when a website changes
        </div>
        <div style={{ marginTop: "24px", fontSize: "30px", color: "#94a3b8" }}>
          Prices · crypto & rates · any element — alerts in Telegram
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "48px" }}>
          {["💰 Price", "📈 Crypto / rates", "⚙️ Selector"].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "14px 26px",
                borderRadius: "999px",
                border: "1px solid #1e293b",
                background: "#0f172a",
                fontSize: "28px",
                color: "#cbd5e1",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
