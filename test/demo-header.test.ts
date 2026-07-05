import { BufferStream } from "../src/buffer-stream";
import { DemoParser } from "../src/demo-parser";
import { DemoModel } from "../src/model/demo-model";

const BASE_HEADER_SIZE = 352;
const MAGIC = Buffer.from("spring demofile\0");

class HeaderTestParser extends DemoParser {
    public parseHeaderBuffer(buffer: Buffer): { header: DemoModel.Header, offset: number } {
        this.bufferStream = new BufferStream(buffer);
        const header = this.parseHeader();
        return { header, offset: this.bufferStream.offset };
    }
}

function createHeader(options: {
    declaredSize?: number;
    extension?: Buffer;
    magic?: Buffer;
} = {}): Buffer {
    const extension = options.extension ?? Buffer.alloc(0);
    const declaredSize = options.declaredSize ?? BASE_HEADER_SIZE + extension.length;
    const buffer = Buffer.alloc(Math.max(BASE_HEADER_SIZE + extension.length, BASE_HEADER_SIZE));
    let offset = 0;

    (options.magic ?? MAGIC).copy(buffer, offset);
    offset += MAGIC.length;

    buffer.writeInt32LE(5, offset);
    offset += 4;
    buffer.writeInt32LE(declaredSize, offset);
    offset += 4;

    buffer.write("2026.06.27", offset, "utf8");
    offset += 256;

    Buffer.from("00112233445566778899aabbccddeeff", "hex").copy(buffer, offset);
    offset += 16;

    buffer.writeBigInt64LE(BigInt(1_700_000_000), offset);
    offset += 8;

    const values = [12, 34, 56, 78, 2, 80, 20, 3, 120, 40, 15, 1];
    for (const value of values) {
        buffer.writeInt32LE(value, offset);
        offset += 4;
    }

    extension.copy(buffer, offset);
    return buffer;
}

describe("DemoParser header parsing", () => {
    it("parses the legacy 352-byte header without a network version", () => {
        const { header, offset } = new HeaderTestParser().parseHeaderBuffer(createHeader());

        expect(header).toMatchObject({
            magic: "spring demofile",
            version: 5,
            headerSize: BASE_HEADER_SIZE,
            versionString: "2026.06.27",
            gameId: "00112233445566778899aabbccddeeff",
            scriptSize: 12,
            demoStreamSize: 34,
            gameTime: 56,
            wallclockTime: 78,
            numPlayers: 2,
            playerStatSize: 80,
            playerStatElemSize: 20,
            numTeams: 3,
            teamStatSize: 120,
            teamStatElemSize: 40,
            teamStatPeriod: 15,
            winningAllyTeamsSize: 1,
            networkVersion: undefined,
        });
        expect(header.startTime).toEqual(new Date(1_700_000_000_000));
        expect(offset).toBe(BASE_HEADER_SIZE);
    });

    it("parses the network version from a 354-byte header", () => {
        const extension = Buffer.alloc(2);
        extension.writeUInt16LE(0x1234);

        const { header, offset } = new HeaderTestParser().parseHeaderBuffer(createHeader({ extension }));

        expect(header.networkVersion).toBe(0x1234);
        expect(offset).toBe(354);
    });

    it("does not read a network version when only one extension byte exists", () => {
        const { header, offset } = new HeaderTestParser().parseHeaderBuffer(createHeader({
            extension: Buffer.from([0xaa]),
        }));

        expect(header.networkVersion).toBeUndefined();
        expect(offset).toBe(353);
    });

    it("skips unknown bytes after the network version", () => {
        const extension = Buffer.from([0x34, 0x12, 0xaa, 0xbb, 0xcc]);

        const { header, offset } = new HeaderTestParser().parseHeaderBuffer(createHeader({ extension }));

        expect(header.networkVersion).toBe(0x1234);
        expect(offset).toBe(357);
    });

    it("rejects a magic value that only partially matches", () => {
        const invalidMagic = Buffer.from(MAGIC);
        invalidMagic[15] = 0x78;

        expect(() => new HeaderTestParser().parseHeaderBuffer(createHeader({ magic: invalidMagic })))
            .toThrow(/Invalid demo file magic: hex=.*utf8=/);
    });

    it("rejects a declared header size smaller than the fields already read", () => {
        const buffer = createHeader({ declaredSize: BASE_HEADER_SIZE - 1 });

        expect(() => new HeaderTestParser().parseHeaderBuffer(buffer))
            .toThrow(`Invalid demo header size: declared ${BASE_HEADER_SIZE - 1}, read ${BASE_HEADER_SIZE}`);
    });
});
