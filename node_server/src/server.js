require("dotenv").config({ quiet: true });

const http = require("http");
const { createApp } = require("./app");
const { setupSocketServer } = require("./realtime/socket");

const PORT = process.env.PORT || 5001;
const app = createApp();
const server = http.createServer(app);

setupSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
