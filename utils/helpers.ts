import { ElementHandle } from "puppeteer";

function sleep(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}

async function pressBtn(btn: ElementHandle<Element>): Promise<void> {
    await btn.focus();
    await btn.press("Enter");
}

export { pressBtn, sleep };
