import { Int } from "./int";
import { int } from ".";

export class Serial extends Int {
  type = int;
  variant: Int.IntSize = "regular";
  // TODO: add an option for this field
  autoGenerateExclusively: boolean = true;

  constructor(name: string, options: Partial<Serial.SerialOptions>) {
    super(name, options);
  }

  getDefault() {
    return `GENERATED ${
      this.autoGenerateExclusively ? "ALWAYS" : "BY DEFAULT"
    } AS IDENTITY`;
  }
}

export declare namespace Serial {
  export interface SerialOptions extends Int.IntOptions {
    autoGenerateExlusively: boolean;
  }
}
