import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "12px 12px 11px",
          gap: 5,
        }}
      >
        {/* Three ascending bars */}
        <div style={{ width: 11, height: 16, background: "rgba(255,255,255,0.55)", borderRadius: 3 }} />
        <div style={{ width: 11, height: 24, background: "rgba(255,255,255,0.78)", borderRadius: 3 }} />
        <div style={{ width: 11, height: 34, background: "white", borderRadius: 3 }} />
      </div>
    ),
    { ...size }
  );
}
