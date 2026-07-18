// health.go: /health (liveness), /ready (readiness), /metrics (Prometheus).
// Metrics read ActiveCount/AnonymousCount/ReservedCount from the registry
// directly rather than maintaining duplicate counters. See plan step 9.
package health

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
)

func NewHandler(reg registry.TunnelRegistry) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		// TODO: once controlclient has a real health check, gate readiness
		// on the control plane being reachable too.
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ready"))
	})

	reg2 := prometheus.NewRegistry()
	reg2.MustRegister(
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "tunnels_active_total",
			Help: "Currently registered tunnels (anonymous + reserved).",
		}, func() float64 { return float64(reg.ActiveCount()) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "tunnels_anonymous_total",
			Help: "Currently registered anonymous tunnels.",
		}, func() float64 { return float64(reg.AnonymousCount()) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "tunnels_reserved_total",
			Help: "Currently registered reserved (authenticated) tunnels.",
		}, func() float64 { return float64(reg.ReservedCount()) }),
		// TODO: add connection/byte counters (plan step 9) once
		// httpproxy/sshserver expose hooks to increment them.
	)
	mux.Handle("/metrics", promhttp.HandlerFor(reg2, promhttp.HandlerOpts{}))

	return mux
}
