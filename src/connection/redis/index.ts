import { createClient } from "redis";
import { getConfig } from "../../config";

const CONFIG_FILENAME = "redis.config.json";

const redisConfig = getConfig(CONFIG_FILENAME);

async function getClient() {
  const redisClient = createClient({
    socket: {
      url: redisConfig.connectionString,
      reconnectStrategy: (currentNumberOfRetries: number) => {
        if (currentNumberOfRetries > 1) {
          throw new Error("max retries reached");
        }
        return 1000;
      },
    },
  });
  try {
    await redisClient.connect();
  } catch (e) {
    console.log(e);
  }

  return redisClient;
}

export { getClient };
