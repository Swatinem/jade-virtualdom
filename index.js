/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
/*jshint evil:true */
"use strict";

var Compiler = require('./lib/compiler');
var jade = require('jade');
var addWith = require('with');

module.exports = jadeVirtualdom;

function jadeVirtualdom(str, options) {
	options = options || {};
	options.compiler = Compiler;
	// render the jade to code
	var out = jade.render(str, options);
	// expose locals
	out = addWith('locals || {}', '\n' + out, ['undefined']);
	// and make it a function
	var fn = new Function('locals', out);
	return fn;
}

