import type * as hap from "hap-nodejs";
import * as miio from "miio-api";
import { DeviceOptions } from "../../platform";
import { zhimiV1 } from "./zhimi-v1";
import { zhimiCA1, zhimiCB1 } from "./zhimi-cab1";
import { zhimiCA4 } from "./zhimi-ca4";
import { deermaMJJSQ } from "./deerma-mjjsq";
import { shuiiJSQ001 } from "./shuii-jsq001";
import { Protocol } from "../protocols";
import { AnyCharacteristicConfig } from "../features";

export type HumidifierConfig<PropsType> = {
  protocol: Protocol<PropsType>;
  features: Array<AnyCharacteristicConfig<PropsType>>;
};

export type HumidifierConfigFunc<PropsType> = (
  device: miio.Device,
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  options: DeviceOptions,
) => HumidifierConfig<PropsType>;

export enum HumidifierModel {
  ZHIMI_V1 = "zhimi.humidifier.v1",
  ZHIMI_CA1 = "zhimi.humidifier.ca1",
  ZHIMI_CB1 = "zhimi.humidifier.cb1",
  ZHIMI_CA4 = "zhimi.humidifier.ca4",
  DEERMA_MJJSQ = "deerma.humidifier.mjjsq",
  SHUII_JSQ001 = "shuii.humidifier.jsq001",
}

export const HumidifierFactory = {
  [HumidifierModel.ZHIMI_V1]: zhimiV1,
  [HumidifierModel.ZHIMI_CA1]: zhimiCA1,
  [HumidifierModel.ZHIMI_CB1]: zhimiCB1,
  [HumidifierModel.ZHIMI_CA4]: zhimiCA4,
  [HumidifierModel.DEERMA_MJJSQ]: deermaMJJSQ,
  [HumidifierModel.SHUII_JSQ001]: shuiiJSQ001,
};

export type ExtractPropsType<T> = T extends HumidifierConfigFunc<infer X>
  ? X
  : never;
