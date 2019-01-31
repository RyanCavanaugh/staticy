// @ts-check

const srv = require('./lib/site');
const fp = require('./lib/file-providers');

const site = srv.createSite();

const colors = ["red", "green", "blue", "yellow", "orange"];

site.addFileProvider({
    getServerFiles() {
        return new Promise(resolve => {
            resolve([
                {
                    serverPath: "/index.html",
                    generate(change) {
                        setTimeout(change, 5000);
                        return new Promise(resolve => {
                            resolve({
                                kind: "text",
                                getText() {
                                    return new Promise(resolve => {
                                        resolve(`<html>
                                            <head>
                                                <link rel="stylesheet" type="text/css" media="screen" href="main.css" />
                                            </head>
                                            <body>The current time is ${(new Date()).toString()}</body>
                                            </html>`);
                                    });
                                }
                            })
                        });
                    }
                },
                {
                    serverPath: "/main.css",
                    generate(change) {
                        setTimeout(() => {
                            colors.unshift(colors.pop());
                            change();
                        }, 500);
                        return new Promise(resolve => {
                            resolve({
                                kind: "text",
                                getText() {
                                    return new Promise(resolve => {
                                        resolve(`body { background: ${colors[0]}; } }`);
                                    });
                                }
                            })
                        });
                    }
                }
            ]);
        })
    }
})


site.runDevServer();
