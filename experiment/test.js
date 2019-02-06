// @ts-check
const path = require("path");
const ts = require("typescript");
const rollup = require("rollup");
const virtual = require("rollup-plugin-virtual");

async function fn1() {
    const filesMap = Object.create(null);
    filesMap["app.js"] = "import * as foo from \"./foo.js\";\nfoo.bar();";
    filesMap["foo.js"] = "import * as r from 'react'; import * as rd from 'react-dom'; export function bar() { r.thing.blah(); rd.bar.q(); return 10; }";
    const rollupInput = await rollup.rollup({
        plugins: [virtual(filesMap)],
        input: "app.js",
        external: ["react", "react_dom"]
    });
    const rollupOutput = await rollupInput.generate({ format: "umd", ...{ globals: {"react": "React", "react-dom": "ReactDOM"} }}, );
    console.log(`Produced ${rollupOutput.output.length} outputs`);
    console.log(`Returning code for ${rollupOutput.output[0].fileName}`);
    console.log(rollupOutput.output[0].code);
}

async function fn(tsconfigPath, entryPoint, serverPath, rollupInputOptions, rollupOutputOptions) {
    tsconfigPath = path.resolve(tsconfigPath);
    console.log(tsconfigPath);
    const file = {
        description: `TypeScript bundle built from ${tsconfigPath}`,
        serverPath,
        async generate(invalidate) {
            const host = {
                fileExists: ts.sys.fileExists,
                getCurrentDirectory: ts.sys.getCurrentDirectory,
                readDirectory: ts.sys.readDirectory,
                readFile: ts.sys.readFile,
                trace: () => undefined,
                useCaseSensitiveFileNames: true,
                onUnRecoverableConfigFileDiagnostic(diag) {
                    console.error(diag.messageText);
                }
            };
            const cfg = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, host);
            const program = ts.createProgram({ rootNames: cfg.fileNames, projectReferences: cfg.projectReferences, options: { ...cfg.options, noEmit: false } });
            program.getSemanticDiagnostics();
            const filesMap = Object.create(null);
            program.emit(undefined, (fileName, text) => {
                const relativeName = path.relative(path.dirname(tsconfigPath), fileName);
                console.log(`Wrote ${text.slice(0, 40)} to ${relativeName}`);
                filesMap[relativeName] = text;
            });
            // const jsFiles = emit.emittedFiles.filter(e => e.endsWith(".js") || e.endsWith(".jsx"));
            return {
                kind: "text",
                mimeType: "text/javascript",
                async getText() {
                    filesMap["scales.js"] = "import * as r from 'react'; r.x.y(); export const n = 10;"
                    filesMap["app.js"] = "import * as m from './scales'; console.log(m.n);"
                    const input = {
                        plugins: [virtual(filesMap)],
                        input: entryPoint,
                        ...rollupInputOptions
                    };
        
                    const rollupInput = await rollup.rollup(input);
                    const rollupOutput = await rollupInput.generate({ format: "umd", ...rollupOutputOptions });
                    console.log("emitting");
                    console.log(rollupOutput.output[0].code);
                    return rollupOutput.output[0].code;
                }
            };
        }
    };
    return file;
}


fn("D:/github/scales/tsconfig.json", "app.js", "/js/app.js", {
    input: "app.js",
    external: ["react", "react-dom"]
}, { globals: {"react": "React", "react-dom": "ReactDOM"} }).then(async code => {
    const r = await (await code.generate()).getText();
    console.log(r);
}).catch(e => {
    console.log(e);
});

// fn1().then();
