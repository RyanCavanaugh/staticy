import fs = require("fs-extra");
import path = require("path");
import ts = require("typescript");
import rollup = require("rollup");
import resolve = require("rollup-plugin-node-resolve");
import virtual = require("rollup-plugin-virtual");
import cjs = require("rollup-plugin-commonjs");
import FileProvider from "../file-provider";
import ServerFile from "../server-file";

export function createTypeScriptBundle(tsconfigPath: string, entryPoint: string, serverPath: string, rollupInputOptions: Partial<rollup.InputOptions>, rollupOutputOptions: Partial<rollup.OutputOptions>): FileProvider {
    let oldProgram: ts.Program | undefined = undefined;
    const file: ServerFile = {
        description: `TypeScript bundle built from ${tsconfigPath}`,
        serverPath,
        async generate(invalidate) {
            const host: ts.ParseConfigFileHost = {
                fileExists: ts.sys.fileExists,
                getCurrentDirectory: ts.sys.getCurrentDirectory,
                readDirectory: ts.sys.readDirectory,
                readFile: ts.sys.readFile,
                useCaseSensitiveFileNames: true,
                onUnRecoverableConfigFileDiagnostic(diag) {
                    console.error(diag.messageText);
                }
            };
            let start = Date.now();
            const cfg = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, host)!;
            const customOpts: ts.CompilerOptions = { ...cfg.options, noEmit: false, skipLibCheck: true, sourceMap: false };
            console.log(`TypeScript program startup in ${Date.now() - start}`);

            start = Date.now();
            const filesMap: any = Object.create(null);
            const compilerOptions = { sourceMap: false, jsx: ts.JsxEmit.React, module: ts.ModuleKind.ES2015 };
            for (const inFile of cfg.fileNames) {
                if (/\.tsx?$/.test(inFile) && !/\.d\.ts/.test(inFile)) {
                    const outputRelativeName = path.relative(cfg.options.rootDir || path.dirname(tsconfigPath), inFile);
                    const outputRelativeNameJs = outputRelativeName.replace(/\.tsx?$/, ".js");
                    const outputFinalName = path.join(cfg.options.outDir || path.basename(path.dirname(tsconfigPath)), outputRelativeNameJs);
                    console.log("Emit to " + outputFinalName);
                    const inputText = await fs.readFile(inFile, { encoding: "utf-8"});
                    filesMap[outputFinalName] = ts.transpileModule(inputText, { fileName: inFile, compilerOptions }).outputText;
                }
            }
            console.log(`TypeScript emit in ${Date.now() - start}`);
            return {
                kind: "text",
                mimeType: "text/javascript",
                async getText() {
                    const input: rollup.InputOptions = {
                        plugins: [virtual(filesMap),
                            resolve({
                                browser: true,
                                extensions: [".js", ".jsx", ".json"],
                                preferBuiltins: false
                            })],
                        input: entryPoint,
                        ...rollupInputOptions
                    };

                    const start = Date.now();
                    const rollupInput = await rollup.rollup(input);
                    const rollupOutput = await rollupInput.generate({ format: "umd", ...rollupOutputOptions });
                    const end = Date.now();
                    console.log(`Rollup in ${end - start}`);
                    return rollupOutput.output[0].code!;
                }
            };
        }
    };
    const files = [file];

    return {
        async getServerFiles() {
            return files;
        }
    };
}
