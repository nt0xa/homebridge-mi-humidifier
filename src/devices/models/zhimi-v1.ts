import type * as hap from "hap-nodejs";
import * as miio from "miio-api";
import { DeviceOptions } from "../../platform";
import { CommonProps, zhimiCommon } from "./zhimi-common";
import { MiioProtocol } from "../protocols";
import { features } from "../features";
import { HumidifierConfig } from ".";

enum Mode {
  Off = "off", // dummy
  Silent = "silent",
  Medium = "medium",
  High = "high",
}

type Props = CommonProps & {
  mode: Mode;
  temp_dec: number;
};

export function zhimiV1(
  device: miio.Device,
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  const feat = features<Props>(Service, Characteristic);

  return {
    protocol: new MiioProtocol<Props>(device),
    features: [
      ...zhimiCommon<Props>(feat, options),

      feat.rotationSpeed("mode", "set_mode", {
        modes: [Mode.Off, Mode.Silent, Mode.Medium, Mode.High],
      }),

      ...(options.temperatureSensor?.enabled
        ? feat.temperatureSensor("temp_dec", {
            name: options.temperatureSensor.name,
            toChar: (it) => it / 10,
          })
        : []),
    ],
  };
}
