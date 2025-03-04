import fs from "fs";
import axios from "axios";

import puppeteer from "puppeteer";

import { GetDataGlassnode } from "./glassnode-getter.js";

import {
  chrome,
  DefaultAgent,
  headless,
  HomePage,
  HomePageTimeout,
  MainCookieName,
  databasepGet,
  databasepSave,
  proxy,
} from "../config.js";

export abstract class App extends GetDataGlassnode {
  private cachePort: number | undefined;

  public setPort(warpPort: number) {
    this.cachePort = warpPort;
  }

  public async app() {
    //--------------------------------------------------------
    let browser;
    try {
      const configB: any = {
        headless: headless ? true : false,
        executablePath: chrome,
        ...(proxy === 1
          ? !this.config.Args.test
            ? { args: ["--proxy-server=http://127.0.0.1:" + this.cachePort] }
            : {}
          : {}),
      };
      browser = await puppeteer.launch(configB);

      console.log("Puppeteer is starting...");
      const page = await browser.newPage();

      await page.deleteCookie(...(await page.cookies()));
      await page.setUserAgent(DefaultAgent);
      await page.goto(HomePage, {
        waitUntil: "networkidle0",
        timeout: HomePageTimeout,
      });
      await page.reload();

      console.log("We load the Glassnode site.. 8s waiting.");
      await new Promise((resolve) => setTimeout(resolve, 8000));

      await page.click('button[data-cy="login-btn"]');

      console.log("Login button founded ! we sleep 8s more..");
      await new Promise((resolve) => setTimeout(resolve, 8000));

      await page.type(
        'input[name="email"]',
        this.config.EnvConfig.EMAIL_GLASSNODE
      );
      await page.type(
        'input[name="current-password"]',
        this.config.EnvConfig.PASSWORD_GLASSNODE
      );

      console.log("We try login...");
      await page.click("button.MuiButton-containedPrimary");

      console.log("We login :D ! We 20s waiting for cookies.");
      await new Promise((resolve) => setTimeout(resolve, 20000));

      const cookies = await page.cookies();

      console.log("try to find main cookie!");

      const ajsCookie = cookies.find(
        (cookie) => cookie.name === MainCookieName
      );

      if (!ajsCookie || !ajsCookie.value) {
        throw new Error(
          `cookie ${MainCookieName} not found or is null :( \n we try again.`
        );
      }

      const cookieString = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join(";");
      console.log(cookieString);

      let solData: string, dogeData: string;

      const sendDataToApi = async (data: any) => {
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
          console.log("Response:", res.status);
        } catch (error) {
          console.log("[Error] sendDataToApi => Axios error!");
          return;
        }
      };

      const processNodes = async (
        nodes: Array<{ node: string; saveTo: string }>
      ) => {
        let dogeTimestamp = null;
        let solTimestamp = null;

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
          this.getDataGlassnode(node, cookieString);

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

          let data: any;
          if (timeStamp) {
            data = await this.getLast(timeStamp);
          } else {
            data = await this.getAll();
          }

          if (!data) {
            throw new Error("data is null!");
          }

          eval(`${saveTo} = JSON.stringify(data)`);

          console.log("send data to api");
          await sendDataToApi(data);

          function getLength() {
            if (Array.isArray(data)) {
                return data.length;
            } else if (typeof data === 'object' && data !== null) {
                return Object.keys(data).length;
            } else {
                return 0;
            }
          }
          console.log("length: ", getLength());
        
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
        if (this.config.Args.fast) {
          fs.writeFileSync("data-sol.json", solData!);
          fs.writeFileSync("data-doge.json", dogeData!);
        }
      } catch (_) {
        console.log("Error in saving data to file!");
      }
    } finally {
      try {
        await browser!.close();
      } catch (_) {
      }
    }
  }
}
