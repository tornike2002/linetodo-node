import { getDB } from "../db/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendResetEmail } from "../utils/email.js";

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
  } else if (req.method === "POST" && req.url === "/auth/request-reset") {
    let body = "";
    req.on("data", (chunck) => {
      body += chunck.toString();
    });
    req.on("end", async () => {
      try {
        const { email } = JSON.parse(body);

        if (!email) {
          throw new Error("Email is required");
        }

        const user = await userCollection.findOne({ email });

        if (!user) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "User not found" }));
          return;
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = Date.now() + 3600000;

        await userCollection.update(
          { email },
          { $set: { resetToken, resetTokenExpiry } }
        );

        await sendResetEmail(email, resetToken);

        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "Reset email sent Successfuly" }));
      } catch (error) {
        res.writeHead(500, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            message: error.message,
          })
        );
      }
    });
  } else if (
    req.method === "POST" &&
    req.url.startsWith("/auth/reset-password")
  ) {
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const token = urlParams.searchParams.get("token");
    let body = "";
    req.on("data", (chunck) => {
      body += chunck.toString();
    });

    req.on("end", async () => {
      try {
        const { newPassword } = JSON.parse(body);
        if (!token || !newPassword) {
          throw new Error("Token and new password are required");
        }

        const user = await userCollection.findOne({ resetToken: token });

        if (!user || user.resetTokenExpiry < Date.now()) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ message: "Invalid or expired token" }));
          return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await userCollection.updateOne(
          {
            email: user.emai - l,
          },
          {
            $set: {
              password: hashedPassword,
              resetToken: null,
              resetTokenExpiry: null,
            },
          }
        );

        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "Password reset successful" }));
      } catch (error) {}
    });
  } else {
    res.writeHead(404, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ message: "Route not found" }));
  }
}
