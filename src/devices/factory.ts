import type * as hb from "homebridge";
import miio, { Device } from "miio-api";
import { DeviceOptions, PlatformAccessory } from "../platform";
import {
  HumidifierModel,
  HumidifierConfigFunc,
  HumidifierFactory,
} from "./models";
import { features } from "./features";
import { BaseHumidifier } from "./humidifier";
import { Logger } from "./logger";

/**
 * Partial miIO.info call result.
 */
export type DeviceInfo = {
  model: string;
  mac: string;
  fw_ver: string;
  hw_ver: string;
};

const discover = async (address: string, token: string): Promise<Device> => {
  try {
    return await miio.device({
      address: address,
      token: token,
    });
  } catch (err) {
    throw new HumidifierError(`Fail to connect to device ${address}`, err);
  }
};

const getInfo = async (device: Device): Promise<DeviceInfo> => {
  try {
    return await device.call<[], DeviceInfo>("miIO.info");
  } catch (err) {
    throw new HumidifierError(
      `Fail to get 'miIO.info' of device ${device.id}`,
      err,
    );
  }
};

export async function createHumidifier(
  address: string,
  token: string,
  model: HumidifierModel,
  options: DeviceOptions,
  api: hb.API,
  log: hb.Logging,
): Promise<Humidifier> {
  const device = await discover(address, token);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let configFunc: HumidifierConfigFunc<any>;

  if (model in HumidifierFactory) {
    configFunc = HumidifierFactory[model];
  } else {
    throw new HumidifierError(`Unsupported humidifier model "${model}"`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feat = features<any>(api.hap.Service, api.hap.Characteristic, log);

  const { protocol, features: feats } = configFunc(device, feat, log, options);

  return new BaseHumidifier(
    protocol,
    [...feat.accessoryInfo(model), ...feats],
    new Logger(log, `[${address}] `),
  );
}

export interface Humidifier {
  configureAccessory(accessory: PlatformAccessory): void;
  update(): Promise<void>;
}

export class HumidifierError extends Error {
  public cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);

    this.cause = cause;
  }
}
