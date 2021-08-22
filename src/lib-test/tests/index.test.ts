import { DataMapper } from "../../data-mapper";

test("can run test", () => {
  expect("hello" + " " + "world").toEqual("hello world");
});

test("connect to database", async () => {
  const isConnectionSuccessful = await DataMapper.testConn();
  expect(isConnectionSuccessful).toEqual(true);
});
