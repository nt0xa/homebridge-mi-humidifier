import type * as hap from "hap-nodejs";
import * as miio from "miio-api";

import { DeviceOptions } from "../../platform";
import { MiioProtocol } from "../protocols";
import { features, AnyCharacteristicConfig } from "../features";
import { CommonProps, zhimiCommon } from "./zhimi-common";
import { HumidifierConfig } from ".";

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

function common<PropsType extends Props>(
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  options: DeviceOptions,
): Array<AnyCharacteristicConfig<PropsType>> {
  const feat = features<PropsType>(Service, Characteristic);

  return [
    ...zhimiCommon<PropsType>(feat, options),

    feat.rotationSpeed("mode", "set_mode", {
      modes: [Mode.Off, Mode.Silent, Mode.Medium, Mode.High, Mode.Auto],
    }),
    feat.waterLevel("depth", {
      toChar: (it) => it / 1.2,
    }),
    feat.swingMode("dry", "set_dry", { on: "on", off: "off" }),
  ];
}

export function zhimiCA1(
  device: miio.Device,
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  const feat = features<Props>(Service, Characteristic);

  return {
    protocol: new MiioProtocol<Props>(device),
    features: [
      ...common<Props>(Service, Characteristic, options),

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
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  const feat = features<Props>(Service, Characteristic);

  return {
    protocol: new MiioProtocol<Props>(device),
    features: [
      ...common<Props>(Service, Characteristic, options),

      ...(options.temperatureSensor?.enabled
        ? feat.temperatureSensor("temperature", {
            name: options.temperatureSensor.name,
            toChar: (it) => it / 10,
          })
        : []),
    ],
  };
}
