import puppeteer from "puppeteer";
import { chromePath } from "./chrome/path.js";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
});

{
  const page = await browser.newPage();

  await page.goto("https://studio.glassnode.com/home", { waitUntil: 'networkidle0', timeout: 20000 });
  await page.reload({ ignoreCache: true });

  await new Promise(resolve => setTimeout(resolve, 5000));

  await page.click('button[data-cy="login-btn"]');

  await new Promise(resolve => setTimeout(resolve, 5000));

  await page.screenshot({ path: "example2.png" });

  await browser.close();
}
