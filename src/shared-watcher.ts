import chokidar = require('chokidar');

type Token = object;
type BasicMap<T> = { [key: string]: T };

const watcherMap: Map<Token, BasicMap<() => void>> = new Map();

const chokidarOpts = {
    ignoreInitial: true, awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 20
    }
};

export function updateWatchOfFile(localFilePath: string, token: object, invalidated: () => void) {
    let extantMap = watcherMap.get(token);
    if (extantMap === undefined) {
        extantMap = Object.create(null) as BasicMap<() => void>;
        watcherMap.set(token, extantMap);
    }

    if (extantMap[localFilePath] === undefined) {
        chokidar.watch(localFilePath, chokidarOpts).on("all", () => {
            extantMap![localFilePath]();
        })
    }
    extantMap[localFilePath] = invalidated;
}
