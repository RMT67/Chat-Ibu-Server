const app = require("../app");

// Prefer PORT from environment (used by AWS/EB/containers); fallback to 3000 for local dev
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on Port:${PORT}`);
});
