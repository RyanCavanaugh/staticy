import ServerFile from "./server-file";

export default interface FileProvider {
    /**
     * Returns a Promise for an array of ServerFiles that this Provider provides.
     */
    getServerFiles(): Promise<ReadonlyArray<ServerFile>>;
}
