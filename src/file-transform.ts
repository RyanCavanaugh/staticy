import { PromiseOrImmediate } from "./utils";

export type FileTransform = {
    transform(localFileName: string): PromiseOrImmediate<Buffer | string>;
};

