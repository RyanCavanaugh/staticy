import _path = require('path');
import fs = require('fs-extra');
import FileProvider from './file-provider';
import { DevelopmentServerOptions, createDevelopmentServer } from './dev-server';
import ServerFile from './server-file';
import { cmp, getPathComponents, removeLeadingSlash, assertNever } from './utils';
import { DirectoryOptions, createDirectoryProvider } from './directory-file-provider';

export type Site = ReturnType<typeof createSite>;

export type SiteOptions = {
    fileRoot: string;
};

export type Warning = {
    serverPath: string;
    message: string;
};

export type PublishResult = {
    warnings: Warning[];
    errors: Warning[];
}

const DefaultSiteOptions: SiteOptions = {
    fileRoot: process.mainModule ? _path.dirname(process.mainModule.filename) : __dirname
};

export function createSite(siteOptions?: Partial<SiteOptions>) {
    const providers: FileProvider[] = [];

    const { fileRoot } = { ...DefaultSiteOptions, ...siteOptions };

    /** Convencience APIs */
    function addDirectory(localDirectoryPath: string, options?: Partial<DirectoryOptions>) {
        const { path: localPath, pattern } = getPathComponents(localDirectoryPath);
        const serverPath = _path.relative(fileRoot, localPath);
        providers.push(createDirectoryProvider({
            localPath,
            pattern,
            serverPath,
            ...options
        }));
    }

    function addFileProvider(provider: FileProvider) {
        providers.push(provider);
    }

    async function publish(diskRootPath: string): Promise<PublishResult> {
        const warnings: Warning[] = [];
        const errors: Warning[] = [];
        await fs.mkdirp(diskRootPath);

        const files = await ls();
        for (const file of files) {
            const localPath = _path.join(diskRootPath, removeLeadingSlash(file.serverPath));
            await fs.mkdirp(_path.dirname(localPath));
            const content = await file.generate({ issueWarning: message => warnings.push({ message, serverPath: file.serverPath }) });
            switch (content.kind) {
                case "text":
                    await fs.writeFile(localPath, await content.getText(), { encoding: "utf-8" });
                    break;

                case "raw":
                    await fs.writeFile(localPath, await content.getBuffer());
                    break;

                case "error":
                    errors.push({ message: await content.getErrorMessage(), serverPath: file.serverPath });
                    break;

                default:
                    assertNever(content, "Unexpected content kind");
            }
        }

        return {
            warnings,
            errors
        };
    }

    async function ls(): Promise<ReadonlyArray<ServerFile>> {
        const allFiles: ServerFile[] = [];
        for (const prov of providers) {
            allFiles.push(...await prov.getServerFiles());
        }

        allFiles.sort((a, b) => cmp(b.serverPath, a.serverPath));

        return allFiles;
    }

    async function getFileByServerPath(serverPath: string): Promise<ServerFile | undefined> {
        const allFiles: ServerFile[] = [];
        for (const prov of providers) {
            allFiles.push(...await prov.getServerFiles());
        }

        const matching = allFiles.filter(f => {
            return removeLeadingSlash(f.serverPath) === removeLeadingSlash(serverPath);
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
        addDirectory,

        getFileByServerPath,

        addFileProvider,
        publish,
        runDevServer,
        ls
    };

    return self;
}
