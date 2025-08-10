# SpringRTS Demo Parser
Parser for SpringRTS .sdfz demo files

## Usage

`npm i --save sdfz-demo-parser`

```ts
import { DemoParser } from "sdfz-demo-parser";

(async () => {
    const demoPath = "./example/20201219_003920_Altored Divide Bar Remake 1_104.0.1-1707-gc0fc18e BAR.sdfz";

    const parser = new DemoParser();

    const demo = await parser.parseDemo(demoPath);

    console.log(demo.info.spectators[1].name); // [Fx]Jazcash
})();
```

## Dump entire demo

To just dump the entire contents and all packets to a json on the console

`npm install`

`npm run build`

`npx ts-node parse-demo.ts mydemo.sdfz > mydemo.json`
