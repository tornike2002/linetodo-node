import { ObjectId } from "mongodb";
import { getDB } from "../db/db.js";

export async function handleTasksRoutes(req, res) {
  const db = await getDB();
  const tasksCollection = db.collection("tasks");
  if (req.method === "GET" && req.url.startsWith("/tasks")) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      const completed = url.searchParams.get("completed");
      const priority = url.searchParams.get("priority");

      const filter = {};
      if (completed !== null) {
        filter.completed = completed === "true";
      }
      if (priority) {
        filter.priority = priority;
      }

      const tasks = await tasksCollection.find(filter).toArray();

      if (tasks.length === 0) {
        res.writeHead(404, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "No tasks found" }));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      });
      res.end(JSON.stringify(tasks));
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          message: "Internal Server Error",
          error: error.message,
        })
      );
    }
  } else if (req.method === "POST" && req.url === "/tasks") {
    let body = "";
    req.on("data", (chunck) => {
      body += chunck;
    });
    req.on("end", async () => {
      try {
        const newTask = JSON.parse(body);

        if (!newTask.title || !newTask.description) {
          res.writeHead(400, {
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({ message: "Title and description are required" })
          );
          return;
        }

        const result = await tasksCollection.insertOne(newTask);
        res.writeHead(201, {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        });
        res.end(
          JSON.stringify({
            message: "Task created successfully",
            taskID: result.insertedId,
          })
        );
      } catch (error) {
        res.writeHead(400, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            message: "Invalid data format",
            error: error.message,
          })
        );
      }
    });
  } else if (req.method.startsWith("DELETE") && req.url.startsWith("/tasks/")) {
    try {
      const taskId = req.url.split("/tasks/")[1];
      if (!ObjectId.isValid(taskId)) {
        res.writeHead(400, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "Invalid task ID" }));
        return;
      }

      const result = await tasksCollection.deleteOne({
        _id: new ObjectId(taskId),
      });

      if (result.deletedCount > 0) {
        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "Task deleted successfully" }));
        return;
      }
      res.writeHead(404, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ message: "Task not found" }));
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          message: "Internal Server Error",
          error: error.message,
        })
      );
    }
  } else if (req.method.startsWith("PATCH") && req.url.startsWith("/tasks/")) {
    const taskId = req.url.split("/")[2];
    if (!ObjectId.isValid(taskId)) {
      res.writeHead(400, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ message: "Invalid task ID" }));

      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const updates = JSON.parse(body);
        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(taskId) },
          { $set: updates }
        );
        if (result.matchedCount === 0) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "Task not found" }));
          return;
        } else {
          res.writeHead(200, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "Task updated successfully" }));
        }
      } catch (error) {
        res.writeHead(500, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            message: "Internal Server Error",
            error: error.message,
          })
        );
      }
    });
  } else {
    res.writeHead(404, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ message: "Route not found" }));
  }
}
