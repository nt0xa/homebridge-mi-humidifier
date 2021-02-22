import { HumidifierModel } from "./devices";
import { DeviceConfig } from "./platform";

const ipRegexp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function isValidIP(ip: string): boolean {
  return ipRegexp.test(ip);
}

const tokenRegex = /^[a-f0-9]{32}$/;

function isValidToken(token: string): boolean {
  return tokenRegex.test(token);
}

function isValidModel(model: HumidifierModel): boolean {
  return Object.values(HumidifierModel).includes(model);
}

export function validateConfig(config: DeviceConfig): void {
  if (!config.address || !isValidIP(config.address)) {
    throw new ValidationError(`Invalid IP address "${config.address}"`);
  }

  if (!config.token || !isValidToken(config.token)) {
    throw new ValidationError(`Invalid device token "${config.token}"`);
  }

  if (!config.model || !isValidModel(config.model)) {
    throw new ValidationError(
      `Invalid device model "${config.model}". Expected one of ${Object.values(
        HumidifierModel,
      )
        .map((v) => `"${v}"`)
        .join(", ")}`,
    );
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}
