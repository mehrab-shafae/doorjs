import { launch } from 'puppeteer';
import CloudflareBypasser from './cf.js'; // فرض کنید کد قبلی در فایل CloudflareBypasser.js ذخیره شده است

(async () => {
    // راه‌اندازی مرورگر
    const browser = await launch({ headless: false }); // headless: false برای دیدن مرورگر
    const page = await browser.newPage();

    // آدرس وب‌سایت مورد نظر را وارد کنید
    await page.goto('https://nearblocks.io/charts/txns'); // آدرس وب‌سایت که نیاز به دور زدن Cloudflare دارد

    // ایجاد یک نمونه از CloudflareBypasser
    const bypasser = new CloudflareBypasser(page, 5, true); // 5 تلاش برای دور زدن و لاگ‌گذاری فعال

    // تلاش برای دور زدن
    await bypasser.bypass();

    // در صورت موفقیت، می‌توانید به کارهای دیگر ادامه دهید
    if (await bypasser.isBypassed()) {
        console.log("Bypass was successful!");
        // می‌توانید اطلاعات صفحه را بگیرید یا کارهای دیگر انجام دهید
    } else {
        console.log("Bypass failed.");
    }

    // بستن مرورگر
    await browser.close();
})();
