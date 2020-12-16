import { DeviceOptions } from "../../platform";
import { Features, AnyCharacteristicConfig } from "../features";

enum LedState {
  Bright = 0,
  Dim = 1,
  Off = 2,
}

export type CommonProps = {
  power: "on" | "off";
  humidity: number;
  limit_hum: number; // 30-80
  child_lock: "on" | "off";
  led_b: LedState;
  buzzer: "on" | "off";
};

export function zhimiCommon<PropsType extends CommonProps>(
  feat: Features<PropsType>,
  options: DeviceOptions,
): Array<AnyCharacteristicConfig<PropsType>> {
  return [
    feat.currentState(),
    feat.targetState(),
    feat.active("power", "set_power", { on: "on", off: "off" }),
    feat.humidityThreshold("limit_hum", "set_limit_hum"),
    feat.lockPhysicalControls("child_lock", "set_child_lock", {
      on: "on",
      off: "off",
    }),
    feat.humidity("humidity"),

    ...(options.ledBulb?.enabled
      ? feat.ledBulb("led_b", "set_led_b", {
          name: options.ledBulb.name,
          modes: [LedState.Off, LedState.Dim, LedState.Bright],
          on: LedState.Dim,
          off: LedState.Off,
        })
      : []),

    ...(options.buzzerSwitch?.enabled
      ? feat.buzzerSwitch("buzzer", "set_buzzer", {
          name: options.buzzerSwitch.name,
          on: "on",
          off: "off",
        })
      : []),

    ...(options.humiditySensor?.enabled
      ? feat.humiditySensor("humidity", {
          name: options.humiditySensor.name,
        })
      : []),
  ];
}
