import { ExitStatus, sys } from "typescript";
import { readFile } from "fs/promises";

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

export { readLinks };
