import { readFileSync } from "fs";
import path from "path";
const { resolve } = path;
const PROJECT_CONFIG_ROOT = "./config";

let configDir: string;
switch (process.env.NODE_ENV) {
  case "ci": {
    configDir = "ci";
    break;
  }
  case "production": {
    configDir = "prod";
    break;
  }
  default: {
    configDir = "dev";
  }
}

function getConfig(configFilename: string) {
  const pathToConfig = resolve(PROJECT_CONFIG_ROOT, configDir, configFilename);
  return JSON.parse(readFileSync(pathToConfig, "utf-8"));
}

export { getConfig };
