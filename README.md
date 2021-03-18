# Staticy

`staticy` is a library designed to ease the development and deployment of websites which consist solely of *static* artifacts - usually HTML, CSS, and JS files - hosted on a "dumb" server with no backend logic, for example GitHub Pages.

A typical use case would be a single-page app written with "compile-to" technologies like TypeScript, LESS/Sass, JavaScript combined with Rollup/Webpack/esbuild, markdown, or Handlebars.

`staticy` provides a development-time webserver that offers smart live reloading, smarter exception tracking, and more.

Once you're done developing, `staticy` can immediately produce a flat list of files to deploy to your target server (or GitHub Pages `docs` folder), eliminating the need for separate build scripts.

# Setup



# Conceptual Model

`staticy` is built around a few core concepts. Let's explain them at high-level, then dive into more details.

 * A *file provider* tells `staticy` about which *server files* exist, and how to generate them
 * Each *server file* in turn depends on zero or more *local files* through some *transform*

The distinction between a *server file* and a *local file* is critical.
A *server file* is a file that should be served to a browser.
A *client file* is a file that exists on disk.
For example, the *client file* might be a `.less` file which is transformed into a `.css` *server file*.

While there is often a one-to-one correspondence between server and client files, this isn't always the case.
This documentation will always disambiguate between *server files* and *local fils*.

# Server Configuration

Because `staticy` doesn't know how your HTTP server is configured, you may need to inform it of certain configuration details.

### Directory Defaults

Many HTTP servers will respond to a URL like `http://www.example.com/foo` by producing the contents of `foo/index.html`.
By default, if asked to render a path with no registered server file, `staticy` will then attempt to load that path with `/index.html` appended.

TODO: Implement some other behavior, somehow

### MIME types

HTTP servers must send correct [MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) in order for clients to render the content correctly.
By default, `staticy` will send a MIME type corresponding to the file extension of the server file, or `text/plain` if the file extension isn't a recognized one.

TODO: How is this otherwise configured?

# Simple Transforms



# Details for Implementors

