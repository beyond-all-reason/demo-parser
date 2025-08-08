import * as path from "path";

import { DemoParser } from "../src/demo-parser";

const testDir = "test";
const testReplaysDir = path.join(testDir, "test_replays");

it("2020-demo", async () => {
    const demoPath = path.join(testReplaysDir, "20201219_003920_Altored Divide Bar Remake 1_104.0.1-1707-gc0fc18e BAR.sdfz");

    const parser = new DemoParser();

    const demo = await parser.parseDemo(demoPath);

    expect(demo.info.spectators[1].name).toBe("[Fx]Jazcash");
});

// A more modern replay
it("2025-demo", async () => {
    const demoPath = path.join(testReplaysDir, "2025-08-08_10-25-43-160_Supreme Isthmus v2_2025.04.08.sdfz");

    const parser = new DemoParser();

    const demo = await parser.parseDemo(demoPath);

    expect(demo.info.players.length).toBe(16);
    expect(demo.info.spectators.length).toBe(0);
    expect(demo.info.ais.length).toBe(0);
    expect(demo.chatlog![5].message).toBe("yes");
});