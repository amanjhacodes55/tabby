import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page in Tabby is dynamic (data lives in D1), so no incremental cache is needed.
export default defineCloudflareConfig({});
