function handleGetTasks(req, res) {
    if (req.url === "/tasks" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      });
  
      res.end(JSON.stringify({ message: "Successfully fetched your tasks" }));
      return; 
    }
  }
  
  function handlePostTask(req, res) {
    if (req.url === "/tasks" && req.method === "POST") {
      let body = "";
  
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
  
      req.on("end", () => {
        try {
          const task = JSON.parse(body);
          res.writeHead(201, {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          });
          res.end(JSON.stringify({ message: "Task added successfully", task }));
        } catch (error) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON format" }));
        }
      });
  
      return; 
    }
  
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
  
  export default { handleGetTasks, handlePostTask }; 
  