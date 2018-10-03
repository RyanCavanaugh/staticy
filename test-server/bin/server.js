"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const self = require("../../lib/index");
const express = require("express");
const path = require("path");
const home = path.join(__dirname, "..");
const html = path.join(home, "html");
const css = path.join(home, "css");
const staticy = self();
staticy.addTransformedFolder(html, "/", (content) => {
    return new Promise((resolve) => {
        resolve(content.replace("world", "planet"));
    });
});
const server = express();
server.use(staticy);
const port = 8233;
server.listen(port);
console.log(`Test server running at http://localhost:${port}`);
