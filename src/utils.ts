import path = require('path');

export type PromiseOrImmediate<T> = T | Promise<T>;

export function cmp(a: string, b: string) {
    return a === b ? 0 :
        a > b ? -1 :
            1;
}

export function dirAndBase(filePath: string) {
    return {
        dir: path.dirname(filePath),
        base: path.basename(filePath)
    };
}

export function getPathComponents(pathMaybeWithWildcards: string) {
    const lastPart = path.basename(pathMaybeWithWildcards);
    if (lastPart.indexOf("*") >= 0) {
        return { path: path.dirname(pathMaybeWithWildcards), pattern: lastPart };
    } else {
        return { path: pathMaybeWithWildcards, pattern: "*" };
    }
}

export function assertNever(value: never, why: string): never {
    throw new Error(why);
}

export function isHtmlFile(filePath: string) {
    return fileHasExtension(filePath, ".html") || fileHasExtension(filePath, ".htm");
}

export function changeExtension(fileName: string, oldExtension: string, newExtension: string) {
    // TODO make smarter
    return fileName.replace(oldExtension, newExtension);
}

export function fileHasExtension(fileName: string, ext: string) {
    const fileExt = path.extname(fileName);
    return (ext === fileExt) || (("." + ext) === fileExt);
}

export function removeLeadingSlash(s: string) {
    return s[0] === '/' ? s.substr(1) : s;
}