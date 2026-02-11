import * as fs from "fs";
import * as path from "path";

import { DemoParser } from "../src";
import { DemoModel } from "../src";
import { ReservoirSampler } from "./reservoir-sampler";

const testReplaysDir = path.join("test", "test_replays");
const snapshotsDir = path.join(__dirname, "__snapshots__");
const replayFiles = fs.readdirSync(testReplaysDir)
    .filter(f => f.endsWith(".sdfz"))
    .map(f => [path.parse(f).name, path.join(testReplaysDir, f)]);

function expectMatchesJsonSnapshot(actual: unknown, snapshotPath: string) {
    const json = JSON.stringify(actual, null, 4);
    if (!fs.existsSync(snapshotPath)) {
        fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
        fs.writeFileSync(snapshotPath, json);
        return;
    }
    const expected = fs.readFileSync(snapshotPath, "utf-8");
    expect(json).toEqual(expected);
}

it.each(replayFiles)("%s default", async (name, demoPath) => {
    const parser = new DemoParser();
    const demo = await parser.parseDemo(demoPath);
    expectMatchesJsonSnapshot(demo, path.join(snapshotsDir, `${name}.default.json`));
});

it.each(replayFiles)("%s skip-packets", async (name, demoPath) => {
    const parser = new DemoParser({ skipPackets: true });
    const demo = await parser.parseDemo(demoPath);
    expectMatchesJsonSnapshot(demo, path.join(snapshotsDir, `${name}.skip-packets.json`));
});

const packetNames = Object.keys(DemoModel.Packet.ID).filter(k => isNaN(Number(k)));

describe.each(replayFiles)("%s packets", (name, demoPath) => {
    const packetsByType: Record<string, ReservoirSampler<DemoModel.Packet.AbstractPacket>> = {};

    beforeAll(async () => {
        const parser = new DemoParser();
        parser.onPacket.add((packet) => {
            if (!packetsByType[packet.name]) {
                packetsByType[packet.name] = new ReservoirSampler(100, 12345);
            }
            packetsByType[packet.name].push(packet);
        });
        await parser.parseDemo(demoPath);
    });

    it.each(packetNames)("%s", (packetName) => {
        const packetSnapshotPath = path.join(snapshotsDir, name, `${packetName}.json`);
        if (packetName in packetsByType) {
            const packets = packetsByType[packetName]?.getSample() ?? [];
            expectMatchesJsonSnapshot(packets, packetSnapshotPath);
        } else {
            expect(fs.existsSync(packetSnapshotPath)).toBeFalsy();
        }
    });
});
