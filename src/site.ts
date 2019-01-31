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

    async function ls() {
        const allFiles: ServerFile[] = [];
        for (const prov of providers) {
            allFiles.push(...await prov.getServerFiles());
        }
        
        allFiles.sort((a, b) => cmp(a.serverPath, b.serverPath));

        for (const file of allFiles) {
            if (file.description !== undefined) {
                console.log(`${file.serverPath} - ${file.description}`);
            } else {
                console.log(file.serverPath);
            }
        }
    }

    async function runDevServer(opts: DevelopmentServerOptions = {}) {
        const server = createDevelopmentServer(opts);
        server.run(async serverPath => {
            const allFiles: ServerFile[] = [];
            for (const prov of providers) {
                allFiles.push(...await prov.getServerFiles());
            }

            const matching = allFiles.filter(f => {
                return f.serverPath === serverPath;
            });

            if (matching.length === 1) {
                return matching[0];
            } else {
                return {
                    serverPath,
                    async generate() {
                        return {
                            kind: "error",
                            mimeType: "text/plain",
                            async getErrorMessage() {
                                return `More than one provider matched ${serverPath}: ${matching.map(m => m.description || ("???")).join("\r\n")}`;
                            }
                        }
                    }
                }
            }
        });
    }

    function handleRequest() {

    }

    const self = {
        addFileProvider,
        publish,
        runDevServer,
        ls
    };
    return self;
}


