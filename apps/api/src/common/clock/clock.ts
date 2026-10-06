import { tehranToday } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

/** Single source of "now" so time-dependent rules (holds, alerts, fares) are testable. */
export abstract class Clock {
  abstract now(): Date;

  /** Calendar date in Tehran, `YYYY-MM-DD`. */
  today(): string {
    return tehranToday(this.now());
  }
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock extends Clock {
  constructor(private current: Date) {
    super();
  }

  now(): Date {
    return new Date(this.current);
  }

  set(next: Date): void {
    this.current = next;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
