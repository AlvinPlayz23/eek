import { defineConfig } from "@trigger.dev/sdk";
import { additionalPackages } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_bvuejzrpcllehagisuxc",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  build: {
    // firecrawl-aisdk's WASM bash sandbox: optional native deps break bundling
    external: ["just-bash"],
    extensions: [
      // @daytona/sdk loads these at runtime for file upload/download, out of the bundler's sight.
      // Marking the SDK external doesn't work: its nameless esm/package.json fails the CLI's check
      additionalPackages({ packages: ["form-data@4.0.6", "busboy@1.6.0"] }),
    ],
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
