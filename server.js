import http from "http";
import dotenv from "dotenv";
import { handleTasksRoutes } from "./routes/tasks.js";
import { handleAuthRoutes } from "./routes/auth.js";
import { authenticate } from "./middleware/authMiddleware.js";
import { connectDB } from "./db/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/auth")) {
      handleAuthRoutes(req, res);
    } else {
      authenticate(req, res, () => {
        handleTasksRoutes(req, res);
      });
    }
  });

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((err) => console.error("Failed to start server", err));
