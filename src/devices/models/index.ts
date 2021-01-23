import type * as hb from "homebridge";
import * as miio from "miio-api";
import { DeviceOptions } from "../../platform";
import { BasePropsType } from "../humidifier";
import { zhimiV1 } from "./zhimi-v1";
import { zhimiCA1, zhimiCB1 } from "./zhimi-cab1";
import { zhimiCA4 } from "./zhimi-ca4";
import { deermaMJJSQ } from "./deerma-mjjsq";
import { deermaJSQ4 } from "./deerma-jsq4";
import { shuiiJSQ001 } from "./shuii-jsq001";
import { Protocol } from "../protocols";
import { Features, AnyCharacteristicConfig } from "../features";

export type HumidifierConfig<PropsType> = {
  protocol: Protocol<PropsType>;
  features: Array<AnyCharacteristicConfig<PropsType>>;
};

export type HumidifierConfigFunc<PropsType extends BasePropsType> = (
  device: miio.Device,
  feat: Features<PropsType>,
  log: hb.Logging,
  options: DeviceOptions,
) => HumidifierConfig<PropsType>;

export enum HumidifierModel {
  ZHIMI_V1 = "zhimi.humidifier.v1",
  ZHIMI_CA1 = "zhimi.humidifier.ca1",
  ZHIMI_CB1 = "zhimi.humidifier.cb1",
  ZHIMI_CA4 = "zhimi.humidifier.ca4",
  DEERMA_MJJSQ = "deerma.humidifier.mjjsq",
  DEERMA_JSQ = "deerma.humidifier.jsq1",
  DEERMA_JSQ4 = "deerma.humidifier.jsq4",
  SHUII_JSQ001 = "shuii.humidifier.jsq001",
}

export const HumidifierFactory = {
  [HumidifierModel.ZHIMI_V1]: zhimiV1,
  [HumidifierModel.ZHIMI_CA1]: zhimiCA1,
  [HumidifierModel.ZHIMI_CB1]: zhimiCB1,
  [HumidifierModel.ZHIMI_CA4]: zhimiCA4,
  [HumidifierModel.DEERMA_MJJSQ]: deermaMJJSQ,
  [HumidifierModel.DEERMA_JSQ]: deermaMJJSQ,
  [HumidifierModel.DEERMA_JSQ4]: deermaJSQ4,
  [HumidifierModel.SHUII_JSQ001]: shuiiJSQ001,
};
