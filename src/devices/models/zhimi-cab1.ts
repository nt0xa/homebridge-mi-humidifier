import type * as hb from "homebridge";
import { PlatformAccessory, DeviceOptions } from "../../platform";
import { HumidifierModel } from "../factory";
import { CommonProps, ZhimiCommon } from "./zhimi-common";

enum Mode {
  Off = -1, // dummy
  Silent = "silent",
  Medium = "medium",
  High = "high",
  Auto = "auto",
}

type Props = CommonProps & {
  mode: Mode;
  depth: number;
  dry: "on" | "off";
  temperature: number; // cb1
  temp_dec: number; // ca1
};

export class ZhimiHumidifierCAB1 extends ZhimiCommon<Props> {
  public configureAccessory(
    accessory: PlatformAccessory,
    api: hb.API,
    options: DeviceOptions,
  ): void {
    super.configureAccessory(accessory, api, options);
    const features = this.features(accessory, api);

    features.rotationSpeed("mode", "set_mode", {
      modes: [Mode.Off, Mode.Silent, Mode.Medium, Mode.High, Mode.Auto],
    });
    features.waterLevel("depth", {
      toChar: (it) => it / 1.2,
    });
    features.swingMode("dry", "set_dry", { on: "on", off: "off" });

    if (options.temperatureSensor?.enabled) {
      features.temperatureSensor(
        this.deviceModel === HumidifierModel.ZHIMI_CA1
          ? "temp_dec"
          : "temperature",
        { name: options.temperatureSensor.name, toChar: (it) => it / 10 },
      );
    }
  }
}
