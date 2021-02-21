import * as path from "path";

import { DemoParser } from "../src/demo-parser";

const testDir = "test";
const testReplaysDir = path.join(testDir, "test_replays");

it("usage-example", async () => {
    const demoPath = path.join(testReplaysDir, "20201219_003920_Altored Divide Bar Remake 1_104.0.1-1707-gc0fc18e BAR.sdfz");

    const parser = new DemoParser();

    const demo = await parser.parseDemo(demoPath);

    expect(demo.info.spectators[1].name).toBe("[Fx]Jazcash");
});