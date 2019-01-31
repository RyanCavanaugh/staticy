import path = require('path');

export function cmp(a: string, b: string) {
    return a === b ? 0 :
        a > b ? -1 :
        1;
}

export function assertNever(value: never, why: string) {
    throw new Error(why);
}

export function isHtmlFile(filePath: string) {
    const ext = path.extname(filePath);
    return (ext === ".html") || (ext === ".htm");
}
