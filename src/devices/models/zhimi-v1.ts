import type * as hb from "homebridge";
import { PlatformAccessory, DeviceOptions } from "../../platform";
import { CommonProps, ZhimiCommon } from "./zhimi-common";

enum Mode {
  Off = -1,
  Silent = "silent",
  Medium = "medium",
  High = "high",
}

type Props = CommonProps & {
  mode: Mode;
  temp_dec: number;
};

export class ZhimiHumidifierV1 extends ZhimiCommon<Props> {
  public configureAccessory(
    accessory: PlatformAccessory,
    api: hb.API,
    options: DeviceOptions,
  ): void {
    super.configureAccessory(accessory, api, options);
    const register = this.helper(accessory, api);

    register.rotationSpeed("mode", "set_mode", {
      modes: [Mode.Off, Mode.Silent, Mode.Medium, Mode.High],
    });

    if (options.temperatureSensor?.enabled) {
      register.temperatureSensor("temp_dec", {
        name: options.temperatureSensor.name,
        toChar: (it) => it / 10,
      });
    }
  }
}
