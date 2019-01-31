import express = require('express');
import path = require('path');
import fs = require('fs-extra');
import minimatch = require('minimatch');
import mime = require('mime-types');
import ws = require('ws');
import chokidar = require('chokidar');
import string_decoder = require('string_decoder');
import glob = require('glob');
import FileProvider from './file-provider';
import { Site } from './site';
import ServerFile, { ServerFileResponse } from './server-file';
import { assertNever } from './utils';

const unixPath = path.posix;

export interface DevelopmentServerOptions {
    port?: number;
    directoryIndexNames?: ReadonlyArray<string>;
}

async function safeRunGenerate(file: ServerFile, invalidate: () => void): Promise<ServerFileResponse> {
    try {
        return await file.generate(invalidate);
    } catch (e) {
        return {
            kind: "error",
            mimeType: "text/html",
            async getErrorMessage() {
                return e;
            }
        };
    }
}

export function createDevelopmentServer(opts: DevelopmentServerOptions) {
    const {
        port = 8087,
        directoryIndexNames = ["index.html"]
    } = opts;
    const listeners: ws[] = [];
    const invalidationLookup: any = {};
    const ws_port = 7772;
    let serverStarted = false;


    function memoizeGetInvalidationForFile(serverPath: string) {
        return invalidationLookup[serverPath] || (invalidationLookup[serverPath] = () => {
            broadcastUrlChanged(serverPath);
        });
    }

    function broadcastUrlChanged(serverPath: string) {
        const event = JSON.stringify({ url: serverPath });
        for (const listener of listeners) {
            listener.send(event);
        }
    }

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

    async function run(getServerFile: (serverPath: string) => Promise<ServerFile>) {
        startReloadServerIfNeeded();

        const server = express();
        server.use(middleware);
        server.listen(port);

        const reloadScript = await fs.readFile(path.join(__dirname, "__staticy-reload.js"), { encoding: "utf-8" })

        async function middleware(req: express.Request, res: express.Response, next: express.NextFunction) {
            res.header("Cache-Control", "no-cache");

            if (req.path === "/__staticy-reload.js") {
                res.contentType("text/javascript");
                res.send(reloadScript);
                res.end();
                return;
            }

            let file = await getServerFile(req.path);
            if (file === undefined) {
                const candidates: string[] = [req.path];
                for (const name of directoryIndexNames) {
                    const candidate = unixPath.join(req.path, name);
                    file = await getServerFile(candidate);
                    if (file !== undefined) break;
                    candidates.push(candidate);
                }

                if (file === undefined) {
                    res.status(404);
                    res.send(`<html><head><title>404 Resource Not Found</title></head><body>Searched for <pre>${candidates.join("\r\n")}</pre> but did not find <tt>${req.path}</tt>.</body></html>`);
                    res.end();
                    return;
                }
            }
            
            const resp = await safeRunGenerate(file, memoizeGetInvalidationForFile(file.serverPath));

            if (resp.kind === "error") {
                const errText = await resp.getErrorMessage();
                res.status(500);
                res.send(`<html><head><title>Staticy 500</title></head><body><pre>${errText}</pre></body></html>`);
                res.end();
            } else {
                if (resp.mimeType !== undefined) {
                    res.contentType(resp.mimeType);
                } else {
                    res.contentType(path.extname(req.path));
                }

                 if (resp.kind === "text") {
                     res.send(await resp.getText());
                 } else if (resp.kind === "raw") {
                    res.send(await resp.getBuffer());
                 } else {
                     assertNever(resp, "Unknown server file response kind");
                 }
                 res.end();
            }
        }
    }

    return {
        run
    };
}
