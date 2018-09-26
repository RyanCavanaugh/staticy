import express = require('express');
import path = require('path');
import fs = require('fs');
import minimatch = require('minimatch');
import mime = require('mime-types');

namespace staticyServer {
    export interface GlobalOptions {
        disableLiveReload: boolean;
    }
    export interface AddFolderOptions {
        recursive: boolean;
        filePattern: string | string[];
        extensionMap: { [key: string]: string };
    }
}

const defaultOpts: staticyServer.AddFolderOptions = {
    recursive: true,
    filePattern: "*",
    extensionMap: {}
};

function flattenFolderOpts(opts?: Partial<staticyServer.AddFolderOptions>): staticyServer.AddFolderOptions {
    if (!opts) return defaultOpts;
    return { ...defaultOpts, ...opts };
}

function isPromise(x: any): x is Promise<unknown> {
    return x instanceof Function;
}

function staticyServer() {
    const handlers: Array<(req: express.Request, res: express.Response) => Promise<boolean>> = [];

    function middleware(req: express.Request, res: express.Response, next: express.NextFunction) {
        process();

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
        this.addTransformedFolder(fileSystemPath, serverPath, data => data, opts);
    };
    middleware.addStaticFile = function (fileSystemPath: string, serverFileName: string) {

    };
    middleware.addTransformedFolder = function (fileSystemPath: string, serverPath: string, transform: (content: string, fileName: string) => string, opts?: Partial<staticyServer.AddFolderOptions>) {
        const options = flattenFolderOpts(opts);
        const patterns = Array.isArray(options.filePattern) ? options.filePattern : [options.filePattern];
        handlers.unshift(async (req, res) => {
            if (req.path.indexOf(serverPath) === 0) {
                const relativePath = path.relative(serverPath, req.path);
                const nominalExt = path.extname(relativePath);
                const newExt = options.extensionMap[nominalExt] || nominalExt;
                const diskPath = path.join(fileSystemPath, relativePath);
                const realDiskPath = diskPath.substr(0, diskPath.length - nominalExt.length) + newExt;
                if (patterns.some(p => minimatch(path.basename(realDiskPath), p))) {
                    fs.readFile(realDiskPath, { encoding: "utf-8" }, (err, content) => {
                        if (err) throw err;
                        const transformed = transform(content, realDiskPath);
                        res.header("Cache-Control", "no-cache");
                        res.header("Content-Type", mime.lookup(relativePath) || "unknown");
                        res.send(transformed);
                        res.end();
                    });
                    return true;
                }
            }

            return false;
        });
    };
    middleware.addTransformedFile = function (fileSystemPath: string, serverPath: string, transform: (content: string, fileName: string) => string, filePattern?: string) {

    };

    middleware.addGeneratedFile = function (serverFileName: string, generate: (fileName: string, triggerReload: () => void) => string) {

    };

    return middleware;
}

export = staticyServer;