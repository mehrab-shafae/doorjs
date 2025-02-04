import puppeteer from "puppeteer";

let browser;
const proxy = "--proxy-server=http://127.0.0.1:7273";

try {
  browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome-stable",
    args: [proxy],
  });
} catch (e) {
  browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: [proxy],
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
    timeout: 60000,
  });
  await page.reload({ ignoreCache: true });

  await new Promise((resolve) => setTimeout(resolve, 8000));

  //await page.screenshot({ path: "example1.png" });

  await page.click('button[data-cy="login-btn"]');

  await new Promise((resolve) => setTimeout(resolve, 5000));

  //await page.screenshot({ path: "example2.png" });

  await page.type('input[name="email"]', "gowale4557@maonyn.com");
  await page.type('input[name="current-password"]', "_CTnHEaGSh-ye4M");

  await page.click("button.MuiButton-containedPrimary");

  await new Promise((resolve) => setTimeout(resolve, 20000));

  //await page.screenshot({ path: "example3.png" });

  const cookies = await page.cookies();
  const cookieString = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join(";");
  console.log(cookieString);

  await browser.close();
}
