import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Page } from "puppeteer-extra-plugin/dist/puppeteer";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { ExitStatus, sys } from "typescript";
import { ElementHandle } from "puppeteer";
import { readLinks } from "./utils/readFile";
import { sleep, pressBtn } from "./utils/helpers";

import { Counter, connect } from "./utils/connectHelper";

dotenv.config();

const mainURL = "https://linkedin.com/";
const signinURL =
    "https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin";
const password = process.env.PASSWORD;

const email = process.env.EMAIL;
enum Selectors {
    emailPhoneField = "aria/Email or Phone",
    passwordField = "aria/Password",
    signinBtn = "aria/Sign in",
    skipBtn = "button.secondary-action",
}

let connectionCounter: Counter = { counter: 0 };
const filePath = process.env.FILEPATH;
const profile = process.env.PROFILE;
const headless = process.env.HEADLESS === "true" ? true : false;

async function setup() {
    const browser = await puppeteer
        .use(StealthPlugin())
        .launch({ headless, args: profile ? [profile] : [] });
    const page = await browser.newPage();
    if (profile) {
        await page.goto(mainURL);
    } else {
        await page.goto(signinURL);
        await sleep(5000);
        await login(page);
        await sleep(5000);
        if (page.url().includes("add-phone")) {
            await handleAddPhone(page);
        }
    }

    return { page, browser };
}

async function login(page: Page) {
    //enter email
    const element = await page.waitForSelector(Selectors.emailPhoneField);
    await element.click({ clickCount: 4 });
    await element.type(email);

    //enter password
    const pswdElement = await page.waitForSelector(Selectors.passwordField);
    await pswdElement.click({ clickCount: 4 });
    await pswdElement.type(password);

    //click sign in button
    const signInBtnElement = await page.waitForSelector(Selectors.signinBtn);
    await pressBtn(signInBtnElement);
}

async function handleAddPhone(page: Page) {
    const skipBtn = await page.waitForSelector(Selectors.skipBtn);
    await pressBtn(skipBtn);
}

(async () => {
    const { page, browser } = await setup();
    const links = await readLinks(filePath);
    for (let i = 0; i < links.length; i++) {
        const prevConnections = connectionCounter["counter"];
        let link = links[i];
        await page.goto(link);
        await sleep(2000);
        await connect(page, link, connectionCounter);
        if (prevConnections < connectionCounter["counter"])
            console.log(`Connected with ${link}`);
        await sleep(2000);
    }
    console.log(`Total connections made: ${connectionCounter["counter"]}`);
    await browser.close();
    sys.exit(ExitStatus.Success);
})();
