import express = require('express');
import _path = require('path');
import fs = require('fs-extra');
import minimatch = require('minimatch');
import mime = require('mime-types');
import ws = require('ws');
import chokidar = require('chokidar');
import string_decoder = require('string_decoder');
import glob = require('glob');
import FileProvider from './file-provider';
import { DevelopmentServerOptions, createDevelopmentServer } from './dev-server';
import ServerFile from './server-file';
import { cmp } from './utils';

export type Site = ReturnType<typeof createSite>;

export function createSite() {
    const providers: FileProvider[] = [];

    function addFileProvider(provider: FileProvider) {
        providers.push(provider);
    }

    async function publish(diskRootPath: string) {

    }

    async function ls(): Promise<ReadonlyArray<ServerFile>> {
        const allFiles: ServerFile[] = [];
        for (const prov of providers) {
            allFiles.push(...await prov.getServerFiles());
        }
        
        allFiles.sort((a, b) => cmp(a.serverPath, b.serverPath));

        return allFiles;
    }

    async function getFileByServerPath(serverPath: string): Promise<ServerFile | undefined> {
        const allFiles: ServerFile[] = [];
        for (const prov of providers) {
            allFiles.push(...await prov.getServerFiles());
        }

        const matching = allFiles.filter(f => {
            return f.serverPath === serverPath;
        });

        if (matching.length === 1) {
            return matching[0];
        } else if (matching.length === 0) {
            return undefined;
        } else {
            return {
                serverPath,
                async generate() {
                    return {
                        kind: "error",
                        mimeType: "text/html",
                        async getErrorMessage() {
                            return `More than one provider matched ${serverPath}: ${matching.map(m => m.description || ("???")).join("\r\n")}`;
                        }
                    }
                }
            };
        }
    }

    async function runDevServer(opts: DevelopmentServerOptions = {}) {
        const server = createDevelopmentServer(opts);
        server.run(self);
    }

    const self = {
        addFileProvider,
        publish,
        runDevServer,
        ls,
        getFileByServerPath
    };
    return self;
}


