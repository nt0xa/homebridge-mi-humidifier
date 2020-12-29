import type * as hb from "homebridge";

/* eslint-disable  @typescript-eslint/no-explicit-any */
export class Logger {
  private readonly log: hb.Logging;
  public readonly prefix: string;

  constructor(log: hb.Logging, prefix: string) {
    this.log = log;
    this.prefix = prefix;
  }

  info(message: string, ...parameters: any[]): void {
    this.log.info(this.prefix + message, ...parameters);
  }

  warn(message: string, ...parameters: any[]): void {
    this.log.warn(this.prefix + message, ...parameters);
  }

  error(message: string, ...parameters: any[]): void {
    this.log.error(this.prefix + message, ...parameters);
  }

  debug(message: string, ...parameters: any[]): void {
    this.log.debug(this.prefix + message, ...parameters);
  }
}
/* eslint-enable  @typescript-eslint/no-explicit-any */
