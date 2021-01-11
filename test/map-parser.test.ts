import * as path from "path";

import { promises as fs } from "fs";

import { DemoParser } from "../src/demo-parser";

const testDir = "test";
const testReplaysDir = path.join(testDir, "test_replays");

it("usage-example", async () => {
    const demoPath = path.join(testReplaysDir, "20201219_003920_Altored Divide Bar Remake 1_104.0.1-1707-gc0fc18e BAR.sdfz");
    const sdfz = await fs.readFile(demoPath);

    const parser = new DemoParser();

    const demo = await parser.parseDemo(sdfz);

    expect(demo.script.spectators[1].name).toBe('[Fx]Jazcash');
});