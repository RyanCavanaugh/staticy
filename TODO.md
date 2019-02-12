# Quasi-prioritized Feature List

 * Impl `addTransformedFile`
 * Impl `addGeneratedFile`
 * Smarter error pages when generators throw
 * Write a rollup transformer
 * Basic docs
 * 'ls'
 * *Tests, hobbits?*
 * Demo projects
 * Clean up `package.json`
 * Extensive docs

# North star sample

```js
const site = staticy.create();
site.addDirectory("style/*.css");
site.addDirectory("style/*.scss", { transform: staticy.sass });
site.addDirectory("*.html", { transform: staticy.inlineStyles });

site.addFile("index.html", "/root/index.html");

site.runDevServer();
```

```sh
 > staticy
 > staticy --publish dev/
```