import { BaseHumidifier, BasePropsType, PrimitiveType } from "./base";
import { ValueOf } from "./utils";

type GetArgType = string;
type GetResultType = PrimitiveType;
type SetArgType = PrimitiveType;
type SetResultType = string;

export abstract class MiioHumidifier<
  PropsType extends BasePropsType
> extends BaseHumidifier<
  PropsType,
  GetArgType,
  GetResultType,
  SetArgType,
  SetResultType
> {
  protected getCallName(): string {
    return "get_prop";
  }

  protected checkSetResult(result: string): boolean {
    return result === "ok";
  }

  protected extractValue(result: PrimitiveType): ValueOf<PropsType> {
    return result as ValueOf<PropsType>;
  }
}
