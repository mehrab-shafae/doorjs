import puppeteer from "puppeteer";

import {
  chrome,
  DefaultAgent,
  headless,
  HomePage,
  HomePageTimeout,
  Nodes,
  proxy,
} from "../config.js";
import { Handler } from "./app-handler.js";
import { delay } from "../misc/index.js";

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
      await browser.deleteCookie(...(await browser.cookies())); // TODO()

      await page.setUserAgent(DefaultAgent); // TODO()
      await page.setViewport({ width: 1280, height: 800 }); // TODO()
      await page.goto(HomePage, {
        waitUntil: "domcontentloaded", // domcontentloaded or networkidle0
        timeout: HomePageTimeout,
      });
      await page.reload();

      console.log("We load the Glassnode site.. 8s waiting.");
      await delay(15000);

      await page.click('button[data-cy="login-btn"]');

      console.log("Login button founded ! we sleep 8s more..");
      await delay(18000); // TODO()

      const recaptchaIframe = await page.$('iframe[title="reCAPTCHA"]');

      if (recaptchaIframe) {
        console.log("reCAPTCHA iframe found!");
        throw new Error("reCAPTCHA founded :(");
      }

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

      console.log("We logged in. 20s sleep for cookies.");
      await delay(20000);

      const currentUrl = page.url();

      if (currentUrl === 'https://studio.glassnode.com/home' || currentUrl === 'https://studio.glassnode.com/home?') {
        console.log('URL درست است:', currentUrl);
      } else {
        console.error('خطا: URL نادرست. URL فعلی:', currentUrl);
        // throw new Error("We not on home !");
      }

      const cookies = await browser.cookies();

      /*MainCookieName = _s // old: hj_..
      const ajsCookie = cookies.find(
        (cookie) => cookie.name === MainCookieName
      );

      if (!ajsCookie || !ajsCookie.value) {
        throw new Error(
          `cookie ${MainCookieName} not found or is null :( \n we try again.`
        );
      }
      console.log(`ajsCookie: ${ajsCookie.name} ${ajsCookie.value}`);*/

      // Send all cookies created
      const cookieString = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join(";");

      await this.handler(cookieString, Nodes, this.cachePort!);
    } finally {
      try {
        await browser!.close();
      } catch (_) { }
    }
  }
}
