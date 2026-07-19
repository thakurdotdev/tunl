module.exports = {
  apps: [
    {
      name: "tunl-control-plane",
      cwd: "./control-plane",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3091,
      },
    },
    {
      name: "tunl-dashboard",
      cwd: "./dashboard",
      script: "pnpm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3090,
      },
    },
    {
      name: "tunl-tunnel-server",
      cwd: "./tunnel-server",
      script: "./bin/tunneld",
      env: {
        NODE_ENV: "production",
        HTTP_LISTEN_ADDR: ":8088",
        SSH_LISTEN_ADDR: ":2222",
        HEALTH_LISTEN_ADDR: ":9090",
        CONTROL_PLANE_URL: "http://127.0.0.1:3091",
      },
    },
  ],
};
