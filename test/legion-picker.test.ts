import * as path from "path";

import { DemoParser } from "../src/demo-parser";

const testDir = "test";
const testReplaysDir = path.join(testDir, "test_replays");

it("legion-picked", async () => {
    const demoPath = path.join(testReplaysDir, "legion-picked.sdfz");

    const parser = new DemoParser();

    const demo = await parser.parseDemo(demoPath);

    expect(demo.info.players[0].faction).toBe("Legion");
});