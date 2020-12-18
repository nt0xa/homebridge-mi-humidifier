import type * as hap from "hap-nodejs";
import type * as hb from "homebridge";
import * as miio from "miio-api";

import { DeviceOptions } from "../../platform";
import { MiioProtocol } from "../protocols";
import { Features, AnyCharacteristicConfig } from "../features";
import { CommonProps, zhimiCommon } from "./zhimi-common";
import { HumidifierConfig } from ".";

enum Mode {
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

function common<PropsType extends Props>(
  feat: Features<PropsType>,
  log: hb.Logging,
  options: DeviceOptions,
): Array<AnyCharacteristicConfig<PropsType>> {
  return [
    ...zhimiCommon<PropsType>(feat, options),

    feat.rotationSpeed("mode", "set_mode", {
      modes: [Mode.Silent, Mode.Medium, Mode.High, Mode.Auto],
    }),
    feat.waterLevel("depth", {
      toChar: (it) => it / 1.2,
    }),
    feat.swingMode("dry", "set_dry", { on: "on", off: "off" }),
  ];
}

export function zhimiCA1(
  device: miio.Device,
  feat: Features<Props>,
  log: hb.Logging,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  return {
    protocol: new MiioProtocol<Props>(device),
    features: [
      ...common<Props>(feat, log, options),

      ...(options.temperatureSensor?.enabled
        ? feat.temperatureSensor("temp_dec", {
            name: options.temperatureSensor.name,
            toChar: (it) => it / 10,
          })
        : []),
    ],
  };
}

export function zhimiCB1(
  device: miio.Device,
  feat: Features<Props>,
  log: hb.Logging,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  return {
    protocol: new MiioProtocol<Props>(device),
    features: [
      ...common<Props>(feat, log, options),

      ...(options.temperatureSensor?.enabled
        ? feat.temperatureSensor("temperature", {
            name: options.temperatureSensor.name,
            toChar: (it) => it,
          })
        : []),
    ],
  };
}
