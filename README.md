# SpringRTS/RecoilEngine Demo Parser

Parser for SpringRTS/RecoilEngine .sdfz demo files

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

## CLI

The package also ships a CLI (requires Node.js 24+) that parses a demo file and prints the result as JSON.

Run it without installing:

```
npx sdfz-demo-parser <demo.sdfz> [options]
```

Or install it and run the `sdfz-demo-parser` command:

```
npm i -g sdfz-demo-parser
sdfz-demo-parser <demo.sdfz> > demo.json
```

Examples:

```
# Full parse, pretty JSON to stdout (the packet stream is included by default)
sdfz-demo-parser game.sdfz

# Header/summary only (skips the packet stream)
sdfz-demo-parser game.sdfz --header-only

# Only chat and Lua packets, written to a file
sdfz-demo-parser game.sdfz --include-packets CHAT,LUAMSG -o out.json

# Every packet type (clear the default excludes), as compact JSON
sdfz-demo-parser game.sdfz --exclude-packets "" --compact
```

## Development

### Publish new version

```
npm version --sign-git-tag patch|minor|major
git push --follow-tags
```
