import child_process = require('child_process');
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
    const invalidationLookup: any = Object.create(null);
    const ws_port = 7772;
    const serverPathAliases: any = Object.create(null);
    let serverStarted = false;

    function memoizeGetInvalidationForFile(serverPath: string) {
        return invalidationLookup[serverPath] || (invalidationLookup[serverPath] = () => {
            broadcastUrlChanged(serverPath);
            if (serverPathAliases[serverPath]) {
                broadcastUrlChanged(serverPathAliases[serverPath]);
            }
        });
    }

    function broadcastUrlChanged(serverPath: string) {
        const event = JSON.stringify({ url: "/" + serverPath });
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
            listeners.push(conn);
            conn.on("close", function (closed) {
                listeners.splice(listeners.indexOf(conn), 1);
            });
        });
    }

    async function run(site: Site) {
        startReloadServerIfNeeded();

        const server = express();
        server.use(middleware);
        server.listen(port);

        process.stdin.setRawMode!(true);
        process.stdin.on("data", (key) => {
            // Ctrl-C, q, Esc            
            if (key[0] === 3 || key[0] === 113 || key[0] === 27) {
                process.exit();
            }
            console.log(JSON.stringify(key));
        });

        console.log(`Web server running at http://localhost:${port}/`);
        console.log(`Exit with 'q' or 'Esc'`);

        process.stdin.resume();

        const reloadScript = await fs.readFile(path.join(__dirname, "__staticy-reload.js"), { encoding: "utf-8" })

        async function middleware(req: express.Request, res: express.Response, next: express.NextFunction) {
            res.header("Cache-Control", "no-cache");

            if (req.path === "/__staticy-reload.js") {
                res.contentType("text/javascript");
                res.send(reloadScript);
                res.end();
                return;
            }

            let file = await site.getFileByServerPath(req.path);
            let resolvedPath = req.path;
            if (file === undefined) {
                const candidates: string[] = [req.path];
                for (const name of directoryIndexNames) {
                    const candidate = unixPath.join(req.path, name);
                    file = await site.getFileByServerPath(candidate);
                    resolvedPath = candidate;
                    if (file !== undefined) {
                        serverPathAliases[resolvedPath] = req.path;
                        break;
                    }
                    candidates.push(candidate);
                }

                if (file === undefined) {
                    res.status(404);
                    res.contentType("text/html");
                    const ls = await site.ls();
                    const listing = ls.map(file => `<a href=${file.serverPath}>${file.serverPath}</a>${file.description ? ` - ${file.description}` : ""}`).join("\r\n");
                    res.send(`<html><head><title>404 Resource Not Found</title></head><body><h1>404 Resource Not Found</h1>Searched for <pre>${candidates.join("\r\n")}</pre> but did not find <tt>${req.path}</tt>.<hr>File listing:<pre>${listing}</pre></body></html>`);
                    res.end();
                    return;
                }
            }

            const resp = await safeRunGenerate(file, memoizeGetInvalidationForFile(file.serverPath));

            if (resp.kind === "error") {
                const errText = await resp.getErrorMessage();
                res.status(500);
                res.contentType("text/html");
                res.send(`<html><head><title>Staticy 500</title></head><body><pre>${errText}</pre></body></html>`);
                res.end();
            } else {
                if (resp.mimeType !== undefined) {
                    res.contentType(resp.mimeType);
                } else {
                    res.contentType(path.extname(resolvedPath));
                }

                if (resp.kind === "text") {
                    const isHtml = (resp.mimeType === "text/html") || (path.extname(resolvedPath) === ".html");
                    if (isHtml) {
                        const originalText = await resp.getText();
                        const newText = injectReloadScript(originalText);
                        res.send(newText);
                    } else {
                        res.send(await resp.getText());
                    }
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

export function injectReloadScript(htmlContent: string): string {
    return htmlContent.replace("</body>", `<script src="/__staticy-reload.js"></script></body>`);
}
