// on the core ;)
import { Core } from "@marboris/core";
import puppeteer from "puppeteer";

import cron from "node-cron";
import moment from "moment-timezone";

new (class extends Core {
  Main() {
    /*
    const _cron = cron.schedule(
      "30 1 * * *", // 1:30 PM
      () => {
        const timeInUTC = moment().utc().format("YYYY-MM-DD HH:mm:ss");
        console.log(
          `[warn] Hi! Current time in UTC: ${timeInUTC}, ~{19}\`We start the Core.\``
        ); */
    try {
      (async () => {
        let browser;

        if (this.config.Args.test) {
          browser = await puppeteer.launch({
            headless: true,
            executablePath: this.config.EnvConfig.chrome,
          });
        } else {
          browser = await puppeteer.launch({
            headless: true,
            executablePath: this.config.EnvConfig.chrome,
            args: ["--proxy-server=" + this.config.EnvConfig.proxy],
          });
        }

        {
          const page = await browser.newPage();

          await page.deleteCookie(...(await page.cookies()));
          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          );
          await page.goto("https://studio.glassnode.com/home", {
            waitUntil: "networkidle0",
            timeout: this.config.EnvConfig.timeout,
          });
          await page.reload(); // we need clear cache like F5

          await new Promise((resolve) => setTimeout(resolve, 8000));

          await page.screenshot({ path: "1.png" });

          await page.click('button[data-cy="login-btn"]');

          await new Promise((resolve) => setTimeout(resolve, 5000));

          await page.screenshot({ path: "2.png" });

          await page.type('input[name="email"]', this.config.EnvConfig.email);
          await page.type(
            'input[name="current-password"]',
            this.config.EnvConfig.password
          );

          await page.click("button.MuiButton-containedPrimary");

          await new Promise((resolve) => setTimeout(resolve, 20000));

          await page.screenshot({ path: "3.png" });

          const cookies = await page.cookies();
          const cookieString = cookies
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join(";");
          console.log(cookieString);

          await browser.close();
        }
      })();
    } catch (e) {
      console.log(`[error] ~{19}\`Main\`: ${e}`);
    }
    /*
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    console.log("[info] ~{5}`Cron job scheduled. It will run every night.`");
    */
  }
})();
