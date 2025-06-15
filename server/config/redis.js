const Redis = require("ioredis");

const redisClient = new Redis(process.env.REDIS_URL, {
  tls: {}
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected (Upstash)");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

module.exports = redisClient;