import fs = require("fs-extra");
import process = require("process");
import path = require("path");
import FileProvider from "./file-provider";
import ServerFile from "./server-file";
import { updateWatchOfFile } from "./shared-watcher";
import { isHtmlFile } from "./utils";

const watchToken = {};

export function staticFile(localFilePath: string, serverPath: string): FileProvider {
    const file: ServerFile = {
        serverPath,
        description: `from ${path.relative(process.cwd(), localFilePath)}`,
        async generate(invalidate) {
            updateWatchOfFile(localFilePath, watchToken, invalidate);
            if (isHtmlFile(localFilePath)) {
                return {
                    kind: "text",
                    async getText() {
                        return fs.readFile(localFilePath, "utf-8");
                    }
                };
            } else {
                return {
                    kind: "raw",
                    getBuffer() {
                        return fs.readFile(localFilePath);
                    }
                };
            }
        }
    };
    const files = [file];

    return {
        async getServerFiles() {
            return files;
        }
    };
}

