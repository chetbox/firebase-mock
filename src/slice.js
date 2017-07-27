'use strict';

var _        = require('lodash');
var Snapshot = require('./snapshot');
var utils    = require('./utils');

function Slice (queue, snap) {
  var data = snap? snap.val() : queue.ref.getData();
  this.ref = snap? snap.ref : queue.ref;
  this.priority = snap? snap.getPriority() : this.ref.priority;
  this.outerMap = {};
  this.keys = [];
  this.data = this._build(this.ref, data, queue._q);
}

Slice.prototype.equals = function (slice) {
  return _.isEqual(this.data, slice.data);
};

Slice.prototype.pos = function (key) {
  return Object.keys(this.data).indexOf(this.key);
};

Slice.prototype.insertPos = function (prevChild) {
  var outerPos = this.outerMap[prevChild];
  if( outerPos >= this.min && outerPos < this.max ) {
    return outerPos+1;
  }
  return -1;
};

Slice.prototype.has = function (key) {
  return !!this.data[key];
};

Slice.prototype.snap = function (key) {
  var ref = this.ref;
  var data = this.data;
  var pri = this.priority;
  if( key ) {
    data = this.get(key);
    ref = ref.child(key);
    pri = this.pri(key);
  }
  return new Snapshot(ref, data, pri);
};

Slice.prototype.get = function (key) {
  return this.has(key)? this.data[key] : null;
};

Slice.prototype.changeMap = function (slice) {
  var changes = { added: [], removed: [] };
  _.each(this.data, function(v,k) {
    if( !slice.has(k) ) {
      changes.removed.push(k);
    }
  });
  _.each(slice.data, _.bind(function(v,k) {
    if( !this.has(k) ) {
      changes.added.push(k);
    }
  }, this));
  return changes;
};

Slice.prototype._build = function(ref, rawData, q) {
  if (rawData === null) {
    return {};
  }

  var numItems = Object.keys(rawData).length;
  function sortFn(orderBy) {
    return orderBy === 'key' ? function(keyVal) { return keyVal[0]; } : _.identity;
  }
  function includeBetween(orderBy, start, end) {
    return function(keyVal) {
      var sortVal = keyVal[0];
      return (start === undefined || sortVal.localeCompare(start) !== -1) &&
        (end === undefined || sortVal.localeCompare(end) !== 1);
    };
  }

  return _(rawData)
  .toPairs()
  .sortBy(sortFn(q.orderBy))
  .filter(includeBetween(q.orderBy, q.startValue, q.endValue))
  .take(q.limitorder === 'first' ? q.limit : numItems)
  .takeRight(q.limitorder === 'last' ? q.limit : numItems)
  .fromPairs()
  .value();
};

module.exports = Slice;
