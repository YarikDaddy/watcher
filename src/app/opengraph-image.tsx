import { ImageResponse } from "next/og";

export const alt = "Watcher — know before your client does";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Мини-полоса аптайма для превью: почти всё зелёное, один жёлтый и один красный день.
const BARS = Array.from({ length: 46 }, (_, i) => (i === 17 ? "#ffb340" : i === 33 ? "#ff6961" : "#30d158"));

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
          background: "#000000",
          color: "#f5f5f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#f5f5f7",
              color: "#000",
              fontSize: "42px",
              fontWeight: 700,
            }}
          >
            W
          </div>
          <div style={{ fontSize: "44px", fontWeight: 600 }}>Watcher</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "88px", fontWeight: 700, lineHeight: 1.02, letterSpacing: "-3px" }}>
            Know before your client does.
          </div>
          <div style={{ marginTop: "24px", fontSize: "32px", color: "#a1a1a6" }}>
            Uptime · SSL · domains — Telegram alerts & branded status pages for web studios
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", height: "44px" }}>
          {BARS.map((c, i) => (
            <div key={i} style={{ display: "flex", flex: 1, borderRadius: "4px", background: c }} />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
