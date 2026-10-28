import Link from "next/link";

export function LandingFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <a className="logo" href="#top">
              <span className="p">&gt;_</span>tunl
            </a>
            <p>
              Expose localhost web servers to the internet via standard OpenSSH. No CLI download
              required.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link href="/keys">SSH keys</Link>
              </li>
              <li>
                <Link href="/inspect">Inspect tunnels</Link>
              </li>
              <li>
                <a href="#compare">Comparison</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Developer</h4>
            <ul>
              <li>
                <a href="https://thakur.dev" target="_blank" rel="noopener noreferrer">
                  Pankaj Thakur
                </a>
              </li>
              <li>
                <a href="https://github.com/thakurdotdev" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://x.com/thakurdotdev" target="_blank" rel="noopener noreferrer">
                  X
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="legal">
          © {new Date().getFullYear()} tunl. Designed and built by{" "}
          <a href="https://thakur.dev" target="_blank" rel="noopener noreferrer">
            Pankaj Thakur
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
