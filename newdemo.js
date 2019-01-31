// @ts-check

const srv = require('./lib/site');
const fp = require('./lib/file-providers');

const site = srv.createSite();
site.addFileProvider(fp.staticFile("./README.md", "/README.md"));

site.runDevServer();