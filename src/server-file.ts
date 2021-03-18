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
    generate(context: GenerationContext): Promise<ServerFileResponse>;
}

export interface GenerationContext {
    /**
     * If provided, this is a callback that should be invoked whenever the provided file
     * would change content. For example, if providing a file from disk, you should call
     * invalidate whenever the file on disk has changed
     */
    invalidate?(): void;
    /**
     * If something goes wrong, you can write a warning message to the dev server console
     */
    issueWarning(text: string): void;
}

export type ServerFileResponse =
    TextServerResponse |
    RawServerResponse |
    ErrorServerResponse;

export interface BaseServerFileResponse {
    /**
     * MIME type to use. If not provided, this will be inferred from the file extension
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
