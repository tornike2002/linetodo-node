import http from "http";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello World");
});

server.listen(port, () => {
  console.log(`Server is listening on http:localhost:${port}`);
});
