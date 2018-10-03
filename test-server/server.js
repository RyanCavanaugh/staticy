"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const self = require("../lib/index");
const express = require("express");
const path = require("path");
const home = __dirname;
const html = path.join(home, "html");
const css = path.join(home, "css");
const staticy = self();
staticy.addTransformedFolder(html, "/", (content) => {
    return new Promise((resolve) => {
        resolve(self.injectReloadScript(content.replace("world", "planet")));
    });
});
staticy.addTransformedFolder(css, "/", (content) => {
    return new Promise((resolve) => {
        resolve(content);
    });
});
const server = express();
server.use(staticy);
const port = 8233;
server.listen(port);
console.log(`Test server running at http://localhost:${port}`);
