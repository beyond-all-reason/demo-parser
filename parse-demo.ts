import { DemoParser } from "./src/demo-parser";
import * as fs from 'fs';

(async () => {
    const demoPath = process.argv[2];

    if (!demoPath) {
        console.error("Please provide the path to the demo file as a command line argument.");
        process.exit(1);
    }

    const parser = new DemoParser();

    try {
        const demo = await parser.parseDemo(demoPath);

        console.log(JSON.stringify(demo, null, 2));
    } catch (error) {
        console.error("Error parsing demo file:", error);
    }
})();