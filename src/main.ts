// on the core ;)
// by S-MRB-S

//--------------------------------------------------------
process.stdin.resume();

import { Core } from "@marboris/core";

import cron from "node-cron";
import moment from "moment-timezone";

import WarpManager from "./warp-manager.js";
import {
  CRONC,
  CRONCtest,
  initConfig,
  MAX_RETRIES,
  UnixTimeISOtz,
  UtcFormat,
} from "./config.js";
import { config, resetTry } from "./app/app-config.js";
import { App as AppClass } from "./app/app.js";

//--------------------------------------------------------
export class MainCC extends Core {
  Main() {
    initConfig(this.config.EnvConfig);

    function exitHandler(options: any, exitCode: any) {
      console.log("exit handler called");
      if (options.cleanup) console.log("clean");

      // try {
      //   stopWarpPlus()
      //     .then(() => {
      // if (exitCode || exitCode === 0) console.log(exitCode);
      //       if (options.exit) process.exit();
      //     })
      //     .catch((error) => {
      //       console.error(`[Error] ${error.message}`);
      //       if (options.exit) process.exit();
      //     });
      // } catch (_) {}
    }

    //--------------------------------------------------------

    // do something when app is closing
    // process.on("exit", exitHandler.bind(null, { cleanup: true }));

    // catches ctrl+c event
    // process.on("SIGINT", exitHandler.bind(null, { exit: true }));

    // catches "kill pid" (for example: nodemon restart)
    // process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
    // process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

    process.on("uncaughtException", exitHandler.bind(null, { exit: true }));

    const pur = async () => {
      try {
        const App = new AppClass(this);

        await WarpManager.stopWarpPlus();
        const port = await WarpManager.findOpenPort();
        console.log(`warp on: ${port}`);
        function Panic() {
          throw new Error("Panic called");
        }
        await WarpManager.startWarpPlus(port, Panic);
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
