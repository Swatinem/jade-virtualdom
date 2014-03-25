/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
"use strict";

module.exports = Compiler;

function isArray(expr) {
	return expr[0] === '[';
}
function isString(expr) {
	return expr[0] === '\'' || expr[0] === '"';
}
function collectClasses(classes) {
	var arrays = [];
	var singleClasses = [];
	classes.forEach(function (c) {
		if (isArray(c)) {
			return arrays.push(c);
		}
		if (isString(c)) {
			return c.substring(1, c.length - 1).split(/\s+/).forEach(function (c) {
				singleClasses.push(JSON.stringify(c));
			});
		}
		singleClasses.push(c);
	});
	return '[' + singleClasses.join(',') + ']' +
	       (arrays.length ? '.concat(' + arrays.join(').concat(') + ')' : '');
}
function camelize(str) {
	return str.replace(/\-(\w)/g, function (whole, char) {
		return char.toUpperCase();
	});
}

function Compiler(node, options) {
	this.node = node;
	this.options = options;
}

var mapFn = 'function _map(obj, fn) {\n' +
            '  if (typeof obj.length === "number") return [].map.call(obj, fn);\n' +
            '  var keys = Object.keys(obj);\n' +
            '  return keys.map(function (key) { return fn(obj[key], key); });\n' +
            '}';

Compiler.prototype.compile = function Compiler_compile() {
	this.needsMap = false;
	this.buf = [];
	this.depth = 0;
	this.buf.push('return ');
	this.visit(this.node, true);
	this.buf.push(';');
	if (this.needsMap)
		this.buf.unshift(mapFn);
	var ret = this.buf.map(function (str) {
		return 'buf.push(' + JSON.stringify(str) + ');';
	}).join('\n');
	//ret = 'return ' + ret + '';
	//console.log(ret);
	return ret;
};

Compiler.prototype.indent = function Compiler_indent(add) {
	if (this.ignoreIndent) {
		this.ignoreIndent = false;
		return '';
	}
	add = add || 0;
	return new Array(this.depth + 1 + add).join('  ');
};

Compiler.prototype.maybeFinishCode = function Compiler_maybeFinishCode(node) {
	// XXX: oh boy this is ugly
	if (node.type !== 'Code' && this.expectCode) {
		this.buf.push(' : undefined');
		this.expectCode = false;
		return true;
	}
};

Compiler.prototype.visit = function Compiler_visit(node, wrap) {
	if (this.maybeFinishCode(node))
		this.buf.push(',\n');
	return this['visit' + node.type](node, wrap);
};

Compiler.prototype.visitComment = function Compiler_visitComment() {
	this.buf.push(this.indent() + 'undefined');
};

Compiler.prototype.visitText = function Compiler_visitText(node) {
	// XXX: we have to do this bullshit until
	// https://github.com/visionmedia/jade/pull/1461 is merged
	// XXX: only care about very simple cases for now, no reason to get overly
	// complex if upstream jade is fixing this hopefully quite soon
	var splits = node.val.split(/(#{)(.*?)}/g);
	for (var i = 0; i < splits.length; i++) {
		var fragment = splits[i];
		if (fragment === '#{') {
			fragment = splits[++i];
			this.buf.push(this.indent(), '""+' + fragment);
		} else
			this.buf.push(this.indent(), JSON.stringify(fragment));
		if (i !== splits.length - 1)
			this.buf.push(',\n');
	}
};

Compiler.prototype.visitTag = function Compiler_visitTag(tag) {
	this.buf.push(this.indent() + '{\n');
	this.depth++;
	this.buf.push(this.indent() + 'tag: ', JSON.stringify(tag.name), ',\n');
	this.visitAttributes(tag.attrs, tag.attributeBlocks);
	if (tag.code || tag.block.nodes.length) {
		this.buf.push(this.indent() + 'children: [\n');
		this.depth++;
		if (tag.code) {
			this.visitCode(tag.code);
		}
		else {
			this.visitBlock(tag.block);
		}
		this.depth--;
		this.buf.push('\n' + this.indent() + ']\n');
	}
	this.depth--;
	this.buf.push(this.indent() + '}');
};

Compiler.prototype.visitAttributes = function Compiler_visitAttributes(attrs) {
	var classes = [];
	var data = {};
	var attributes = {};
	var key;
	attrs.forEach(function (attr) {
		if (attr.name === 'class')
			classes.push(attr.val);
		else if (attr.name.indexOf('data-') === 0)
			data[camelize(attr.name.substr(5))] = attr.val;
		else if (attr.name === 'key')
			key = attr.val;
		else
			attributes[attr.name] = attr.val;
	});
	if (classes.length) {
		this.buf.push(this.indent(), 'class: ' + collectClasses(classes) + ',\n');
	}
	var dataKeys = Object.keys(data);
	if (dataKeys.length) {
		this.buf.push(this.indent() + 'data: {' + dataKeys.map(function (key) {
			return key + ': ' + data[key];
		}).join(', ') + '},\n');
	}
	var attrKeys = Object.keys(attributes);
	if (attrKeys.length) {
		this.buf.push(this.indent() + 'attributes: {' + attrKeys.map(function (key) {
			return key + ': ' + attributes[key];
		}).join(', ') + '},\n');
	}
	if (key)
		this.buf.push(this.indent() + 'key: ' + key + ',\n');
	// TODO: styles?
};

Compiler.prototype.visitBlock = function Compiler_visitBlock(block, wrap) {
	var self = this;
	var last = block.nodes.length - 1;
	if (wrap && last) {
		this.depth++;
		this.buf.push('[\n');
	}
	block.nodes.forEach(function (n, i) {
		self.visit(n);
		if (!self.expectCode && i < last)
			self.buf.push(',\n');
	});
	this.maybeFinishCode({});
	if (wrap && last)
		this.buf.push('\n]');
};

Compiler.prototype.visitEach = function Compiler_visitEach(node) {
	// TODO: map function?
	this.needsMap = true;
	this.buf.push(this.indent() + '_map(' + node.obj + ', function (' + node.val +
	              ', ' + node.key + ') {\n' + this.indent(1) + 'return ');
	this.depth++;
	this.ignoreIndent = true;
	this.visitBlock(node.block);
	this.depth--;
	this.buf.push(';\n' + this.indent() +'})');
};

Compiler.prototype.visitCode = function Compiler_visitCode(code) {
	// TODO: escaping?
	var ifPos = code.val.indexOf('if');
	var elsePos = code.val.indexOf('else');
	if (ifPos === 0 || elsePos === 0) {
		if (elsePos === 0) {
			this.expectCode = false;
			this.ignoreIndent = true;
			this.buf.push(' : ');
		}
		if (ifPos === 0 || ifPos === 5) {
			this.buf.push(this.indent() + code.val.substr(code.val.indexOf('(')) + ' ? ');
		}
		this.buf.push('(');
		this.ignoreIndent = true;
		this.visitBlock(code.block);
		if (ifPos === 0 || ifPos === 5)
			this.expectCode = true;
		this.buf.push(')');
	} else if (code.val.indexOf('var') === 0) {
		// we just define an implicit var here, `with` will take care to create
		// a binding for it
		this.buf.push(this.indent() + '(' + code.val.substr(4) + ', undefined)');
	} else
		this.buf.push(this.indent() + '""+' + code.val);
};

