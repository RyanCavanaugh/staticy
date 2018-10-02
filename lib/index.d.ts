import express = require('express');
declare namespace staticyServer {
    interface GlobalOptions {
        disableLiveReload: boolean;
    }
    interface AddFolderOptions {
        recursive: boolean;
        filePattern: string | string[];
        extensionMap: {
            [key: string]: string;
        };
    }
}
declare function staticyServer(): {
    (req: express.Request, res: express.Response, next: express.NextFunction): void;
    addStaticFolder(fileSystemPath: string, serverPath: string, opts?: Partial<staticyServer.AddFolderOptions> | undefined): void;
    addStaticFile(fileSystemPath: string, serverFileName: string): void;
    addTransformedFolder(fileSystemPath: string, serverPath: string, transform: (content: string, fileName: string) => string, opts?: Partial<staticyServer.AddFolderOptions> | undefined): void;
    addTransformedFile(fileSystemPath: string, serverPath: string, transform: (content: string, fileName: string) => string, filePattern?: string | undefined): void;
    addGeneratedFile(serverFileName: string, generate: (fileName: string, triggerReload: () => void) => string): void;
};
export = staticyServer;
//# sourceMappingURL=index.d.ts.map