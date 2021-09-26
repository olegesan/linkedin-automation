import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Page } from "puppeteer-extra-plugin/dist/puppeteer";
import dotenv from "dotenv";

dotenv.config();

const mainURL = "https://linkedin.com/";
const signinURL =
    "https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin";
const password = process.env.PASSWORD;

const email = "oleg.bazylnikov@gmail.com";
function sleep(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}

async function main() {
    const browser = await puppeteer
        .use(StealthPlugin())
        .launch({ headless: false });
    const page = await browser.newPage();
    page.goto(signinURL);
    await sleep(5000);
    await login(page);
    await sleep(5000);
    if (page.url().includes("add-phone")) {
        await handleAddPhone(page);
    }

    return page;
}

async function login(page: Page) {
    //enter email
    const element = await page.waitForSelector("aria/Email or Phone");
    await element.click();
    await element.type(email);

    //enter password
    const pswdElement = await page.waitForSelector("aria/Password");
    await pswdElement.click();
    await pswdElement.type(password);

    //click sign in button
    const signInBtnElement = await page.waitForSelector("aria/Sign in");
    await signInBtnElement.focus();
    await signInBtnElement.press("Enter");
}

async function handleAddPhone(page: Page) {
    const skipBtn = await page.waitForSelector("button.secondary-action");
    await skipBtn.focus();
    await skipBtn.press("Enter");
}

(async () => {
    const page = await main();
    // await page.close();
})();
