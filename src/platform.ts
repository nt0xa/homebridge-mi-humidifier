import type * as hb from "homebridge";
import miio from "miio-api";
import { Humidifier, HumidifierModel, createHumidifier } from "./devices";
import { validateConfig } from "./validation";

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
    if (!Array.isArray(this.config.devices)) {
      this.log.error(`Invalid "devices" value, expected array`);
      return;
    }

    // Register new accessories.
    for (const config of this.config.devices) {
      const index = this.config.devices.indexOf(config);
      // Skip disabled devices.
      if (config.disabled) {
        // Unregister accessory if exists.
        const accessory = this.accessories.get(config.address);
        if (accessory) {
          this.api.unregisterPlatformAccessories(PluginName, PlatformName, [
            accessory,
          ]);
        }
        continue;
      }

      // Validate config before creating device.
      try {
        validateConfig(config);
      } catch (err) {
        this.log.error(
          `Invalid config for device #${index}. ${err.constructor.name}: ${err.message}`,
        );
        continue;
      }

      const { name, address, token, model, ...options } = config;

      const displayName = name || "Humidifier";

      // Try to create humidifier object for the accessory.
      let humidifier: Humidifier;

      try {
        humidifier = await createHumidifier(
          displayName,
          address,
          token,
          model,
          options,
          this.api,
          this.log,
        );
      } catch (err) {
        this.log.error(
          `Fail to initialize humidifier. ${err.constructor.name}: ${err.message}`,
        );

        if (err instanceof miio.SocketError) {
          this.log.warn(
            "Got SocketError which indicates use of an invalid IP. Please, check that provided IP is correct!",
          );
        }

        continue;
      }

      let accessory: PlatformAccessory;

      // Skip accessories restored from cache.
      if (this.accessories.has(address)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        accessory = this.accessories.get(address)!;
      } else {
        this.log.info(`Registering new device with IP "${address}".`);

        accessory = new this.api.platformAccessory(
          displayName,
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

      const update = this.update(address);
      setInterval(update, config.updateInterval * 1000 || 30000);

      // Initial update.
      await update();
    }

    // Unregister unused accessories.
    this.accessories.forEach((accessory, address) => {
      if (!this.config.devices.find((it) => it.address === address)) {
        this.log.warn(
          `Unregistering device with IP "${address}" because it wasn't found in config.json`,
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
          `Can't find Humidifier object for the device with IP "${address}".`,
        );
        return;
      }

      try {
        await humidifier.update();
      } catch (err) {
        this.log.error(
          `Fail to update characteristics of the device with IP "${address}".`,
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
  cleanModeSwitch?: {
    enabled: boolean;
    name?: string;
  };
  autoSwitchToHumidityMode?: boolean;
  disableTargetHumidity?: boolean;
};

/**
 * Parameters required to configure device.
 */
export type DeviceConfig = {
  disabled?: boolean;
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
