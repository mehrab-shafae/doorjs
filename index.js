import puppeteer from "puppeteer";
// Or import puppeteer from 'puppeteer-core';
import { chromePath } from "./chrome/path.js";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath, // مسیر Chrome نصب شده
});

{
  // راه‌اندازی مرورگر
  const page = await browser.newPage();

  await page.goto("https://studio.glassnode.com/home", { waitUntil: 'networkidle0', timeout: 1000000 });
  await page.reload({ ignoreCache: true });

  // صبر کردن به مدت 60 ثانیه (60000 میلی‌ثانیه)
  await new Promise(resolve => setTimeout(resolve, 30000));

  // await page.screenshot({ path: "example.png" });

  // await page.click('button[data-cy="login-btn"]');

  // // صبر کردن به مدت 20 ثانیه (20000 میلی‌ثانیه)
  // await new Promise(resolve => setTimeout(resolve, 20000));

  // گرفتن اسکرین‌شات
  await page.screenshot({ path: "example2.png" });

  // بستن مرورگر
  await browser.close();
}

// const page = await browser.newPage();

// // Navigate the page to a URL.
// await page.goto("https://developer.chrome.com/");

// // Set screen size.
// await page.setViewport({ width: 1080, height: 1024 });

// // Type into search box.
// await page.locator(".devsite-search-field").fill("automate beyond recorder");

// // Wait and click on first result.
// await page.locator(".devsite-result-item-link").click();

// // Locate the full title with a unique string.
// const textSelector = await page
//   .locator("text/Customize and automate")
//   .waitHandle();
// const fullTitle = await textSelector?.evaluate((el) => el.textContent);

// // Print the full title.
// console.log('The title of this blog post is "%s".', fullTitle);

// await browser.close();
