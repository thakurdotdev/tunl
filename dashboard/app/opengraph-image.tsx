import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "tunl — Free SSH Reverse Tunnel Platform (tunl.online)";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          fontFamily: "sans-serif",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "38px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            <span style={{ color: "#10b981", marginRight: "8px", fontFamily: "monospace" }}>
              &gt;_
            </span>
            <span>tunl</span>
            <span style={{ color: "#71717a", marginLeft: "8px", fontSize: "28px" }}>
              .online
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: "24px",
            maxWidth: "920px",
          }}
        >
          Zero-Install OpenSSH Reverse Tunneling
        </div>

        <div
          style={{
            fontSize: "24px",
            color: "#a1a1aa",
            textAlign: "center",
            marginBottom: "40px",
            maxWidth: "820px",
          }}
        >
          Expose localhost web servers, APIs, and webhooks to the internet with standard OpenSSH.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "12px",
            padding: "16px 28px",
            fontFamily: "monospace",
            fontSize: "22px",
            color: "#34d399",
          }}
        >
          <span style={{ color: "#71717a" }}>$</span>
          <span>ssh -R 80:localhost:3000 -p 2222 tunl.online</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
