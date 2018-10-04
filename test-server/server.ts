import self = require("../lib/index");
import express = require("express");
import fs = require("fs");
import path = require("path");

const home = __dirname;
const html = path.join(home, "html");
const css = path.join(home, "css");

const staticy = self();
staticy.addTransformedFolder(html, "/", (content) => {
    return new Promise<string>((resolve) => {
        resolve(self.injectReloadScript(content.replace("world", "planet")));
    });
});

staticy.addTransformedFolder(css, "/", (content) => {
    return new Promise<string>((resolve) => {
        resolve(content);
    });
});

const server = express();
server.use(staticy);

const port = 8233;
console.log(`Test server running at http://localhost:${port}`);

setTimeout(() => staticy.ls(), 600);

server.listen(port);
