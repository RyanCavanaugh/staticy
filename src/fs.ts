import fsExtra = require('fs-extra');

export default interface fs {
    writeTextFile(path: string, text: string): Promise<void>;
    writeBinaryFile(path: string, data: Buffer): Promise<void>;

    readTextFile(path: string): Promise<string>;
    readBinaryFile(path: string): Promise<Buffer>;

    ls(path: string): Promise<ReadonlyArray<string>>;

    mkdir(path: string): Promise<void>;
}

export const realFs: fs = {
    writeTextFile(path, text) {
        return fsExtra.writeFile(text, path, "utf-8");
    },
    writeBinaryFile(path, data) {
        return fsExtra.writeFile(data, path);
    },
    readTextFile(path) {
        return fsExtra.readFile(path, "utf-8");
    },
    readBinaryFile(path) {
        return fsExtra.readFile(path);
    },
    ls(path) {
        return fsExtra.readdir(path);
    },
    mkdir(path) {
        return fsExtra.ensureDir(path);
    }
}