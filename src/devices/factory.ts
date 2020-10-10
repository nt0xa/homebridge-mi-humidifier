import type * as hb from "homebridge";
import miio, { Device } from "miio-api";
import { DeviceOptions, PlatformAccessory } from "../platform";
import {
  ZhimiHumidifierV1,
  ZhimiHumidifierCAB1,
  ZhimiHumidifierCA4,
  DeermaHumidifierMJJSQ,
} from "./models";

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

export class HumidifierFactory {
  static async create(
    address: string,
    token: string,
    model: HumidifierModel,
    log: hb.Logging,
  ): Promise<Humidifier> {
    const device = await discover(address, token);

    switch (model) {
      case HumidifierModel.ZHIMI_V1:
        return new ZhimiHumidifierV1(device, model, log);

      case HumidifierModel.ZHIMI_CA1:
      case HumidifierModel.ZHIMI_CB1:
        return new ZhimiHumidifierCAB1(device, model, log);

      case HumidifierModel.ZHIMI_CA4:
        return new ZhimiHumidifierCA4(device, model, log);

      case HumidifierModel.DEERMA_MJJSQ:
        return new DeermaHumidifierMJJSQ(device, model, log);

      default:
        throw new HumidifierError(`Unsupported humidifier model "${model}"`);
    }
  }
}

export enum HumidifierModel {
  ZHIMI_V1 = "zhimi.humidifier.v1",
  ZHIMI_CA1 = "zhimi.humidifier.ca1",
  ZHIMI_CB1 = "zhimi.humidifier.cb1",
  ZHIMI_CA4 = "zhimi.humidifier.ca4",
  DEERMA_MJJSQ = "deerma.humidifier.mjjsq",
}

export interface Humidifier {
  readonly deviceId: number;
  readonly deviceModel: HumidifierModel;

  configureAccessory(
    accessory: PlatformAccessory,
    api: hb.API,
    options: DeviceOptions,
  ): void;

  update(): Promise<void>;
}

export class HumidifierError extends Error {
  public cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);

    this.cause = cause;
  }
}
