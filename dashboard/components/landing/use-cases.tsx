export function UseCases() {
  const cases = [
    {
      title: "Webhook development",
      description:
        "Receive Stripe, GitHub, or Shopify callbacks on localhost. Avoid manual deployments during integration testing.",
      command: "ssh -R 80:localhost:3000 -p 2222 tunl.online",
    },
    {
      title: "Share work in progress",
      description:
        "Share a live HTTPS endpoint with teammates or clients directly from your local development build.",
    },
    {
      title: "Mobile app testing",
      description:
        "Connect physical mobile devices to local API servers running on your development workstation.",
    },
    {
      title: "OAuth callback development",
      description:
        "Configure OAuth provider redirect URIs to a tunl HTTPS domain during local authentication development.",
    },
    {
      title: "Staging demos",
      description:
        "Demonstrate feature prototypes and dynamic UI state without deploying to temporary cloud servers.",
    },
    {
      title: "Remote device & IoT testing",
      description:
        "Test webhooks and remote HTTP requests from embedded hardware or IoT devices against localhost.",
    },
  ];

  return (
    <section id="use-cases" className="py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <h2 className="text-foreground mb-3 text-xl font-bold tracking-tight sm:text-2xl">
          Use Cases
        </h2>
        <p className="text-muted-foreground mb-10 max-w-lg text-sm leading-relaxed">
          Practical developer workflows where exposing localhost to the internet is required.
        </p>

        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <div key={c.title} className="flex flex-col gap-1.5">
              <h3 className="text-foreground text-sm font-semibold">{c.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{c.description}</p>
              {c.command && (
                <code className="text-muted-foreground mt-1 font-mono text-[11px] font-medium select-all">
                  $ {c.command}
                </code>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
