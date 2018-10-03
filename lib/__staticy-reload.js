// @ts-check

/**
 * @type {WebSocket}
 */
var socket;

function _staticyConnect() {
    socket = new WebSocket("ws://" + window.location.hostname + ":7772/reload");

    socket.addEventListener("message", (eventRaw) => {
        var event = JSON.parse(eventRaw.data);
        var url = event.url;
        console.log("Received data change message for: " + url);
        if (window.location.pathname === url) {
            console.log("HTML page is self");
            return window.location.reload(true);
        }

        const links = document.head.querySelectorAll("link");
        links.forEach(function(link) {
            if (link.href) {
                var cssUrl = new URL(link.href);
                if (cssUrl.pathname === url) {
                    link.href = link.href + "?t=" + Date.now();
                }
            }
        });
    });
}

_staticyConnect();