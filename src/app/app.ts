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
      await browser.deleteCookie(...(await browser.cookies()));
      // await browser.deleteCookie(); // idk

      await page.setUserAgent(DefaultAgent);
      await page.setViewport({ width: 1280, height: 800 }); // TODO()
      await page.goto(HomePage, {
        waitUntil: "domcontentloaded", // domcontentloaded, networkidle0
        timeout: HomePageTimeout,
      });
      await page.reload();
      await page.screenshot({ path: "1-reload.png", fullPage: true });

      console.log("We load the Glassnode site.. 8s waiting.");
      await delay(15000);

      ///////////// ------------------------------------------- ///////////////////
      await page.click('button[data-cy="login-btn"]');

      // const loginBtn = await page.$('[data-cy="login-btn"]');
      // if (loginBtn) {
      //   await loginBtn.click();
      // } else {
      //   console.log("Login button not found!!!");
      //   throw new Error("! :(");
      // }

      // await page.evaluate(() => {
      //   const btn = document.querySelector('[data-cy="login-btn"]');
      //   if (btn) {
      //     (btn as HTMLElement).scrollIntoView();
      //     (btn as HTMLElement).click();
      //   }
      // });
      ///////////// ------------------------------------------- ///////////////////

      console.log("Login button founded ! we sleep 8s more..");
      await delay(18000);

      await page.screenshot({ path: "2-login-button.png", fullPage: true });

      try {
        const recaptchaIframe = await page.$('iframe[title="reCAPTCHA"]');

        if (recaptchaIframe) {
          console.log("reCAPTCHA iframe found!");
          throw new Error("reCAPTCHA founded :(");
        }
      } catch (_) {}

      const emailToFind = this.config.EnvConfig.EMAIL_GLASSNODE;

      await page.type('input[name="email"]', emailToFind);

      await page.type(
        'input[name="current-password"]',
        this.config.EnvConfig.PASSWORD_GLASSNODE
      );

      console.log("We try login...");
      await page.screenshot({ path: "3-type.png", fullPage: true });
      await page.click("button.MuiButton-containedPrimary");

      console.log("We logged in. 20s sleep for cookies.");
      await delay(20000);
      await page.screenshot({ path: "4-click-login.png", fullPage: true });

      // find userMenu_item-y3KcY class
      const selector = "span.userMenu_email-uv9Dx";
      const emailExists = await page
        .$eval(selector, (el) => el.textContent?.trim())
        .then((text) => text === emailToFind)
        .catch(() => false);

      if (!emailExists) {
        throw new Error(`خطا: ایمیل ${emailToFind} در صفحه یافت نشد.`);
      } else {
        console.log(`ایمیل ${emailToFind} با موفقیت پیدا شد.`);
      }

      // const cookies = await page.cookies();
      const cookies = await browser.cookies();

      const ajsCookie = cookies.find(
        (cookie) => cookie.name === MainCookieName
      );

      if (!ajsCookie || !ajsCookie.value) {
        throw new Error(
          `cookie ${MainCookieName} not found or is null :( \n we try again.`
        );
      }
      console.log(`ajsCookie: ${ajsCookie.name} ${ajsCookie.value}`);

      const cookieString = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join(";");

      await this.handler(cookieString, Nodes, this.cachePort!);
    } finally {
      try {
        await browser!.close();
      } catch (_) {}
    }
  }
}
