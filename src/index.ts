import express = require('express');
import path = require('path');
import fs = require('fs');
import minimatch = require('minimatch');
import mime = require('mime-types');
import ws = require('ws');
import chokidar = require('chokidar');
import string_decoder = require('string_decoder');

const utf8 = new string_decoder.StringDecoder("utf8");

const ws_port = 7772;
const watchOpts: chokidar.WatchOptions = {
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 20
    }
};

const defaultOpts: staticyServer.AddFolderOptions = {
    recursive: true,
    filePattern: "*",
    extensionMap: {}
};
const defaultGlobalOpts: staticyServer.GlobalOptions = {
    disableLiveReload: false,
    mimeTypeProvider: (fileName: string) => (mime.lookup(fileName) || "unknown")
};

function flattenFolderOpts(opts?: Partial<staticyServer.AddFolderOptions>): staticyServer.AddFolderOptions {
    if (!opts) return defaultOpts;
    return { ...defaultOpts, ...opts };
}

function flattenGlobalOpts(opts?: Partial<staticyServer.GlobalOptions>): staticyServer.GlobalOptions {
    if (!opts) return defaultGlobalOpts;
    return { ...defaultGlobalOpts, ...opts };
}

function isPromise(x: any): x is Promise<unknown> {
    return x instanceof Function;
}

function staticyServer(globalOptions: Partial<staticyServer.GlobalOptions>) {
    const globalOpts = flattenGlobalOpts(globalOptions);
    const handlers: Array<(req: express.Request, res: express.Response) => Promise<boolean>> = [];

    // const serverFileList: Array<[string, ]>

    const singleFileWatcher = chokidar.watch("");
    singleFileWatcher.on("all", (_, path) => triggerFileChanged(path));

    function filePathToServerPaths(filePath: string): string[] {
        return [];
    }

    function middleware(req: express.Request, res: express.Response, next: express.NextFunction) {
        console.log(req.path);
        if (req.path === "/__staticy-reload.js") {
            fs.readFile(path.join(__dirname, "__staticy-reload.js"), { encoding: "utf-8" }, (err, data) => {
                res.contentType("js");
                res.send(data);
                res.end();
            });
        } else {
            process();
        }

        async function process() {
            for (const h of handlers) {
                try {
                    const result = await h(req, res);
                    if (result) return;
                } catch (err) {
                    return next(err);
                }
            }

            next();
        }
    }

    middleware.addStaticFolder = function (fileSystemPath: string, serverPath: string, opts?: Partial<staticyServer.AddFolderOptions>) {
        // const options = flattenFolderOpts(opts);
        this.addTransformedFolder(fileSystemPath, serverPath, data => data, opts);
    };

    middleware.addStaticFile = function (fileSystemPath: string, serverPath: string) {
        console.log(`Add file watch for ${fileSystemPath}`);
        singleFileWatcher.add(fileSystemPath);

        handlers.unshift(async (req, res) => {
            if (req.path === serverPath) {
                fs.readFile(fileSystemPath, (err, buffer) => {
                    if (err) {
                        res.status(500);
                        res.send(`Static file ${fileSystemPath} does not exist`);
                        return true;
                    }

                    res.header("Cache-Control", "no-cache");
                    const mimeType = mime.lookup(fileSystemPath) || "unknown";
                    res.header("Content-Type", mimeType);
                    if (mimeType === "text/html" && !globalOpts.disableLiveReload) {
                        res.send(staticyServer.injectReloadScript(utf8.end(buffer)));
                    } else {
                        res.send(buffer);
                    }
                    res.end();
                });
                return true;
            }
            return false;
        });
    };

    middleware.addTransformedFolder = function (fileSystemPath: string, serverPath: string, transform: (content: string, fileName: string) => (string | Promise<string>), opts?: Partial<staticyServer.AddFolderOptions>) {
        const options = flattenFolderOpts(opts);
        const folderWatcher = chokidar.watch(fileSystemPath, { ...defaultOpts, depth: options.recursive ? 10 : 0 });
        folderWatcher.on("all", (event: unknown, path: string) => {
            triggerFileChanged(path);
        });
        folderWatcher.on("add", () => {
            recomputeFolderContents();
        });



        const patterns = Array.isArray(options.filePattern) ? options.filePattern : [options.filePattern];
        handlers.unshift(async (req, res) => {
            if (req.path.indexOf(serverPath) === 0) {
                const relativePath = path.relative(serverPath, req.path);
                const nominalExt = path.extname(relativePath);
                const newExt = options.extensionMap[nominalExt] || nominalExt;
                const diskPath = path.join(fileSystemPath, relativePath);
                const realDiskPath = diskPath.substr(0, diskPath.length - nominalExt.length) + newExt;
                const realServerPath = path.join(serverPath, relativePath);
                if (patterns.some(p => minimatch(path.basename(realDiskPath), p))) {
                    if (fs.existsSync(realDiskPath)) {
                        fs.readFile(realDiskPath, { encoding: "utf-8" }, async (err, content) => {
                            console.log(`Add file watch for ${realDiskPath}`);
                            chokidar.watch(realDiskPath, watchOpts).on('change', () => {
                                broadcastUrlChanged(realServerPath);
                            });
                            if (err) throw err;
                            const transformed = await transform(content, realDiskPath);
                            res.header("Cache-Control", "no-cache");
                            res.header("Content-Type", mime.lookup(relativePath) || "unknown");
                            res.send(transformed);
                            res.end();
                        });
                        return true;
                    }
                }
            }

            return false;
        });
    };

    middleware.addTransformedFile = function (fileSystemPath: string, serverPath: string, transform: (context: staticyServer.FileGenerationContext) => string, filePattern?: string) {

    };

    middleware.addGeneratedFile = function (serverPath: string, generate: (context: staticyServer.GenerationContext) => string) {

    };

    startReloadServer();

    const listeners: ws[] = [];
    function startReloadServer() {
        const wss = new ws.Server({ port: ws_port });
        wss.on("connection", function (conn) {
            console.log("Accepted a listener connection");
            listeners.push(conn);
            conn.on("close", function (closed) {
                console.log("Closed a listener connection");
                listeners.splice(listeners.indexOf(conn), 1);
            });
        });
    }

    function triggerFileChanged(path: string) {
        for (const url of filePathToServerPaths(path)) {
            broadcastUrlChanged(url);
        }
    }

    function broadcastUrlChanged(url: string) {
        const event = JSON.stringify({ url: normalizeSlashes(url) });
        for (const listener of listeners) {
            listener.send(event);
        }
    }

    return middleware;
}

function normalizeSlashes(s: string) {
    return s.replace(/\\/g, "/");
}

namespace staticyServer {
    export interface GlobalOptions {
        disableLiveReload: boolean;
        mimeTypeProvider: (fileName: string) => string;
    }

    export interface AddFolderOptions {
        recursive: boolean;
        filePattern: string | string[];
        extensionMap: { [key: string]: string };
    }

    export interface GenerationContext {
        triggerReload(): void;
        watchFileForReload(path: string): void;
    }

    export interface FileGenerationContext extends GenerationContext {
        content: string;
        localFileName: string;
        request: express.Request | undefined;
        response: express.Response | undefined;
    }

    export function injectReloadScript(htmlContent: string): string {
        return htmlContent.replace("</body>", `<script src="/__staticy-reload.js"></script></body>`);
    }
}

export = staticyServer;
