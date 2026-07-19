import { Logo } from "@/components/logo";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-logo">
            <Logo />
          </div>
          {children}
        </div>
      </div>
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-terminal">
            <div className="auth-terminal-bar">
              <span className="auth-terminal-dot" />
              <span className="auth-terminal-dot" />
              <span className="auth-terminal-dot" />
            </div>
            <pre className="auth-terminal-body">
              <code>
                <span className="auth-terminal-prompt">$</span>{" "}
                <span className="auth-terminal-cmd">ssh</span> -R 80:localhost:3000 myapp@thakur.dev
                {"\n"}
                <span className="auth-terminal-output">→ https://myapp.thakur.dev</span>
                {"\n"}
                <span className="auth-terminal-muted">
                  Forwarding HTTP traffic to localhost:3000
                </span>
              </code>
            </pre>
          </div>
          <div className="auth-brand-text">
            <h2>Expose localhost in one command</h2>
            <p>
              No binaries, no configuration. Run a single SSH command and your local server is live
              on the internet with a public URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
