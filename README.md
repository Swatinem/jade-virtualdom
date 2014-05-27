# jade-virtualdom

compile jade templates to [virtualdom](https://github.com/Swatinem/virtualdom)

Heavily inspired by [jade-react](https://github.com/duncanbeevers/jade-react)

[![Build Status](https://travis-ci.org/Swatinem/jade-virtualdom.png?branch=master)](https://travis-ci.org/Swatinem/jade-virtualdom)
[![Coverage Status](https://coveralls.io/repos/Swatinem/jade-virtualdom/badge.png?branch=master)](https://coveralls.io/r/Swatinem/jade-virtualdom)
[![Dependency Status](https://gemnasium.com/Swatinem/jade-virtualdom.png)](https://gemnasium.com/Swatinem/jade-virtualdom)

## Installation

    $ npm install jade-virtualdom

## Usage

```js
var fn = jadeVirtualdom('#jade.is.cool(key=somekey)=somecontent', {some: options});
var vnode = fn({key: '1', somecontent: 'locals \\o/'});
// and then render or diff the virtual dom:
var node = virtualDom.toDOM(vnode);
document.body.appendChild(node);
```

## License

  LGPLv3

  Released as free software as part of [ChatGrape](https://chatgrape.com/)

