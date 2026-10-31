import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_bvuejzrpcllehagisuxc",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  build: {
    // firecrawl-aisdk's WASM bash sandbox: optional native deps break bundling
    external: ["just-bash"],
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
