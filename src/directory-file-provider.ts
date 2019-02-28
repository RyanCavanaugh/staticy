import mm = require("micromatch");
import fs = require("fs-extra");
import _path = require("path");
import FileProvider from "./file-provider";
import ServerFile from "./server-file";
import diffmap from "./diffmap";
import { createStaticFileResponse } from "./file-providers";
import { TextTransform, TextTransformContext } from "./text-transform";
import { dirAndBase } from "./utils";
import { updateWatchOfFile } from "./shared-watcher";

const path = _path.posix;

function noop() { }

export interface DirectoryOptions {
    localPath: string;
    pattern?: string;
    serverPath: string;
    textTransformer?: TextTransform;
}

export function createDirectoryProvider(options: DirectoryOptions): FileProvider {
    const { serverPath, localPath } = options;
    const { pattern = "**", textTransformer } = options;
    const token = {};

    const map = diffmap<ServerFile>({
        create(relativeLocalPath) {
            const filePath = path.join(localPath, relativeLocalPath);
            let relativeServerPath: string;
            if (textTransformer) {
                let { dir, base } = dirAndBase(relativeLocalPath);
                if (textTransformer.changeFileName) {
                    base = textTransformer.changeFileName(base);
                }
                relativeServerPath = path.join(serverPath, dir, base);
            } else {
                relativeServerPath = path.join(serverPath, relativeLocalPath);
            }
            return {
                serverPath: relativeServerPath,
                async generate(serverFileContext) {
                    if (textTransformer) {
                        return {
                            kind: "text",
                            async getText() {
                                const context: TextTransformContext = {
                                    issueWarning: serverFileContext.issueWarning,
                                    invalidate: serverFileContext.invalidate || noop,
                                    content: await fs.readFile(filePath, "utf-8"),
                                    fileName: path.basename(filePath)
                                };
                                updateWatchOfFile(filePath, token, context.invalidate);
                                const result = await textTransformer.transform(context);
                                return result.content;
                            }
                        };
                    } else {
                        return createStaticFileResponse(filePath, serverFileContext);
                    }
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

