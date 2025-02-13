// on the core ;)
// by S-MRB-S

process.stdin.resume(); // the program will not close instantly

//--------------------------------------------------------

import { Core } from "@marboris/core";
import puppeteer from "puppeteer";

import cron from "node-cron";
import moment from "moment-timezone";

import fs from "fs";
import axios from "axios";

import { GetDataGlassnode } from "./gl.js";
import { findOpenPort, startWarpPlus, stopWarpPlus } from "./exec.js";

//--------------------------------------------------------

let isRunning = false;

const MAX_RETRIES = 5;
let retryCount = 0;

let retryCountL1 = 0;
const MAX_RETRIES_L1 = 6;

//--------------------------------------------------------

function resetTry() {
  retryCountL1 = 0;
  retryCount = 0;
}

//--------------------------------------------------------

new (class extends Core {
  Main() {
    //--------------------------------------------------------
    let cachePort: number | undefined;
    const app = async (warpPort?: number) => {
      if (!cachePort) cachePort = warpPort || undefined;
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: this.config.EnvConfig.chrome,
          ...(this.config.Args.test
            ? {}
            : { args: ["--proxy-server=http://127.0.0.1:" + cachePort] }),
        });

        console.log("Puppeteer is starting...");
        const page = await browser.newPage();

        await page.deleteCookie(...(await page.cookies()));
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );
        await page.goto("https://studio.glassnode.com/home", {
          waitUntil: "networkidle0",
          timeout: this.config.EnvConfig.timeout,
        });
        await page.reload(); // we need clear cache like ctrl+F5

        console.log("We load the Glassnode site.. 8s waiting.");
        await new Promise((resolve) => setTimeout(resolve, 8000));

        try {
          await page.click('button[data-cy="login-btn"]');
        } catch (error) {
          console.log(`Error in L1: ${(error as Error).message}`);
          retryCountL1++;
          if (retryCountL1 < MAX_RETRIES_L1) {
            console.log(`Retrying... (${retryCountL1}/${MAX_RETRIES_L1})`);
            app(); // try again ..
            return;
          } else {
            console.log("[L1] Max retries reached. Restarting...");
            throw new Error("L1 dumped");
          }
        }

        console.log("Login button founded ! we sleep 8s more..");
        await new Promise((resolve) => setTimeout(resolve, 8000));

        try {
          await page.type('input[name="email"]', this.config.EnvConfig.email);
          await page.type(
            'input[name="current-password"]',
            this.config.EnvConfig.password
          );

          console.log("We try login...");
          await page.click("button.MuiButton-containedPrimary");
        } catch (error) {
          console.log(`Error in L1: ${(error as Error).message}`);
          retryCountL1++;
          if (retryCountL1 < MAX_RETRIES_L1) {
            console.log(`Retrying... (${retryCountL1}/${MAX_RETRIES_L1})`);
            app(); // try again ..
            return;
          } else {
            console.log("[L1] Max retries reached. Restarting...");
            throw new Error("L1 dumped");
          }
        }

        console.log("We login :D ! We 20s waiting for cookies.");
        await new Promise((resolve) => setTimeout(resolve, 20000));

        const cookies = await page.cookies();

        try {
          console.log("try to find main cookie!");

          const ajsCookie = cookies.find(
            (cookie) => cookie.name === "ajs_anonymous_id"
          );

          if (!ajsCookie || !ajsCookie.value) {
            throw new Error(
              "cookie ajs_anonymous_id not found or is null :( \n we try again."
            );
          }
        } catch (error) {
          console.log(`Error in L1: ${(error as Error).message}`);
          retryCountL1++;
          if (retryCountL1 < MAX_RETRIES_L1) {
            console.log(`Retrying... (${retryCountL1}/${MAX_RETRIES_L1})`);
            app(); // try again ..
            return;
          } else {
            console.log("[L1] Max retries reached. Restarting...");
            throw new Error("L1 dumped");
          }
        }

        const cookieString = cookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join(";");
        console.log(cookieString);

        let solData: string, dogeData: string;

        const sendDataToApi = async (data: any) => {
          try {
            const res = await axios.post(
              this.config.EnvConfig.databasep + "/feed/",
              JSON.stringify(data),
              {
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                timeout: 5000,
              }
            );
            console.log("Response:", res.status);
          } catch (error) {
            console.log("[Error] sendDataToApi => Axios error!");
            return;
            // throw error;
          }
        };

        // interface Eval {
        //   [key: string]: any;
        // }
        const processNodes = async (
          nodes: Array<{ node: string; saveTo: string }>
        ) => {
          let dogeTimestamp = null;
          let solTimestamp = null;

          try {
            const response = await axios.get(
              this.config.EnvConfig.databasep +
                "/feed/all_symbols/last_timestamps",
              {
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                timeout: 5000,
              }
            );

            if (response.status === 200) {
              let data;
              data = response.data.data || undefined;
              dogeTimestamp = data.DOGE || null;
              solTimestamp = data.SOL || null;
            } else {
              throw new Error("Error fetching data from API");
            }
          } catch (_) {
            console.log("Error in getting Timestamp from API!");
            dogeTimestamp = null;
            solTimestamp = null;
          }

          const promises = nodes.map(async ({ node, saveTo }) => {
            console.log("on:", node);
            const getData = new GetDataGlassnode(node, cookieString);

            let timeStamp;

            switch (node) {
              case "SOL":
                if (!solTimestamp) break;
                timeStamp = Math.floor(new Date(solTimestamp).getTime() / 1000);

                console.log(`SOL Timestamp: ${timeStamp}`);
                break;

              case "DOGE":
                if (!dogeTimestamp) break;
                timeStamp = Math.floor(
                  new Date(dogeTimestamp).getTime() / 1000
                );

                console.log(`DOGE Timestamp: ${timeStamp}`);

                break;
            }

            let data;
            if (timeStamp) {
              data = await getData.getLast(timeStamp);
            } else {
              data = await getData.getAll();
            }

            if (!data) {
              throw new Error("data is null!");
            }

            eval(`${saveTo} = JSON.stringify(data)`);
            // (this as Eval)[saveTo] = JSON.stringify(data);

            console.log("send data to api");
            if (!this.config.Args.test) {
              await sendDataToApi(data);
            }

            console.log("running false");
            isRunning = false;
          });

          await Promise.all(promises);
        };

        const nodes = [
          { node: "SOL", saveTo: "solData" },
          { node: "DOGE", saveTo: "dogeData" },
        ];

        processNodes(nodes).then(() => {
          console.log("All nodes processed");
          try {
            fs.writeFileSync("data-sol.json", solData!);
            console.log("saved");
            fs.writeFileSync("data-doge.json", dogeData!);
            console.log("saved");
          } catch (_) {
            console.log("Error in saving data to file!");
          }
        });
      } finally {
        try {
          await browser!.close();
        } catch (_) {
          console.log("Error in closing browser");
        }
      }
    };

    const run = () => {
      const pur = async () => {
        try {
          await stopWarpPlus();
          const port = await findOpenPort();
          console.log(`warp on: ${port}`);
          await startWarpPlus(port).catch((err: any) => {
            throw new Error(err);
          });
          app(port);
        } catch (error) {
          console.log(`Error in main: ${(error as Error).message}`);
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
            pur(); // try again ..
          } else {
            console.log("[error] Max retries reached. Aborting... :(");
          }
        }
      };
      let timeSc = this.config.Args.fast
        ? "*/3 * * * *"
        : this.config.EnvConfig.CRONC;
      cron.schedule(
        timeSc,
        () => {
          resetTry();
          if (isRunning) {
            console.log(
              "Previous instance is still running. Skipping this execution."
            );
            return; // اگر در حال اجرا است، از اجرای دوباره جلوگیری می‌کنیم
          }

          isRunning = true;

          setTimeout(() => {
            isRunning = false;
            stopWarpPlus();
          }, 290000);

          const timeInUTC = moment().utc().format("YYYY-MM-DD HH:mm:ss");
          console.log(
            `[warn] Hi! Current time in UTC: ${timeInUTC}, ~{19}\`We start the Core.\``
          );
          pur();
        },
        {
          scheduled: true,
          timezone: "UTC",
        }
      );
      console.log("[info] ~{5}`Cron job scheduled. It will run every night.`");
    };

    (() => {
      if (this.config.Args.test) {
        void app();
      } else {
        run();
      }
    })();
    //--------------------------------------------------------
  }
  //--------------------------------------------------------
})();
