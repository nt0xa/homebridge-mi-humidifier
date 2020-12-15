import type * as hb from "homebridge";
import * as miio from "miio-api";

import { BaseHumidifier } from "../humidifier";
import { Protocol, MiioProtocol } from "../protocols";
import { PlatformAccessory, DeviceOptions } from "../../platform";

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

export abstract class ZhimiCommon<
  PropsType extends CommonProps
> extends BaseHumidifier<PropsType> {
  protected getProtocol(device: miio.Device): Protocol<PropsType> {
    return new MiioProtocol(device);
  }

  configureAccessory(
    accessory: PlatformAccessory,
    api: hb.API,
    options: DeviceOptions,
  ): void {
    super.configureAccessory(accessory, api, options);
    const features = this.features(accessory, api);

    features.currentState();
    features.targetState();
    features.active("power", "set_power", { on: "on", off: "off" });
    features.humidityThreshold("limit_hum", "set_limit_hum");
    features.lockPhysicalControls("child_lock", "set_child_lock", {
      on: "on",
      off: "off",
    });
    features.humidity("humidity");

    if (options.ledBulb?.enabled) {
      features.ledBulb("led_b", "set_led_b", {
        name: options.ledBulb.name,
        modes: [LedState.Off, LedState.Dim, LedState.Bright],
        on: LedState.Dim,
        off: LedState.Off,
      });
    }

    if (options.buzzerSwitch?.enabled) {
      features.buzzerSwitch("buzzer", "set_buzzer", {
        name: options.buzzerSwitch.name,
        on: "on",
        off: "off",
      });
    }

    if (options.humiditySensor?.enabled) {
      features.humiditySensor("humidity", {
        name: options.humiditySensor.name,
      });
    }
  }
}
