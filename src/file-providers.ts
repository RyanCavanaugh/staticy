/*!
 * Provides a set of convenient built-in file providers
 */

import fs = require("fs-extra");
import process = require("process");
import path = require("path");
import diffmap from "./diffmap";
import FileProvider from "./file-provider";
import ServerFile, { GenerationContext, ServerFileResponse } from "./server-file";
import { updateWatchOfFile } from "./shared-watcher";
import { isHtmlFile } from "./utils";

const watchToken = {};

export type FolderOptions = {
    // Not Implemented Yet
    // filePattern?: string | string[];

    // Not Implemented Yet
    // recursive?: boolean
}

export function staticFolder(localFolderPath: string, serverPath: string, folderOptions?: FolderOptions): FileProvider {
    const map = diffmap<ServerFile>({
        create(relativeLocalPath) {
            return {
                serverPath: path.join(serverPath, relativeLocalPath),
                async generate(context) {
                    return createStaticFileResponse(path.join(localFolderPath, relativeLocalPath), context);
                }
            };
        }
    });
    return {
        async getServerFiles() {
            const dir = await fs.readdir(localFolderPath);
            map.update(dir);
            return map.contents;
        }
    };
}

/**
 * Serve a static string as a file
 * @param content The content to serve
 * @param serverPath Where on the server the file should exist
 * @param mimeType (optional) MIME type to report. If unspecified, is inferred from the file extension
 */
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
            return createStaticFileResponse(localFilePath, invalidate);
        }
    };
    const files = [file];

    return {
        async getServerFiles() {
            return files;
        }
    };
}

export function createStaticFileResponse(localFilePath: string, context: GenerationContext): ServerFileResponse {
    if (context.invalidate) {
        updateWatchOfFile(localFilePath, watchToken, context.invalidate);
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
