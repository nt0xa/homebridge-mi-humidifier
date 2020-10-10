import type * as hb from "homebridge";
import { MiHumidifierPlatform, PluginName, PlatformName } from "./platform";

export default (api: hb.API): void => {
  api.registerPlatform(PluginName, PlatformName, MiHumidifierPlatform);
};
