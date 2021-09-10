import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "redis";

const PROJECT_ROOT = ".";
const CONFIG_FILENAME = "redis.config.json";
const pathToConfig = resolve(PROJECT_ROOT, CONFIG_FILENAME);
// redis://alice:foobared@awesome.redis.server:6380

const redisConfig = JSON.parse(readFileSync(pathToConfig, "utf-8"));

const redisClient = createClient({
  socket: {
    url: redisConfig.connectionString,
  },
});

export { redisClient };
