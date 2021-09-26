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
const filePath = "./linkedins.json";
function sleep(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}
const profile =
    "--user-data-dir=/Users/olegbaz/Library/Application Support/Google/Chrome/Default";

async function main() {
    const browser = await puppeteer
        .use(StealthPlugin())
        .launch({ headless: false, args: profile ? [profile] : [] });
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

    return page;
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

(async () => {
    const page = await main();
    const links = await readLinks(filePath);
    for (let i = 0; i < links.length; i++) {
        let link = links[i];
        await page.goto(link);
        await sleep(2000);
    }
    // await page.close();
})();
