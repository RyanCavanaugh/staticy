import ServerFile from "./server-file";

/**
 * A FileProvider produces a list of files that should exist on the server.
 */
export default interface FileProvider {
    /**
     * Returns a Promise for an array of ServerFiles that this Provider provides.
     */
    getServerFiles(): Promise<ReadonlyArray<ServerFile>>;
}
