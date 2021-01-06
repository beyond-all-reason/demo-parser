# SpringRTS Demo Parser
Parser for SpringRTS .sdfz demo files

## Usage

`npm i --save sdfz-demo-parser`

```ts
import { ungzip } from "node-gzip";
import { promises as fs } from "fs";

import { DemoParser } from "sdfz-demo-parser";

(async () => {
    const demoPath = "./example/20201219_003920_Altored Divide Bar Remake 1_104.0.1-1707-gc0fc18e BAR.sdfz";
    const sdfz = await fs.readFile(demoPath);
    const sdf = await ungzip(sdfz);

    const parser = new DemoParser();

    const demo = parser.parseDemo(sdf);

    console.log(demo.script.spectators[1].name); // [Fx]Jazcash
})();
```
