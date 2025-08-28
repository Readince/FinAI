export default {
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
};

