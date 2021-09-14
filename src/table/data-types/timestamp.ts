import { ColumnOptions, timestamp } from ".";
import { ColumnType } from "./base";

export class TimeStamp extends ColumnType {
  type = timestamp;
  timezone: boolean;

  constructor(name: string, options: Partial<TimeStamp.TimeStampOptions>) {
    super(name, options);
    this.timezone = options.timezone ?? true;
  }

  getType() {
    if (this.timezone) {
      return "TIMESTAMPTZ";
    } else {
      return "TIMESTAMP";
    }
  }

  getTypedValue(stringValue: string): Date {
    return new Date(stringValue);
  }

  toSqlString(data: Date) {
    return data.toISOString();
  }
}

export declare namespace TimeStamp {
  export interface TimeStampOptions extends ColumnOptions {
    timezone: boolean;
  }
}
