// on the core ;)
// by S-MRB-S

// process.stdin.resume(); // the program will not close instantly

//--------------------------------------------------------
import { Core } from "@marboris/core";

import cron from "node-cron";
import moment from "moment-timezone";

import WarpManager from "./misc/warp.js";
import {
  CRONC,
  CRONCtest,
  initConfig,
  MAX_RETRIES,
  UnixTimeISOtz,
  UtcFormat,
} from "./config/index.js";
import { config, resetTry } from "./app/config/index.js";
import { App as AppClass } from "./app/index.js";

//--------------------------------------------------------
export class MainCC extends Core {
  Main() {
    initConfig(this.config.EnvConfig);

    const pur = async () => {
      try {
        const App = new AppClass(this);

        await WarpManager.stopWarpPlus();
        const port = await WarpManager.findOpenPort();
        console.log(`warp on: ${port}`);
        await WarpManager.startWarpPlus(port);
        AppClass.setPort(port);
        await App.app();
      } catch (error) {
        console.log(`Error in main: ${(error as Error).message}`);
        config.retryCount++;
        if (config.retryCount < MAX_RETRIES) {
          console.log(`Retrying... (${config.retryCount}/${MAX_RETRIES})`);
          await pur(); // try again ..
        } else {
          console.log("[error] Max retries reached. Aborting... :(");
        }
      }
    };

    const StartCron = () => {
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
            await pur();
            console.log("running false");
            config.isRunning = false;
            await WarpManager.stopWarpPlus();
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
    };

    (async () => {
      if (this.config.Args.test) {
        const App = new AppClass(this);

        console.log('run')
        await App.app();
        console.log('end')
      } else {
        StartCron();
      }
    })();
    //--------------------------------------------------------
  }
  //--------------------------------------------------------
}

new MainCC();
