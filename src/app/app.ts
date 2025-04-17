import puppeteer from "puppeteer";

import {
  chrome,
  DefaultAgent,
  headless,
  HomePage,
  HomePageTimeout,
  MainCookieName,
  Nodes,
  proxy,
} from "../config.js";
import { Handler } from "./app-handler.js";

export abstract class App extends Handler {
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
      await new Promise((resolve) => setTimeout(resolve, 15000));

      await page.screenshot({ path: 'debug.png' });

      // // await page.click('button[data-cy="login-btn"]');
      // const loginBtn = await page.$('[data-cy="login-btn"]');
      // if (loginBtn) {
      //   await loginBtn.click();
      // } else {
      //   console.log("Login button not found!!!");
        // throw new Error("! :(");
      // }

      console.log("Login button founded ! we sleep 8s more..");
      await new Promise((resolve) => setTimeout(resolve, 15000));

      try{
        const recaptchaIframe = await page.$('iframe[title="reCAPTCHA"]');

        if (recaptchaIframe) {
          console.log("reCAPTCHA iframe found!");
          throw new Error("reCAPTCHA founded :(");
        }
      }catch(_){}

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

      await this.handler(cookieString, Nodes);
    } finally {
      try {
        await browser!.close();
      } catch (_) {}
    }
  }
}
