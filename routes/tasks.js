import { ObjectId } from "mongodb";
import { getDB } from "../db/db.js";
import { getCache, setCache, invalidateCache } from "../utils/cache.js";

export async function handleTasksRoutes(req, res) {
  const db = await getDB();
  const tasksCollection = db.collection("tasks");
  if (req.method === "GET" && req.url.startsWith("/tasks")) {
    try {
      const urlParams = new URL(req, url, `http://${req.headers.host}`);
      const sortOrder = urlParams.searchParams.get("sort") === "asc" ? 1 : -1;
      const cacheKey = `tasks_${req.user.userId}_sort_${sortOrder}`;
      const cachedTasks = getCache(cacheKey);

      if (cachedTasks) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        });
        res.end(JSON.stringify(cachedTasks));
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);

      const completed = url.searchParams.get("completed");
      const priority = url.searchParams.get("priority");

      const filter =
        req.user.role === "admin" ? {} : { userId: req.user.userId };

      if (completed !== null) {
        filter.completed = completed === "true";
      }
      if (priority) {
        filter.priority = priority;
      }
      if (
        urlParams.searchParams.has("startDate") ||
        urlParams.searchParams.has("endDate")
      ) {
        filter.createdAt = {};

        if (urlParams.searchParams.has("startDate")) {
          filter.createdAt.$gte = new Date(
            urlParams.searchParams.get("startDate")
          );
        }

        if (urlParams.searchParams.has("endDate")) {
          filter.createdAt.$lte = new Date(
            urlParams.searchParams.get("endDate")
          );
        }
      }

      const tasks = await tasksCollection
        .find(filter)
        .project({
          task: 1,
          completed: 1,
          priority: 1,
          createdAt: 1,
        })
        .sort({ createdAt: sortOrder })
        .toArray();
      setCache(cacheKey, tasks, 60);
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

        if (!newTask.title) {
          throw new Error("Task is required");
        }
        newTask.userId = req.user.userId;
        newTask.createdAt = new Date();
        newTask.completed = false;
        const result = await tasksCollection.insertOne(newTask);
        invalidateCache(`tasks_${req.user.userId}`);
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

      const filter =
        req.user.role === "admin"
          ? { _id: new ObjectId(taskId) }
          : { _id: new ObjectId(taskId), userId: req.user.userId };

      const result = await tasksCollection.deleteOne(filter);

      if (result.deletedCount > 0) {
        invalidateCache(`tasks_${req.user.userId}`);
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
        const filter =
          req.user.role === "admin"
            ? { _id: new ObjectId(taskId) }
            : { _id: new ObjectId(taskId), userId: req.user.userId };
        const result = await tasksCollection.updateOne(filter, {
          $set: updates,
        });
        if (result.matchedCount === 0) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "Task not found" }));
          return;
        } else {
          invalidateCache(`tasks_${req.user.userId}`);
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
