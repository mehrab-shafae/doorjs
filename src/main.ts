// on the core ;)
// by Mehrab Shafae
//--------------------------------------------------------
import cron from "node-cron";
import moment from "moment-timezone";

import WarpManager from "./warp-manager.js";
import {
  CRONC,
  CRONCtest,
  MAX_RETRIES,
  MAX_RETRIES_L1,
  UnixTimeISOtz,
  UtcFormat,
} from "./config.js";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

//--------------------------------------------------------

let retryCount = 0;
let retryCountL1 = 0;
let isRunning = false;

function resetTry() {
  retryCountL1 = 0;
}

function resetTryAll() {
  retryCountL1 = 0;
  retryCount = 0;
}

//--------------------------------------------------------
class MainCC extends WarpManager {
  private Port: number | undefined;

  private async pingServer(url: string) {
    const start = performance.now();

    const proxyUrl = "http://127.0.0.1:" + this.Port!;
    const httpsAgent = new HttpsProxyAgent(proxyUrl);

    await axios.get(url, {
      timeout: 5000,
      httpsAgent,
    });

    const end = performance.now();
    const pingTime = end - start;
    console.log(`Ping to ${url}: ${pingTime.toFixed(2)} ms`);
  }

  protected async pingForDuration(url: string, duration: number) {
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      await this.pingServer(url);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  
  async runApp() {
    try {
      await this.pingForDuration("https://www.google.com", 10000);
      await this.app();
    } catch (error) {
      console.log(`Error in L1: ${(error as Error).message}`);
      retryCountL1++;
      if (retryCountL1 < MAX_RETRIES_L1) {
        console.log(`Retrying... (${retryCountL1}/${MAX_RETRIES_L1})`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await this.app(); // try again ..
      } else {
        console.log("[L1] Max retries reached. Restarting...");
        throw new Error("L1 dumped");
      }
    }
  }

  async runWarp() {
    try {
      await this.stopWarpPlus();
      const port = await this.findOpenPort();
      console.log(`warp on: ${port}`);

      await this.startWarpPlus(port);
      this.setPort(port);
      this.Port = port;
      await this.runApp();
    } catch (error) {
      console.log(`Error in main: ${(error as Error).message}`);
      retryCount++;
      resetTry();
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await this.runWarp(); // try again ..
      } else {
        console.log("[error] Max retries reached. Aborting... :(");
      }
    }
  }

  async prod() {
    try {
      if (isRunning) {
        console.log(
          "[Core error] Previous instance is still running. Skipping this execution."
        );
        return;
      }

      isRunning = true;

      const timeInUTC = moment().utc().format(UtcFormat);
      console.log(
        `[warn] Hi! Current time in UTC: ${timeInUTC}, ~{19}\`We start the Core.\``
      );
      resetTryAll();
      try {
        await this.runWarp();
      } finally {
        isRunning = false;
      }
      await this.stopWarpPlus();
    } catch (error) {
      console.log("[Core Error] " + error);
    }
  }

  StartCron() {
    let timeSc = this.config.Args.fast ? CRONCtest : CRONC;
    cron.schedule(
      timeSc,
      async () => {
        await this.prod();
      },
      {
        scheduled: true,
        timezone: UnixTimeISOtz,
      }
    );

    console.log("[info] ~{5}`Cron job scheduled.`");
  }

  override Main() {
    (async () => {
      if (this.config.Args.test) {
        await this.app();
      } else {
        await this.prod();
        this.StartCron();
      }
    })();
  }
  //--------------------------------------------------------
}

new MainCC();
