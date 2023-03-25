importScripts('./strute.js');

self.onmessage = function (event) {

    const input = JSON.parse(event.data);
    const result = typeof(input) === 'string' ? STRUTE.htmlToJson(input) : STRUTE.jsonToHtml(input);

    // Post the result back to the main thread
    self.postMessage(result);
};
