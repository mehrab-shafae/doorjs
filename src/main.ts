// on the core ;)
// by Mehrab Shafae
//--------------------------------------------------------
import cron from "node-cron";
import moment from "moment-timezone";

import WarpManager from "./warp-manager.js";
import {
  CRONC,
  CRONCtest,
  initConfig,
  MAX_RETRIES,
  MAX_RETRIES_L1,
  UnixTimeISOtz,
  UtcFormat,
} from "./config.js";
import { config, resetTry, resetTryAll } from "./app/app-config.js";

//--------------------------------------------------------
class MainCC extends WarpManager {
  async runApp() {
    try {
      await this.app();
    } catch (error) {
      console.log(`Error in L1: ${(error as Error).message}`);
      config.retryCountL1++;
      if (config.retryCountL1 < MAX_RETRIES_L1) {
        console.log(`Retrying... (${config.retryCountL1}/${MAX_RETRIES_L1})`);
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
      await this.runApp();
    } catch (error) {
      console.log(`Error in main: ${(error as Error).message}`);
      config.retryCount++;
      resetTry();
      if (config.retryCount < MAX_RETRIES) {
        console.log(`Retrying... (${config.retryCount}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await this.runWarp(); // try again ..
      } else {
        console.log("[error] Max retries reached. Aborting... :(");
      }
    }
  }

  async prod() {
    try {
      if (config.isRunning) {
        console.log(
          "[Core error] Previous instance is still running. Skipping this execution."
        );
        return;
      }

      config.isRunning = true;

      const timeInUTC = moment().utc().format(UtcFormat);
      console.log(
        `[warn] Hi! Current time in UTC: ${timeInUTC}, ~{19}\`We start the Core.\``
      );
      resetTryAll();
      try {
        await this.runWarp();
      } finally {
        config.isRunning = false;
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
    initConfig(this.config.EnvConfig);
    //--------------------------------------------------------
    (async () => {
      if (this.config.Args.test) {
        await this.app();
      } else {
        await this.prod();
        this.StartCron();
      }
    })();
    //--------------------------------------------------------
  }
  //--------------------------------------------------------
}

new MainCC();
