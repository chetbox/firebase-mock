'use strict';

var _        = require('lodash');
var Snapshot = require('./snapshot');
var utils    = require('./utils');

function Slice (queue, snap) {
  this.ref = snap ? snap.ref : queue.ref;
  var data = snap ? snap.val() : this.ref.getData();
  this.childPriorities = this.ref.getChildPriorities();
  this.priority = snap ? snap.getPriority() : this.ref.priority;
  this.outerMap = {};

  var dataKeyValuePairs = this._buildKeyValuePairs(this.ref, data, queue._q);
  this.data = _.fromPairs(dataKeyValuePairs);
  this.sortedKeys = _.map(dataKeyValuePairs, function(keyVal) { return keyVal[0]; });
}

Slice.prototype.equals = function (slice) {
  return _.isEqual(this.data, slice.data);
};

Slice.prototype.pos = function (key) {
  return this.sortedKeys.indexOf(this.key);
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

Slice.prototype._buildKeyValuePairs = function(ref, rawData, q) {
  if (rawData === null) {
    return [];
  }

  var numItems = Object.keys(rawData).length;
  function sortFn(orderBy, childPriorities) {
    function orderByKey(keyVal) {
      return keyVal[0];
    }
    function orderByPriorityType(keyVal) {
      return {
        undefined: 0,
        number: 1,
        string: 2
      }[typeof(childPriorities[keyVal[0]])];
    }
    function orderByPriorityValue(keyVal) {
      var pri = childPriorities[keyVal[0]];
      return pri !== undefined ? pri : Number.MIN_VALUE; // no priority comes first
    }
    if (orderBy === 'priority') return [orderByPriorityType, orderByPriorityValue, orderByKey];
    return [orderByKey];
  }
  function includeBetween(orderBy, start, end, childPriorities) {
    return function(keyVal) {
      var sortVal = keyVal[0]; // default to orderByKey
      if (orderBy === 'priority') sortVal = childPriorities[keyVal[0]];
      return (start === undefined || sortVal.localeCompare(start) !== -1) &&
        (end === undefined || sortVal.localeCompare(end) !== 1);
    };
  }

  return _(rawData)
  .toPairs()
  .sortBy(sortFn(q.orderBy, this.childPriorities))
  .filter(includeBetween(q.orderBy, q.startValue, q.endValue, this.childPriorities))
  .take(q.limitorder === 'first' ? q.limit : numItems)
  .takeRight(q.limitorder === 'last' ? q.limit : numItems)
  .value();
};


module.exports = Slice;
