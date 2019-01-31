import fsExtra = require('fs-extra');

export default interface fs {
    writeTextFile(path: string, text: string): Promise<void>;
    writeBinaryFile(path: string, data: Buffer): Promise<void>;

    readTextFile(path: string): Promise<string>;
    readBinaryFile(path: string): Promise<Buffer>;

    ls(path: string): Promise<ReadonlyArray<string>>;
}



