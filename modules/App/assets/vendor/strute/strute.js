const STRUTE = {

    scriptPath: '',

    tagNameToType: {
        a: 'link',
        p: 'paragraph',
        ul: 'list',
        ol: 'list',
        li: 'listItem',
        code: 'code',
        h1: 'heading',
        h2: 'heading',
        h3: 'heading',
        h4: 'heading',
        h5: 'heading',
        h6: 'heading',
        img: 'image',
        hr: 'divider',
        br: 'lineBreak',
    },

    selClosingTags: [
        'embed',
        'input',
        'link',
        'param',
        'source',
        'track',
        'wbr',
        'hr',
        'br',
        'img'
    ],

    asyncHtmlToJson(htmlString) {

        return new Promise((resolve, reject) => {

            const worker = new Worker(`${this.scriptPath}/strute-worker.js`);

            worker.onmessage = function (event) {
                resolve(event.data);
            };

            worker.postMessage(JSON.stringify(htmlString));
        });
    },

    asyncJsonToHtml(jsonObj) {

        return new Promise((resolve, reject) => {

            const worker = new Worker(`${this.scriptPath}/strute-worker.js`);

            worker.onmessage = function (event) {
                resolve(event.data);
            };

            worker.postMessage(JSON.stringify(jsonObj));
        });
    },

    htmlToJson(htmlString) {
        const stack = [];
        const root = { type: 'root', children: [] };
        let currentNode = root;

        const regex = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?]]>|<(\/?)(\w+)((?:\s+[-a-z]+="[^"]*")*)\s?(\/?)>/gi;

        function parseAttributes(attributesString) {
            const attrs = {};
            const attrRegex = /([-a-z]+)="([^"]*)"/gi;
            let match;

            while ((match = attrRegex.exec(attributesString))) {
                attrs[match[1].toLowerCase()] = match[2];
            }

            return attrs;
        }

        function addTextNode(text) {
            const trimmed = text.trim();
            if (trimmed.length > 0) {
                currentNode.children.push({ type: 'text', value: trimmed });
            }
        }

        let match;
        let lastIndex = 0;

        while ((match = regex.exec(htmlString))) {

            const [fullMatch, closingSlash, tag, attributesString, selfClosing] = match;

            if (fullMatch.startsWith('<!--') || fullMatch.startsWith('<![CDATA[')) {
                continue;
            }

            addTextNode(htmlString.slice(lastIndex, match.index));
            lastIndex = regex.lastIndex;

            if (closingSlash) {
                currentNode = stack.pop();
            } else {
                const tagName = tag.toLowerCase();
                const type = this.tagNameToType[tagName] || 'element';
                const node = {
                    type: type,
                    meta: parseAttributes(attributesString),
                    children: []
                };

                if (!this.tagNameToType[tagName]) {
                    node.tag = tagName;
                }

                if (type === 'heading') {
                    node.level = parseInt(tagName.slice(1));
                } else if (type === 'list') {
                    node.ordered = tagName === 'ol';
                } else if (type === 'cell' && tagName === 'th') {
                    node.heading = true;
                }

                currentNode.children.push(node);

                if (!selfClosing && this.selClosingTags.indexOf(tagName) === -1) {
                    stack.push(currentNode);
                    currentNode = node;
                }
            }
        }

        addTextNode(htmlString.slice(lastIndex));

        return root;
    },

    jsonToHtml(jsonObj) {

        let html = '';

        ((jsonObj || {}).children || []).forEach(child => {
            html += this.createHtmlElement(child);
        });

        return html;
    },

    createHtmlElement(obj) {

        if (obj.type === 'text') {
            return obj.value;
        }

        let tagName;

        switch(obj.type) {
            case 'link':
                tagName = 'a';
                break;
            case 'paragraph':
                tagName = 'p';
                break;
            case 'list':
                tagName = obj.ordered ? 'ol' : 'ul';
                break;
            case 'listItem':
                tagName = 'li';
                break;
            case 'code':
                tagName = 'code';
                break;
            case 'heading':
                tagName = `h${obj.level}`;
                break;
            case 'image':
                tagName = 'img';
                break;
            case 'divider':
                tagName = 'hr';
                break;
            case 'lineBreak':
                tagName = 'br';
                break;
            case 'element':
                tagName = obj.tag;
                break;
            default:
                return '';
        }

        let element = `<${tagName}`;

        for (const [key, value] of Object.entries(obj.meta)) {
            element += ` ${key}="${value}"`;
        }

        if (this.selClosingTags.indexOf(tagName) !== -1) {
            element += ' />';
            return element;
        }

        element += '>';

        for (const child of obj.children) {
            element += this.createHtmlElement(child);
        }

        element += `</${tagName}>`;

        return element;

    }
};
