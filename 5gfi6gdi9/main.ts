// on the core ;)
// by S-MRB-S

process.stdin.resume(); // the program will not close instantly

//--------------------------------------------------------
import { Core } from "@marboris/core";

import cron from "node-cron";
import moment from "moment-timezone";

import { findOpenPort, startWarpPlus, stopWarpPlus } from "./misc/exec.js";
import { initConfig, MAX_RETRIES } from "./config/index.js";
import { config, resetTry } from "./app/config/index.js";

//--------------------------------------------------------
export class MainCC extends Core {
  async Main() {
    initConfig(this.config.EnvConfig);
    const { App: AppClass } = await import("./app/index.js");

    const App = new AppClass(this);

    const pur = async () => {
      try {
        await stopWarpPlus();
        console.log("FIND PORT");
        const port = await findOpenPort();
        console.log(`warp on: ${port}`);
        await startWarpPlus(port).catch((err: any) => {
          throw new Error(err);
        });
        await App.app(port);
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
      let timeSc = this.config.Args.fast
        ? this.config.EnvConfig.CRONCtest
        : this.config.EnvConfig.CRONC;
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

            setTimeout(async () => {
              config.isRunning = false;
              await stopWarpPlus();
            }, 290000);

            const timeInUTC = moment()
              .utc()
              .format(this.config.EnvConfig.UtcFormat);
            console.log(
              `[warn] Hi! Current time in UTC: ${timeInUTC}, ~{19}\`We start the Core.\``
            );
            await pur();
          } catch (error) {
            console.log("[Core Error] " + error);
          }
        },
        {
          scheduled: true,
          timezone: this.config.EnvConfig.UnixTimeISOtz,
        }
      );
      console.log("[info] ~{5}`Cron job scheduled. It will run every night.`");
    };

    (async () => {
      if (this.config.Args.test) {
        await App.app();
      } else {
        StartCron();
      }
    })();
    //--------------------------------------------------------
  }
  //--------------------------------------------------------
}

new MainCC();
