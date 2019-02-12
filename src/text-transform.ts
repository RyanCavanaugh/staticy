import { PromiseOrImmediate } from "./utils";

export type TextTransform = {
    changeFileName?(fileName: string): string;
    transform(context: TextTransformContext): PromiseOrImmediate<TextTransformResult>;
};

export type TextTransformContext = {
    invalidate(): void;
    content: string;
    fileName: string;
};

export type TextTransformResult = {
    content: string;
};
