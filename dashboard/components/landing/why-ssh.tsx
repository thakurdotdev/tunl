export function WhySsh() {
  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <h2 className="text-foreground mb-3 text-xl font-bold tracking-tight sm:text-2xl">
          Standard SSH. Nothing extra.
        </h2>
        <p className="text-muted-foreground mb-10 max-w-lg text-sm leading-relaxed">
          Most tunneling utilities require installing a custom CLI agent. tunl relies on the
          standard OpenSSH client already installed on your system.
        </p>

        <div className="grid gap-12 md:grid-cols-2 md:gap-10">
          {/* What you don't need */}
          <div>
            <h3 className="text-muted-foreground mb-5 font-mono text-[11px] font-medium tracking-wider uppercase">
              No proprietary client stack
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                "No CLI binary to download",
                "No background daemon process",
                "No API tokens for basic tunneling",
                "No local configuration files",
                "No custom package manager updates",
              ].map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground/60 decoration-border/60 text-sm leading-snug line-through"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What you already have */}
          <div>
            <h3 className="text-muted-foreground mb-5 font-mono text-[11px] font-medium tracking-wider uppercase">
              Native system capabilities
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                "OpenSSH preinstalled on macOS, Linux, and Windows 10/11",
                "Ed25519 & RSA public key authentication",
                "Encrypted SSH transport layer",
                "Outbound client connection over TCP port 2222",
                "Standard OpenSSH port forwarding syntax",
              ].map((item) => (
                <li key={item} className="text-foreground text-sm leading-snug">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
