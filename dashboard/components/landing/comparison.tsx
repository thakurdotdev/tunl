type Cell = { kind: "y" | "n" | "t"; text: string };

const ROWS: {
  feature: string;
  note?: string;
  tunl: Cell;
  ngrok: Cell;
  cloudflare: Cell;
}[] = [
  {
    feature: "Runs on the OpenSSH you already have",
    note: "No agent or binary to install",
    tunl: { kind: "y", text: "Yes" },
    ngrok: { kind: "y", text: "Via SSH mode*" },
    cloudflare: { kind: "n", text: "Needs cloudflared" },
  },
  {
    feature: "No account for a first tunnel",
    note: "Run a tunnel before signing up",
    tunl: { kind: "y", text: "Yes" },
    ngrok: { kind: "n", text: "Account required" },
    cloudflare: { kind: "t", text: "Quick Tunnels only" },
  },
  {
    feature: "SSH key authentication",
    note: "Ed25519 and RSA public keys",
    tunl: { kind: "y", text: "Yes" },
    ngrok: { kind: "y", text: "In SSH mode*" },
    cloudflare: { kind: "n", text: "Login or token" },
  },
  {
    feature: "Automatic HTTPS and TLS",
    tunl: { kind: "y", text: "Yes" },
    ngrok: { kind: "y", text: "Yes" },
    cloudflare: { kind: "y", text: "Yes" },
  },
  {
    feature: "Persistent subdomain",
    note: "A fixed name that survives restarts",
    tunl: { kind: "t", text: "Free in preview, tied to your SSH key" },
    ngrok: { kind: "t", text: "1 free dev domain with an account" },
    cloudflare: { kind: "t", text: "Needs a domain on Cloudflare DNS" },
  },
  {
    feature: "WebSocket and SSE upgrades",
    tunl: { kind: "y", text: "Yes" },
    ngrok: { kind: "y", text: "Yes" },
    cloudflare: { kind: "y", text: "Yes" },
  },
  {
    feature: "Request inspection in a web UI",
    note: "Headers, payloads, status and latency",
    tunl: { kind: "y", text: "Yes" },
    ngrok: { kind: "y", text: "Yes" },
    cloudflare: { kind: "t", text: "Audit logs" },
  },
  {
    feature: "Custom domains",
    tunl: { kind: "t", text: "In development" },
    ngrok: { kind: "t", text: "Paid plans" },
    cloudflare: { kind: "y", text: "Via Cloudflare DNS" },
  },
  {
    feature: "TCP forwarding",
    tunl: { kind: "t", text: "In development" },
    ngrok: { kind: "y", text: "Yes" },
    cloudflare: { kind: "y", text: "Yes" },
  },
];

function CellValue({ cell }: { cell: Cell }) {
  return <span className={`v ${cell.kind}`}>{cell.text}</span>;
}

export function Comparison() {
  return (
    <section className="sec band" id="compare" aria-labelledby="compare-heading">
      <div className="wrap">
        <div className="head">
          <h2 id="compare-heading">tunl next to the tools you may use now.</h2>
          <p>
            A side by side with ngrok and Cloudflare Tunnel, including where tunl is still catching
            up.
          </p>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th className="me">tunl</th>
                <th>ngrok</th>
                <th>Cloudflare Tunnel</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature}>
                  <td>
                    {row.feature}
                    {row.note ? <small>{row.note}</small> : null}
                  </td>
                  <td className="me">
                    <CellValue cell={row.tunl} />
                  </td>
                  <td>
                    <CellValue cell={row.ngrok} />
                  </td>
                  <td>
                    <CellValue cell={row.cloudflare} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fn">
          * ngrok&apos;s SSH mode needs an ngrok account and an uploaded public key, and has
          limitations compared with the ngrok agent. Based on each project&apos;s public
          documentation, October 2026.
        </p>
      </div>
    </section>
  );
}
