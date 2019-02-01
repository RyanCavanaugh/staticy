import { createSite, Site } from "./site";
import { staticTextContent } from "./file-providers";

async function getAndGenerate(site: Site, serverPath: string) {
    return await (await site.getFileByServerPath(serverPath))!.generate();
}

test("Site returns a file", async () => {
    const site = createSite();
    site.addFileProvider(staticTextContent("hello world", "/file1.txt"));
    const result = await getAndGenerate(site, "/file1.txt");
    expect(result.kind).toBe("text");
    if (result.kind === "text") {
        const text = await result.getText();
        expect(text).toBe("hello world");
    }
});

test("Site rejects multiple providers for the same file", async () => {
    const site = createSite();
    site.addFileProvider(staticTextContent("hello world", "/file1.txt"));
    site.addFileProvider(staticTextContent("goodbye planet", "/file1.txt"));
    const result = await getAndGenerate(site, "/file1.txt");
    expect(result.kind).toBe("error");
});

