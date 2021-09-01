import { createTable } from "../../../data-mapper/table";
import { FOOTBALLER } from "../../domainKeys";

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
  singleTableInheritance: true,
});

export namespace PlayerTest {
  export var insertSql = `INSERT INTO players (players_type, name, club) VALUES
    ('${FOOTBALLER}', 'Johnson', 'ClubX'),
    ('${FOOTBALLER}', 'Merriman', 'ClubY'),
    ('${FOOTBALLER}', 'Raj', 'ClubZ');`;
}
