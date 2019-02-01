import fs = require("fs-extra");
import process = require("process");
import path = require("path");
import FileProvider from "./file-provider";
import ServerFile from "./server-file";
import { updateWatchOfFile } from "./shared-watcher";
import { isHtmlFile } from "./utils";

const watchToken = {};

export type FolderOptions = {
    filePattern?: string | string[];
}
export function staticFolder(localFolderPath: string, serverPath: string, folderOptions?: FolderOptions): FileProvider {
    return {
        async getServerFiles() {
            
        }
    };
}

export function staticTextContent(content: string, serverPath: string, mimeType?: string): FileProvider {
    const file: ServerFile = {
        serverPath,
        description: "static content",
        async generate() {
            return {
                kind: "text",
                mimeType,
                async getText() {
                    return content;
                }
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

export function staticFile(localFilePath: string, serverPath: string): FileProvider {
    const file: ServerFile = {
        serverPath,
        description: `from ${path.relative(process.cwd(), localFilePath)}`,
        async generate(invalidate) {
            if (invalidate) {
                updateWatchOfFile(localFilePath, watchToken, invalidate);
            }
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

