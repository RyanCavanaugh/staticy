import mm = require("micromatch");
import fs = require("fs-extra");
import path = require("path");
import FileProvider from "./file-provider";
import ServerFile from "./server-file";
import diffmap from "./diffmap";
import { createStaticFileResponse } from "./file-providers";

export interface DirectoryOptions {
    localPath: string;
    pattern?: string;
    serverPath: string;
}

export function createDirectoryProvider(options: DirectoryOptions): FileProvider {
    const { serverPath, localPath } = options;
    const { pattern = "**" } = options;

    const map = diffmap<ServerFile>({
        create(relativeLocalPath) {
            return {
                serverPath: path.join(serverPath, relativeLocalPath),
                async generate(invalidate) {
                    return createStaticFileResponse(path.join(localPath, relativeLocalPath), invalidate);
                }
            };
        }
    });
    return {
        async getServerFiles() {
            const dir = mm(await fs.readdir(localPath), pattern);
            map.update(dir);
            return map.contents;
        }
    };
}

