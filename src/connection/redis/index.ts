import { createClient } from "redis";
import { getConfig } from "../../config";

const CONFIG_FILENAME = "redis.config.json";

const redisConfig = getConfig(CONFIG_FILENAME);

function getClient() {
  const redisClient = createClient({
    socket: {
      url: redisConfig.connectionString,
    },
  });
  return redisClient;
}

export { getClient };
