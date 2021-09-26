import { Page } from "puppeteer";
import { sleep, pressBtn } from "./helpers";

type Counter = {
    counter: number;
};

enum Xpaths {
    connectBtn = "//button[contains(@aria-label,'Connect')]",
    hiddenConnectBtn = "//span[text()='Connect' and @aria-hidden='true']",
    moreActionsBtn = "aria/More actions",
}

async function connect(page: Page, link: string, connectionCounter: Counter) {
    if (await checkPending(page)) {
        console.log(`connection pending with ${link}`);
        return;
    } else if (await checkConnected(page)) {
        console.log(`already connected with ${link}`);
        return;
    }
    try {
        await page.waitForXPath(Xpaths.connectBtn, {
            timeout: 5000,
        });
    } catch (e) {
        console.log(`${link} hid their connect button`);

        let moreBtn = await page.waitForSelector(Xpaths.moreActionsBtn);
        await pressBtn(moreBtn);

        let hiddenConnectBtn = await page.$x(Xpaths.hiddenConnectBtn);
        await hiddenConnectBtn.at(0).click();
        await sleep(200);
    }

    let connectBtn = await page.$x("//button[contains(@aria-label,'Connect')]");
    await pressBtn(connectBtn.at(0));
    await sleep(1000);
    let sendBtn = await page.waitForSelector("aria/Send now");
    await pressBtn(sendBtn);

    if (await checkPending(page)) {
        connectionCounter["counter"] += 1;
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

export { connect, Counter };
