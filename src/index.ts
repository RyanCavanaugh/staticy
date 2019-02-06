import * as fileProviders from "./file-providers";
import * as site from "./site";

import * as typescriptRollupBundle from "./beta/typescript-rollup-bundle";

export {
    fileProviders,
    site,
    typescriptRollupBundle
};

/*
import express = require('express');
import _path = require('path');
import fs = require('fs-extra');
import minimatch = require('minimatch');
import mime = require('mime-types');
import ws = require('ws');
import chokidar = require('chokidar');
import string_decoder = require('string_decoder');
import glob = require('glob');

const path = _path.posix;
const utf8 = new string_decoder.StringDecoder("utf8");

const ws_port = 7772;
const watchOpts: chokidar.WatchOptions = {
    ignoreInitial: true,
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
    trace: false,
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

type ServerPathEntry = {
    serverPath: string;
    mimeType: string;
    generate: () => Promise<Buffer | string>;
    sourceFiles: string[];
    description: string;
}

function staticyServer(globalOptions?: Partial<staticyServer.GlobalOptions>) {
    const globalOpts = flattenGlobalOpts(globalOptions);
    const serverFileList: ServerPathEntry[] = [];

    const singleFileWatcher = chokidar.watch("", watchOpts);
    singleFileWatcher.on("all", (event, path) => triggerFileChanged(event, path));

    function filePathToServerPaths(filePath: string): string[] {
        const normalized = normalizePath(filePath);
        const result: string[] = [];
        for (const entry of serverFileList) {
            if (entry.sourceFiles.some(f => normalizePath(f) === normalized)) {
                result.push(entry.serverPath);
            }
        }
        return result;
    }

    function middleware(req: express.Request, res: express.Response, next: express.NextFunction) {
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
            const provider = serverFileList.filter(s => s.serverPath === req.path)[0];
            if (provider) {
                startReloadServerIfNeeded();

                res.header("Cache-Control", "no-cache");
                try {
                    const content = await provider.generate();
                    res.contentType(provider.mimeType);
                    res.send(content);
                    res.end();
                } catch (e) {
                    res.status(500);
                    res.send(`<html><head><title>Staticy 500</title></head><body><pre>${e.toString()}</pre>`);
                    res.end();
                }
            } else {
                next();
            }
        }
    }

    middleware.addStaticFolder = function (fileSystemPath: string, serverPath: string, opts?: Partial<staticyServer.AddFolderOptions>) {
        this.addTransformedFolder(fileSystemPath, serverPath, data => data, opts);
    };

    middleware.addStaticFile = function (fileSystemPath: string, serverPath: string) {
        singleFileWatcher.add(fileSystemPath);
        
        if (serverFileList.some(e => e.serverPath === serverPath)) {
            throw new Error(`Server file list already contains path ${serverPath}`);
        }

        const mimeType = globalOpts.mimeTypeProvider(fileSystemPath);
        serverFileList.push({
            serverPath,
            mimeType,
            description: `Static file ${fileSystemPath}`,
            sourceFiles: [fileSystemPath],
            generate: async () => {
                if (mimeType === "text/html" && !globalOpts.disableLiveReload) {
                    const html = await fs.readFile(fileSystemPath, { encoding: 'utf-8' });
                    if (typeof html !== 'string') throw new Error("Wrong type of html");
                    return staticyServer.injectReloadScript(html);
                } else {
                    return fs.readFile(fileSystemPath);
                }    
            }
        });
    };

    middleware.addTransformedFolder = function (fileSystemPath: string, serverPath: string, transform: (content: string, fileName: string) => (string | Promise<string>), opts?: Partial<staticyServer.AddFolderOptions>) {
        const options = flattenFolderOpts(opts);
        const patterns = Array.isArray(options.filePattern) ? options.filePattern : [options.filePattern];
        const folderWatcher = chokidar.watch(fileSystemPath, { ...watchOpts, depth: options.recursive ? 10 : 0 });
        const myFileEntries: ServerPathEntry[] = [];

        folderWatcher.on("all", (event: string, path: string) => {
            triggerFileChanged(event, path);
        });
        folderWatcher.on("add", () => {
            recomputeFolderContents();
        });
        recomputeFolderContents();

        function recomputeFolderContents() {
            fs.readdir(fileSystemPath, (err, fileList) => {
                if (err) throw err;

                for (const old of myFileEntries) {
                    const index = serverFileList.indexOf(old);
                    if (index < 0) throw new Error("My old file should have been in this list");
                    serverFileList.splice(index, 1);
                }

                for (const fileName of fileList) {
                    if (patterns.some(p => minimatch(fileName, p))) {
                        const fullDiskPath = path.join(fileSystemPath, fileName);
                        const relativeDiskPath = path.relative(fileSystemPath, fullDiskPath);
                        let fullServerPath = path.join(serverPath, relativeDiskPath);
                        const extension = path.extname(fullDiskPath);
                        if (options.extensionMap[extension]) {
                            fullServerPath = fullServerPath.substr(0, fullServerPath.length - extension.length) + options.extensionMap[extension];
                        }
                        fullServerPath = encodeNormalizedPathComponents(fullServerPath);
                        const mimeType = globalOpts.mimeTypeProvider(options.extensionMap[extension] || extension);
                        const newEntry: ServerPathEntry = {
                            serverPath: fullServerPath,
                            mimeType,
                            description: `Transformed file ${path.relative(process.cwd(), fullDiskPath)}`,
                            sourceFiles: [fullDiskPath],
                            generate: async () => {
                                const content = await fs.readFile(fullDiskPath, { encoding: "utf-8" });
                                const transformedContent = await transform(content as string, fileName);
                                return transformedContent;
                            }
                        };
                        myFileEntries.push(newEntry);
                        serverFileList.push(newEntry);
                    }
                }
            });
        }
    };

    middleware.addTransformedFile = function (fileSystemPath: string, serverPath: string, transform: (context: staticyServer.FileGenerationContext) => string, filePattern?: string) {
        throw new Error("Not implemented yet");
    };

    middleware.addGeneratedFile = function (serverPath: string, generate: (context: staticyServer.GenerationContext) => string) {
        throw new Error("Not implemented yet");
    };

    middleware.ls = function() {
        console.log(`== File Listing ==`);
        for (const f of serverFileList) {
            console.log(`http://site${f.serverPath} - ${f.description} - served as ${f.mimeType}`);
            for (const sf of f.sourceFiles) {
                console.log(` - Derived from file ${sf}`);
            }
        }
        console.log(`== (end) ==`);
    };

    const listeners: ws[] = [];
    let serverStarted = false;
    function startReloadServerIfNeeded() {
        if (serverStarted) return;
        serverStarted = true;

        const wss = new ws.Server({ port: ws_port });
        console.log(`Reload server listening on ${ws_port}`);
        wss.on("connection", function (conn) {
            console.log("Accepted a listener connection");
            listeners.push(conn);
            conn.on("close", function (closed) {
                console.log("Closed a listener connection");
                listeners.splice(listeners.indexOf(conn), 1);
            });
        });
    }

    function triggerFileChanged(event: string | symbol, rawPath: string) {
        if (typeof event === "symbol" || event === "ready") return;

        const normalizedPath = normalizePath(rawPath);
        console.log(`Path ${normalizedPath} changed (${event}); triggering reloads`);
        for (const url of filePathToServerPaths(normalizedPath)) {
            // console.log(` -> ${url}`);
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

function normalizePath(s: string) {
    return path.normalize(s).replace(/\\/g, "/");
}

function encodeNormalizedPathComponents(path: string): string {
    return path.split("/").map(s => encodeURIComponent(s)).join("/");
}

namespace staticyServer {
    export interface GlobalOptions {
        trace: boolean;
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
*/