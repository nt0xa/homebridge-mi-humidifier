import type * as hb from "homebridge";
import * as miio from "miio-api";
import { DeviceOptions } from "../../platform";
import { CommonProps, zhimiCommon } from "./zhimi-common";
import { MiioProtocol } from "../protocols";
import { Features } from "../features";
import { HumidifierConfig } from ".";

enum Mode {
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
  feat: Features<Props>,
  log: hb.Logging,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  return {
    protocol: new MiioProtocol<Props>(device),
    features: [
      ...zhimiCommon<Props>(feat, options),

      feat.rotationSpeed("mode", "set_mode", {
        modes: [Mode.Silent, Mode.Medium, Mode.High],
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
