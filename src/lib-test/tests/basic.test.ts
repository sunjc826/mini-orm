import { DataMapper } from "../../data-mapper";

test("can run test", () => {
  expect("hello" + " " + "world").toEqual("hello world");
});

test("connect to database", async () => {
  const isConnectionSuccessful = await DataMapper.Test.testConn();
  expect(isConnectionSuccessful).toEqual(true);
});


test("connect to database again", async () => {
  const isConnectionSuccessful = await DataMapper.Test.testConn();
  expect(isConnectionSuccessful).toEqual(true);
})