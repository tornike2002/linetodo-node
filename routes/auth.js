import { getDB } from "../db/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

export async function handleAuthRoutes(req, res) {
  const db = await getDB();
  const userCollection = db.collection("users");

  if (req.method === "POST" && req.url === "/auth/register") {
    let body = "";
    req.on("data", (chunck) => {
      body += chunck.toString();
    });
    req.on("end", async () => {
      try {
        const { username, password, email, phone } = JSON.parse(body);
        if (!username || !password || !email || !phone) {
          throw new Error("All the fields are required");
        }
        const extinguishUser = await userCollection.findOne({ email });

        if (extinguishUser) {
          res.writeHead(400, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "User already exists" }));
          return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await userCollection.insertOne({
          username,
          email,
          password: hashedPassword,
          phone,
        });
        res.writeHead(201, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            message: "User created",
            userId: result.insertedId,
          })
        );
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
  } else if (req.method === "POST" && req.url === "/auth/login") {
    let body = "";
    req.on("data", (chunck) => {
      body += chunck.toString();
    });
    req.on("end", async () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          throw new Error("All the fields are required");
        }

        const user = await userCollection.findOne({ username });

        if (!user) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "User not found" }));
          return;
        }
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
          res.writeHead(401, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "Invalid Credentials" }));
          return;
        }
        const token = jwt.sign(
          { userId: user._id, username: user.username },
          SECRET_KEY,
          {
            expiresIn: "1h",
          }
        );

        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ token }));
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
  }
}
