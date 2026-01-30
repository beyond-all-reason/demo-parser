import fs from "node:fs/promises";
import path from "node:path";

import { DemoModel, DemoParser } from ".";

const replaysDir = "../replays";

async function main() {
    const files = await fs.readdir(replaysDir);

    let i = 0;
    for (const demoFile of files) {
        process.stdout.write(`${++i}/${files.length}\r`);

        if (!demoFile.endsWith(".sdfz")) {
            continue;
        }
        const parser = new DemoParser({
            skipPackets: false,
            includePackets: [
                DemoModel.Packet.ID.STARTPOS,
                DemoModel.Packet.ID.STARTPLAYING,
                DemoModel.Packet.ID.CHAT,
            ]
        });
        const demo = await parser.parseDemo(path.join(replaysDir, demoFile));
    }
    process.stdout.write('\n');
}

main();
