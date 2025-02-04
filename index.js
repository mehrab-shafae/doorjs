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

  await page.screenshot({ path: "example1.png" });

  await page.click('button[data-cy="login-btn"]');

  await new Promise(resolve => setTimeout(resolve, 8000));
  await page.screenshot({ path: "example2.png" });

  await page.type('input[name="email"]', 'gowale4557@maonyn.com');

  await page.type('input[name="current-password"]', '_CTnHEaGSh-ye4M');

  await page.click('button.MuiButton-containedPrimary');

  await new Promise(resolve => setTimeout(resolve, 8000));

  await page.screenshot({ path: "example3.png" });

  const cookies = await page.cookies();
  console.log(cookies);

  await browser.close();
}
