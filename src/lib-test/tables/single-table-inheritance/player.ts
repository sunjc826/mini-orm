import { createTable } from "../../../data-mapper/table";

export const PlayerTable = createTable({
  tableName: "players",
  columns: {
    id: {
      type: "serial",
      options: {
        primaryKey: true,
      },
    },
    name: {
      type: "text",
      options: {
        nullable: false,
      },
    },
    club: {
      // footballer
      type: "text",
    },
    battingAverage: {
      // cricketer, bowler
      type: "numeric",
    },
    bowlingAverage: {
      // bowler
      type: "numeric",
    },
  },
});
