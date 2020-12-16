import * as hb from "homebridge";
import { Humidifier, HumidifierModel, createHumidifier } from "./devices";
import { validateConfig } from "./utils";

export const PluginName = "homebridge-mi-humidifier";
export const PlatformName = "MiHumidifier";

export class MiHumidifierPlatform implements hb.DynamicPlatformPlugin {
  private readonly log: hb.Logging;
  private readonly config: PlatformConfig;
  private readonly api: hb.API;
  private readonly accessories: Map<string, PlatformAccessory>;
  private readonly devices: Map<string, Humidifier>;

  constructor(log: hb.Logging, config: hb.PlatformConfig, api: hb.API) {
    this.log = log;
    this.config = config as PlatformConfig;
    this.api = api;
    this.accessories = new Map();
    this.devices = new Map();

    this.api.on("didFinishLaunching", this.didFinishLaunching.bind(this));
  }

  /**
   * Homebridge will call the `configureAccessory` method once for every cached
   * accessory restored.
   */
  async configureAccessory(accessory: PlatformAccessory): Promise<void> {
    const { address } = accessory.context;

    this.accessories.set(address, accessory);
  }

  /**
   * Platforms should wait until the `didFinishLaunching` event has fired before
   * registering any new accessories.
   */
  async didFinishLaunching(): Promise<void> {
    // Register new accessories.
    this.config.devices.forEach(async (config, index) => {
      // Validate config before creating device.
      try {
        validateConfig(config);
      } catch (err) {
        this.log.error(`Invalid config for device #${index}}.`, err);
        return;
      }

      const { name, address, token, model, ...options } = config;

      // Try to create humidifier object for the accessory.
      let humidifier: Humidifier;

      try {
        humidifier = await createHumidifier(
          address,
          token,
          model,
          options,
          this.api,
          this.log,
        );
      } catch (err) {
        this.log.error("%s. %s", err.message, err.cause || "");
        return;
      }

      let accessory: PlatformAccessory;

      // Skip accessories restored from cache.
      if (this.accessories.has(address)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        accessory = this.accessories.get(address)!;
      } else {
        this.log.info(`Registering new device with IP ${address}.`);

        accessory = new this.api.platformAccessory(
          name || "Humidifier",
          this.api.hap.uuid.generate(address),
        );

        accessory.context = {
          address,
        };

        this.api.registerPlatformAccessories(PluginName, PlatformName, [
          accessory,
        ]);
      }

      // Configure accessory services and characteristics.
      humidifier.configureAccessory(accessory);

      // Store humidifier context to use later in polling function.
      this.devices.set(address, humidifier);

      setInterval(this.update(address), config.updateInterval || 30000);
    });

    // Unregister unused accessories.
    this.accessories.forEach((accessory, address) => {
      if (!this.config.devices.find((it) => it.address === address)) {
        this.log.warn(
          `Unregistering device with IP ${address} because it wasn't found in config.json`,
        );

        this.api.unregisterPlatformAccessories(PluginName, PlatformName, [
          accessory,
        ]);
      }
    });
  }

  private update(address: string): () => Promise<void> {
    return async () => {
      const humidifier = this.devices.get(address);

      if (!humidifier) {
        this.log.warn(
          `Can't find Humidifier object for the device with IP ${address}.`,
        );
        return;
      }

      try {
        humidifier.update();
      } catch (err) {
        this.log.error(
          "Fail to update characteristics of the device with IP %s.",
          address,
        );
      }
    };
  }
}

/**
 * Additional device options.
 */
export type DeviceOptions = {
  ledBulb?: {
    enabled: boolean;
    name?: string;
  };
  buzzerSwitch?: {
    enabled: boolean;
    name?: string;
  };
  temperatureSensor?: {
    enabled: boolean;
    name?: string;
  };
  humiditySensor?: {
    enabled: boolean;
    name?: string;
  };
};

/**
 * Parameters required to configure device.
 */
export type DeviceConfig = {
  name?: string;
  address: string;
  token: string;
  model: HumidifierModel;
  updateInterval: number;
} & DeviceOptions;

/**
 * Platform configuration from config.json.
 */
type PlatformConfig = {
  platform: string;
  devices: DeviceConfig[];
};

/**
 * Accessory context.
 * https://developers.homebridge.io/#/api/platform-plugins#platformaccessorycontext
 */
type AccessoryContext = {
  address: string;
};

/**
 * Helper type alias.
 */
export type PlatformAccessory = hb.PlatformAccessory<AccessoryContext>;
