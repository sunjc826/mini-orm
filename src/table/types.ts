export namespace InformationSchema {
  export type YesOrNo = "YES" | "NO";
  export interface Columns {
    table_schema: string;
    table_name: string;
    column_name: string;
    ordinal_position: number;
    column_default: string;
    is_nullable: YesOrNo;
    data_type: string;
    character_maximum_length: number;
    character_octet_length: number;
    numeric_precision: number;
    numeric_precision_radix: number;
    numeric_scale: number;
    datetime_precision: number;
    interval_type: string;
    interval_precision: number;
    maximum_cardinality: number;
    is_self_referencing: YesOrNo;
    is_identity: YesOrNo;
    identity_generation: string;
    identity_start: string;
    identity_increment: string;
    identity_maximum: string;
    identity_minimum: string;
    identity_cycle: YesOrNo;
    is_generated: string;
    generation_expression: string;
    is_updatable: YesOrNo;
  }
}
