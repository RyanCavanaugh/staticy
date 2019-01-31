import fs = require("fs-extra");
import process = require("process");
import path = require("path");
import FileProvider from "./file-provider";
import ServerFile from "./server-file";

export function staticFile(localFilePath: string, serverPath: string): FileProvider {
    const file: ServerFile = {
        serverPath,
        description: `from ${path.relative(process.cwd(), localFilePath)}`,
        async generate(invalidate) {
            return {
                kind: "raw",
                getBuffer() {
                    return fs.readFile(localFilePath);
                }
            };
        }
    };
    const files = [file];

    return {
        async getServerFiles() {
            return files;
        }
    };
}

