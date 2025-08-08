import type {Config} from "jest";

const config: Config = {
    preset: "ts-jest",
    coverageProvider: "v8",
    testEnvironment: "node",

    moduleFileExtensions: [
        "js",
        "ts",
    ],
};

export default config;
