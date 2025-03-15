const rateLimitStore = new Map();

export function rateLimiter(req, res, next, limit, windowMs) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const timeStamps = rateLimitStore.get(ip);
  rateLimitStore.set(
    ip,
    timeStamps.filter((timestamp) => now - timestamp < windowMs)
  );

  if (timeStamps.length >= limit) {
    res.writeHead(429, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ message: "Too many requests, Try again later!" }));
    return;
  }
  timeStamps.push(now);
  next();
}
