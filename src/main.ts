// on the core ;)
// by Mehrab Shafae

//--------------------------------------------------------
// process.stdin.resume();

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
import { config, resetTry } from "./app/app-config.js";

// function panicHandler(err: Error) {
//   if (err.message === "Panic error") {
//     console.log("App paniced! Whole app start again in 10 seconds");
//     // (async () => {
//     //   // await delay(10000);
//     //   // console.log("[panic info] init Main")
//     //   // const main = new MainCC();
//     //   // await delay(5000);
//     //   // console.log("[panic info] start pur.")
//     //   // main.pur();
//     // })();
//   }
// }

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
      if (config.retryCount < MAX_RETRIES) {
        console.log(`Retrying... (${config.retryCount}/${MAX_RETRIES})`);
        await this.runWarp(); // try again ..
      } else {
        console.log("[error] Max retries reached. Aborting... :(");
      }
    }
  }

  StartCron() {
    let timeSc = this.config.Args.fast ? CRONCtest : CRONC;
    cron.schedule(
      timeSc,
      async () => {
        try {
          resetTry();
          if (config.isRunning) {
            console.log(
              "Previous instance is still running. Skipping this execution."
            );
            return;
          }

          config.isRunning = true;

          const timeInUTC = moment().utc().format(UtcFormat);
          console.log(
            `[warn] Hi! Current time in UTC: ${timeInUTC}, ~{19}\`We start the Core.\``
          );
          try {
            await this.runWarp();
          } finally {
            console.log("running false");
            config.isRunning = false;
          }
          await this.stopWarpPlus();
        } catch (error) {
          console.log("[Core Error] " + error);
        }
      },
      {
        scheduled: true,
        timezone: UnixTimeISOtz,
      }
    );

    console.log("[info] ~{5}`Cron job scheduled. It will run every night.`");
  }

  Main() {
    initConfig(this.config.EnvConfig);
    //--------------------------------------------------------
    (async () => {
      if (this.config.Args.test) {
        await this.app();
      } else {
        this.StartCron();
      }
    })();
    //--------------------------------------------------------
  }
  //--------------------------------------------------------
}

new MainCC();

// do something when app is closing
// process.on("exit", exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
// process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
// process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
// process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

// process.on("uncaughtException", panicHandler);
