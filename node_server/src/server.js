require("dotenv").config({ quiet: true });

const { createApp } = require("./app");

const PORT = process.env.PORT || 5001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
