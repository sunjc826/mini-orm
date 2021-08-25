import { DataMapper } from "../../data-mapper";
/**
 * Tests whether ORM can connect to postgresql database.
 */
test("connect to database", async () => {
  const isConnectionSuccessful = await DataMapper.Test.testConn();
  expect(isConnectionSuccessful).toEqual(true);
});
