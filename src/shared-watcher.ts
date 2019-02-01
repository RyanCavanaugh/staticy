import chokidar = require('chokidar');

type Token = object;
type BasicMap<T> = { [key: string]: T };

const fileWatcherMap: Map<Token, BasicMap<() => void>> = new Map();
const dirWatcherMap: Map<Token, BasicMap<() => void>> = new Map();

const chokidarOpts = {
    ignoreInitial: true, awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 20
    }
};

export function updateWatchOfFolder(localFolderPath: string, token: object, invalidated: () => void) {
    let extantMap = dirWatcherMap.get(token);
    if (extantMap === undefined) {
        extantMap = Object.create(null) as BasicMap<() => void>;
        dirWatcherMap.set(token, extantMap);
    }

    if (extantMap[localFolderPath] === undefined) {
        chokidar.watch(localFolderPath, chokidarOpts).on("add", () => {
            extantMap![localFolderPath]();
        });
    }
    extantMap[localFolderPath] = invalidated;
}

export function updateWatchOfFile(localFilePath: string, token: object, invalidated: () => void) {
    let extantMap = fileWatcherMap.get(token);
    if (extantMap === undefined) {
        extantMap = Object.create(null) as BasicMap<() => void>;
        fileWatcherMap.set(token, extantMap);
    }

    if (extantMap[localFilePath] === undefined) {
        chokidar.watch(localFilePath, chokidarOpts).on("all", () => {
            extantMap![localFilePath]();
        });
    }
    extantMap[localFilePath] = invalidated;
}
