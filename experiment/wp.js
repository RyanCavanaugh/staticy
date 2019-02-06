// @ts-check
const webpack = require("webpack");
const memfs = require("memory-fs");

const mfs = new memfs();

mfs.mkdirSync("C:/");
mfs.writeFileSync("C:/app.js", "import * as q from './q'; q.foo()");
mfs.writeFileSync("C:/q.js", "export function foo() { console.log(''); }");

const wp = webpack({
    entry: "C:/app.js",
    output: {
        filename: "C:/out.js"
    }
});
wp.inputFileSystem = wp.outputFileSystem = mfs;

wp.run((err, stats) => {
    if (err || stats.hasErrors()) {
        throw err;
    }
    console.log(mfs.readFileSync("C:/out.js", "utf-8"));
});
