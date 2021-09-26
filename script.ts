import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Page } from "puppeteer-extra-plugin/dist/puppeteer";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { ExitStatus, sys } from "typescript";

dotenv.config();

const mainURL = "https://linkedin.com/";
const signinURL =
    "https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin";
const password = process.env.PASSWORD;

const email = process.env.EMAIL;
enum Selectors {}

let connectionCounter = 0;
const filePath = "./linkedins.json";
function sleep(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}
// const profile =
//     "--user-data-dir=/Users/olegbaz/Library/Application Support/Google/Chrome/Default";
const profile = "";

async function setup() {
    const browser = await puppeteer
        .use(StealthPlugin())
        .launch({ headless: true, args: profile ? [profile] : [] });
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
    const element = await page.waitForSelector("aria/Email or Phone");
    await element.click({ clickCount: 4 });
    await element.type(email);

    //enter password
    const pswdElement = await page.waitForSelector("aria/Password");
    await pswdElement.click({ clickCount: 4 });
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

async function readLinks(filepath: string): Promise<string[]> {
    const fileType = () => {
        const arr = filepath.split(".");
        const extension = arr[arr.length - 1];
        return extension;
    };
    const allowedFormats = ["txt", "json"];
    const extension = fileType();
    if (!allowedFormats.includes(extension)) {
        console.log("Unknown file extension. Try again");
        sys.exit(ExitStatus.DiagnosticsPresent_OutputsGenerated);
    }
    let dataRaw = await readFile(filepath);
    switch (extension) {
        case "txt":
            let data = dataRaw.toString().replaceAll(`"`, "").split(",");

            let output = data.reduce(reducer, []);
            return output;
        case "json":
            let dataJson = JSON.parse(dataRaw.toString());
            return (Object.values(dataJson) as Array<string>).reduce(
                reducer,
                []
            );
        default:
            console.log("No linkedin links found");
            sys.exit(ExitStatus.DiagnosticsPresent_OutputsGenerated);
    }
}

/**
 * Reducer method user to only add links from linkedin
 * @param {string[]} prev previous value
 * @param link current link value
 * @returns an array of normalized linkedin links
 */
function reducer(prev: string[], link: string): string[] {
    if (link.includes("linkedin.com")) {
        prev.push(normalizeLink(link.trim()));
    }
    return prev;
}

function normalizeLink(link: string) {
    //todo rebuild with regex
    return link.includes("https://www.") || link.includes("http")
        ? link
        : `https://www.${link}`;
}

async function connect(page: Page, link: string) {
    if (await checkPending(page)) {
        console.log(`connection pending with ${link}`);
        return;
    } else if (await checkConnected(page)) {
        console.log(`already connected with ${link}`);
        return;
    }
    try {
        await page.waitForXPath("//button[contains(@aria-label,'Connect')]", {
            timeout: 5000,
        });
    } catch (e) {
        console.log(`${link} hid their connect button`);

        let moreBtn = await page.waitForSelector("aria/More actions");
        await moreBtn.focus();
        await moreBtn.press("Enter");

        let hiddenConnectBtn = await page.$x(
            "//span[text()='Connect' and @aria-hidden='true']"
        );
        await hiddenConnectBtn.at(0).click();
        await sleep(200);
    }

    let connectBtn = await page.$x("//button[contains(@aria-label,'Connect')]");
    await connectBtn.at(0).focus();
    await connectBtn.at(0).press("Enter");
    await sleep(1000);
    let sendBtn = await page.waitForSelector("aria/Send now");
    await sendBtn.focus();
    await sendBtn.press("Enter");

    if (await checkPending(page)) {
        connectionCounter += 1;
    } else {
        console.log(`Not connected to ${link}`);
    }
}

async function checkPending(page: Page): Promise<boolean> {
    try {
        await page.waitForXPath(
            "//*[contains(@aria-label,'An invitation has been sent') or contains(text(),'An invitation has been sent')]",
            { timeout: 5000 }
        );
        let pendingArr = await page.$x(
            "//*[contains(@aria-label,'An invitation has been sent') or contains(text(),'An invitation has been sent')]"
        );
        return pendingArr.length > 0;
    } catch (e) {
        return false;
    }
}

async function checkConnected(page: Page): Promise<boolean> {
    try {
        await page.waitForXPath('//*[contains(.,"Remove Connection")]', {
            timeout: 5000,
        });
        let connectedArr = await page.$x(
            '//*[contains(.,"Remove Connection")]'
        );
        return connectedArr.length > 0;
    } catch (e) {
        return false;
    }
}
(async () => {
    const { page, browser } = await setup();
    const links = await readLinks(filePath);
    for (let i = 0; i < links.length; i++) {
        const prevConnections = connectionCounter;
        let link = links[i];
        await page.goto(link);
        await sleep(2000);
        await connect(page, link);
        if (prevConnections < connectionCounter)
            console.log(`Connected with ${link}`);
        await sleep(2000);
    }
    console.log(`Total connections made: ${connectionCounter}`);
    await browser.close();
    sys.exit(ExitStatus.Success);
})();
