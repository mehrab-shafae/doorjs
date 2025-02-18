import fs from "fs";
import axios from "axios";

import puppeteer from "puppeteer";

import { GetDataGlassnode } from "./glassnode/index.js";

import {
  chrome,
  DefaultAgent,
  headless,
  HomePage,
  HomePageTimeout,
  MainCookieName,
  MAX_RETRIES_L1,
  databasepGet,
  databasepSave,
  proxy,
} from "../config/index.js";
import { config } from "./config/index.js";
import { Core } from "@marboris/core";

export class App extends Core {
  protected Main(): void {}

  constructor(core: Core) {
    super();
    Object.assign(this, core);
  }

  public async app(warpPort?: number) {
    //--------------------------------------------------------
    let cachePort: number | undefined;
    if (!cachePort) cachePort = warpPort || undefined;
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: headless ? true : false,
        executablePath: chrome,
        ...(this.config.Args.test && !proxy
          ? {}
          : { args: ["--proxy-server=http://127.0.0.1:" + cachePort] }),
      });

      console.log("Puppeteer is starting...");
      const page = await browser.newPage();

      await page.deleteCookie(...(await page.cookies()));
      await page.setUserAgent(DefaultAgent);
      await page.goto(HomePage, {
        waitUntil: "networkidle0",
        timeout: HomePageTimeout,
      });
      await page.reload(); // we need clear cache like ctrl+F5

      console.log("We load the Glassnode site.. 8s waiting.");
      await new Promise((resolve) => setTimeout(resolve, 8000));

      try {
        await page.click('button[data-cy="login-btn"]');
      } catch (error) {
        console.log(`Error in L1: ${(error as Error).message}`);
        config.retryCountL1++;
        if (config.retryCountL1 < MAX_RETRIES_L1) {
          console.log(`Retrying... (${config.retryCountL1}/${MAX_RETRIES_L1})`);
          this.app(); // try again ..
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
        config.retryCountL1++;
        if (config.retryCountL1 < MAX_RETRIES_L1) {
          console.log(`Retrying... (${config.retryCountL1}/${MAX_RETRIES_L1})`);
          this.app(); // try again ..
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
          (cookie) => cookie.name === MainCookieName
        );

        if (!ajsCookie || !ajsCookie.value) {
          throw new Error(
            `cookie ${MainCookieName} not found or is null :( \n we try again.`
          );
        }
      } catch (error) {
        console.log(`Error in L1: ${(error as Error).message}`);
        config.retryCountL1++;
        if (config.retryCountL1 < MAX_RETRIES_L1) {
          console.log(`Retrying... (${config.retryCountL1}/${MAX_RETRIES_L1})`);
          this.app(); // try again ..
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
            this.config.EnvConfig.databasep +
              databasepSave,
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

      interface Eval {
        [key: string]: any;
      }

      const processNodes = async (
        nodes: Array<{ node: string; saveTo: string }>
      ) => {
        let dogeTimestamp = null;
        let solTimestamp = null;

        try {
          const response = await axios.get(
            this.config.EnvConfig.databasep +
              databasepGet,
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
              timeStamp = Math.floor(new Date(dogeTimestamp).getTime() / 1000);

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

          // eval(`${saveTo} = JSON.stringify(data)`);
          (this as Eval)[saveTo] = JSON.stringify(data);

          console.log("send data to api");
          if (!this.config.Args.test) {
            await sendDataToApi(data);
          }
        });

        await Promise.all(promises);
      };

      const nodes = [
        { node: "SOL", saveTo: "solData" },
        { node: "DOGE", saveTo: "dogeData" },
      ];

      await processNodes(nodes);
      console.log("All nodes processed");
      try {
        if(this.config.Args.fast){
          fs.writeFileSync("data-sol.json", solData!);
          console.log("saved");
          fs.writeFileSync("data-doge.json", dogeData!);
          console.log("saved");
        }
      } catch (_) {
        console.log("Error in saving data to file!");
      }
    } finally {
      try {
        await browser!.close();
      } catch (_) {
        console.log("Error in closing browser");
      }
    }
  }
}
