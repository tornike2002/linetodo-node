import http from "http";
import dotenv from "dotenv";
import { handleTasksRoutes } from "./routes/tasks.js";
import { handleAuthRoutes } from "./routes/auth.js";
import { authenticate } from "./middleware/authMiddleware.js";
import { connectDB } from "./db/db.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { logInfo } from "./utils/logger.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/auth")) {
      rateLimiter(
        req,
        res,
        () => handleAuthRoutes(req, res),
        2,
        15 * 60 * 1000
      );
    } else {
      rateLimiter(
        req,
        res,
        () => {
          authenticate(req, res, () => {
            logInfo(`User ${req.user.username} accessed ${req.url}`);
            handleTasksRoutes(req, res);
          });
        },
        2,
        60 * 1000
      );
    }
  });

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((err) => console.error("Failed to start server", err));
