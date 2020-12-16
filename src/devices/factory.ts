import type * as hb from "homebridge";
import miio, { Device } from "miio-api";
import { DeviceOptions, PlatformAccessory } from "../platform";
import {
  HumidifierModel,
  HumidifierConfigFunc,
  HumidifierFactory,
  ExtractPropsType,
} from "./models";
import { BaseHumidifier } from "./humidifier";

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

  let configFunc: HumidifierConfigFunc<any>;

  if (model in HumidifierFactory) {
    configFunc = HumidifierFactory[model];
  } else {
    throw new HumidifierError(`Unsupported humidifier model "${model}"`);
  }

  const { protocol, features } = configFunc(
    device,
    api.hap.Service,
    api.hap.Characteristic,
    options,
  );

  return new BaseHumidifier(protocol, features, log);
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
