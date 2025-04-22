import fs from "fs";
import axios from "axios";
import { databasepGet, databasepSave } from "../config.js";
import { GetDataGlassnode } from "./glassnode-getter.js";
import { Core } from "@marboris/core";

export abstract class Handler extends Core {
  // Send data to API
  private async sendDataToApi(data: any) {
    try {
      const res = await axios.post(
        this.config.EnvConfig.FUNDAMENTAL_API + databasepSave,
        JSON.stringify(data),
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );
      console.log("[✓] API Response:", res.status);
    } catch (error) {
      console.error("[✗] Failed to send data to API.");
    }
  }

  // Main handler
  public async handler(cookie: string, nodes: string[], cachePort: number) {
    const dataStorage: Record<string, string> = {};
    const timestamps: Record<string, string | null> = {};

    // Step 1: Load previous timestamps from API
    try {
      const response = await axios.get(
        this.config.EnvConfig.FUNDAMENTAL_API + databasepGet,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      const data = response.data?.data || {};
      for (const node of nodes) {
        timestamps[node] = data[node] || null;
      }
      console.log("[✓] Timestamps loaded.");
    } catch {
      console.warn("[!] Failed to load timestamps from API.");
    }

    // Step 2: Handle each node in sequence
    for (const node of nodes) {
      console.log("───");
      console.log(`[>] Handling node: ${node}`);

      try {
        const getter = new GetDataGlassnode(node, cookie, cachePort);

        const rawTimestamp = timestamps[node];
        const timestamp = rawTimestamp
          ? Math.floor(new Date(rawTimestamp).getTime() / 1000)
          : null;

        console.log(`[i] Timestamp: ${timestamp || "None"}`);

        const data = timestamp
          ? await getter.getLast(timestamp)
          : await getter.getAll();

        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn(`[!] No valid data for ${node}, skipping...`);
          continue;
        }

        const serialized = JSON.stringify(data);
        dataStorage[node] = serialized;

        console.log(`[✓] Data length: ${data.length}`);
        await this.sendDataToApi(data);
      } catch (err) {
        console.warn(`[✗] Failed on ${node}, skipping.`);
      }
    }

    // Step 3: Save all data to local files
    try {
      for (const [node, json] of Object.entries(dataStorage)) {
        fs.writeFileSync(`data-${node.toLowerCase()}.json`, json);
        console.log(`[💾] Saved: data-${node.toLowerCase()}.json`);
      }
    } catch {
      console.error("[✗] Failed to write some files.");
    }

    console.log("✅ All nodes handled.");
  }
}
