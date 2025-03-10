import http from "http";
import dotenv from "dotenv";
import taskRoutes from "./routes/tasks.js";

dotenv.config();

const port = process.env.PORT || 3000;


const server = http.createServer((req, res) => {
  if (req.url === "/tasks" && req.method === "GET") {
    return taskRoutes.handleGetTasks(req, res);
  }


  if (req.url === "/tasks" && req.method === "POST") {
    return taskRoutes.handlePostTask(req, res);
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: `Server is running on port ${port}` }));
});

server.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
