/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
"use strict";

var should = require('should');

var jadeV = require('../');

describe('jade-virtualdom', function () {
	it('should support simple text nodes', function () {
		var jade = '| text';
		var node = jadeV(jade)();
		node.should.eql('text');
	});
	it('should support basic tags', function () {
		var jade = 'div';
		var node = jadeV(jade)();
		node.should.eql({tag: 'div'});
	});
	it('should support basic ids and classes', function () {
		var jade = '#id.class';
		var node = jadeV(jade)();
		node.should.eql({tag: 'div', class: ['class'], attributes: {id: 'id'}});
	});
	it('should support both class shorthand and attributes', function () {
		var jade = '.class(class="attrclass")';
		var node = jadeV(jade)();
		node.should.eql({tag: 'div', class: ['class', 'attrclass']});
	});
	it('should support both class shorthand and attribute arrays', function () {
		var jade = '.class(class=["attrclass", "array"])';
		var node = jadeV(jade)();
		node.should.eql({tag: 'div', class: ['class', 'attrclass', 'array']});
	});
	it('should support both class shorthand and space separated attributes', function () {
		var jade = '.class(class="attrclass space")';
		var node = jadeV(jade)();
		node.should.eql({tag: 'div', class: ['class', 'attrclass', 'space']});
	});
	it('should support computed classes', function () {
		var jade = '.class(class=computed)';
		var node = jadeV(jade)({computed: 'iscomputed'});
		node.should.eql({tag: 'div', class: ['class', 'iscomputed']});
	});
	it('should support all classes mixed', function () {
		// FIXME: mixing array with space separated does not work
		var jade = '.class.second(class=["attrclass", computed])';
		var node = jadeV(jade)({computed: 'iscomputed'});
		node.should.eql({tag: 'div', class: ['class', 'second', 'attrclass', 'iscomputed']});
	});
	it('should support special `key`', function () {
		var jade = 'div(key=computed)';
		var node = jadeV(jade)({computed: 'iscomputed'});
		node.should.eql({tag: 'div', key: 'iscomputed'});
	});
	it('should support data attributes', function () {
		var jade = 'div(data-foo=computed, data-foo-bar="foobar")';
		var node = jadeV(jade)({computed: 'iscomputed'});
		node.should.eql({tag: 'div', data: {foo: 'iscomputed', fooBar: 'foobar'}});
	});
	it('should support code child', function () {
		var jade = 'div=computed';
		var node = jadeV(jade)({computed: 'iscomputed'});
		node.should.eql({tag: 'div', children: ['iscomputed']});
	});
	it('should support children', function () {
		var jade = 'div\n' +
		           '  =computed\n' +
		           '  span text\n' +
		           '  | more text\n';
		var node = jadeV(jade)({computed: 'iscomputed'});
		node.should.eql({tag: 'div', children: [
			'iscomputed',
			{tag: 'span', children: ['text']},
			'more text'
		]});
	});
	it('should support multiple children', function () {
		var jade = 'div\ndiv';
		var node = jadeV(jade)();
		node.should.eql([{tag: 'div'}, {tag: 'div'}]);
	});
	it('should support if and else', function () {
		var jade = 'if condition\n' +
		           '  | got true\n' +
		           'else\n' +
		           '  | got false';
		var node = jadeV(jade)({condition: true});
		node.should.eql(['got true']);
		node = jadeV(jade)({condition: false});
		node.should.eql(['got false']);
	});
	it('should support if and else if', function () {
		var jade = 'if condition == 2\n' +
		           '  | got two\n' +
		           'else if condition == 1\n' +
		           '  | got one\n' +
		           'else\n' +
		           '  | got zero\n';
		var node = jadeV(jade)({condition: 2});
		node.should.eql(['got two']);
		node = jadeV(jade)({condition: 1});
		node.should.eql(['got one']);
		node = jadeV(jade)({condition: 0});
		node.should.eql(['got zero']);
	});
	it('should support if without else', function () {
		var jade = 'if condition\n' +
		           '  | got true\n';
		var node = jadeV(jade)({condition: true});
		node.should.eql('got true');
		node = jadeV(jade)({condition: false});
		should.not.exist(node);
	});
	it('should support if without else before other nodes', function () {
		var jade = 'if condition\n' +
		           '  | got true\n' +
		           '| other child';
		var node = jadeV(jade)({condition: true});
		node.should.eql(['got true', 'other child']);
		node = jadeV(jade)({condition: false});
		node.should.eql([undefined, 'other child']);
	});
	it('should support each array', function () {
		var jade = 'each el in arr\n' +
		           '  li=el';
		var node = jadeV(jade)({arr: [1, 2]});
		node.should.eql([{tag: 'li', children: ['1']},{tag: 'li', children: ['2']}]);
		node[0].children[0].should.be.type('string');
	});
	it('should support key value iteration of objects', function () {
		var jade = 'each el, key in obj\n' +
		           '  li(key=key)=el';
		var node = jadeV(jade)({obj: {'k1': 1, 'k2': 2}});
		node.should.eql([{tag: 'li', key: 'k1', children: ['1']},{tag: 'li', key: 'k2', children: ['2']}]);
		node[0].children[0].should.be.type('string');
	});
	it('should support iteration on array-like objects', function () {
		var jade = 'each el in arr\n' +
		           '  li=el';
		var node = jadeV(jade)({arr: {0: 1, 1: 2, length: 2}});
		node.should.eql([{tag: 'li', children: ['1']},{tag: 'li', children: ['2']}]);
		node[0].children[0].should.be.type('string');
	});
	it('should deal with variable interpolation', function () {
		var jade = 'div #{obj.prop[0]}text#{obj.prop[1]}';
		var node = jadeV(jade)({obj: {prop: [0, 1]}});
		node.should.eql({tag: 'div', children: ['0text1']});
	});
	it('should ignore comments', function () {
		var jade = 'div\n// comment';
		var node = jadeV(jade)({});
		node.should.eql([{tag: 'div'}, undefined]);
	});
	it('should support code with assignments', function () {
		var jade = '-var foo = bar\ndiv=foo';
		var node = jadeV(jade)({bar: 'bar'});
		// XXX: would be nice to avoid that undefined here
		node.should.eql([undefined, {tag: 'div', children: ['bar']}]);
	});
});

