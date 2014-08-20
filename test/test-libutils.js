var libutils = require('../lib/utils')
var assert = require('assert')

var a = {
    name: 'foo',
    type: 'bar',
    value: 2
}
var b = {
    name: 'foo',
    type: 'baz',
    value: 4
}

var list = [a,b]
assert.deepEqual([],libutils.list_filter(list, {type:'bar', value:4}))

assert.deepEqual([b],libutils.list_filter(list, {type:'baz', value:4}))

assert.deepEqual([a],libutils.list_filter(list, {name:'foo', value:2}))

assert.deepEqual(list,libutils.list_filter(list, {name:'foo'}))
