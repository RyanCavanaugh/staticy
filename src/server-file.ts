export default interface ServerFile {
    /**
     * The path, including a leading slash, where this file is served from.
     * During "publish", this is treated as a disk path.
     */
    serverPath: string;

    /**
     * An optional description to display in 'ls' for debugging purposes
     */
    description?: string;

    /**
     * Invoked to generate the contents of a file.
     * If any dependent assets have changed, the file may call 'invalidate'
     * to trigger a client refresh.
     */
    generate(invalidate: () => void): Promise<ServerFileResponse>;
}

export type ServerFileResponse =
    TextServerResponse |
    RawServerResponse |
    ErrorServerResponse;

export interface BaseServerFileResponse {
    /**
     * 
     */
    mimeType?: string;
}

export interface TextServerResponse extends BaseServerFileResponse {
    kind: "text";
    getText(): Promise<string>;
}

export interface ErrorServerResponse extends BaseServerFileResponse {
    kind: "error";
    getErrorMessage(): Promise<string>;
}

/**
 * Appropriate for binary data or non-UTF-8 text
 */
export interface RawServerResponse extends BaseServerFileResponse {
    kind: "raw";

    getBuffer(): Promise<Buffer>;
}
