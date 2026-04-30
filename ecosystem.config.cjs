module.exports = {
  apps: [
    {
      name: "e-grievance-api",
      cwd: "./backend",
      script: "server.js",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
