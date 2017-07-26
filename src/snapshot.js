'use strict';

var _ = require('lodash');

function MockDataSnapshot (ref, data, priority) {
  this.ref = ref;
  this.key = ref.key;
  data = _.cloneDeep(data);
  if (_.isObject(data) && _.isEmpty(data)) {
    data = null;
  }
  this.val = function () {
    return data;
  };
  this.getPriority = function () {
    return priority;
  };
}

MockDataSnapshot.prototype.child = function (key) {
  var ref = this.ref.child(key);
  var data = this.hasChild(key) ? this.val()[key] : null;
  var priority = this.ref.child(key).priority;
  return new MockDataSnapshot(ref, data, priority);
};

MockDataSnapshot.prototype.exists = function () {
  return this.val() !== null;
};

MockDataSnapshot.prototype.forEach = function (callback, context) {
  _.each(this.val(), _.bind(function (value, key) {
    callback.call(context, this.child(key));
  }, this));
};

MockDataSnapshot.prototype.hasChild = function (path) {
  return !!(this.val() && this.val()[path]);
};

MockDataSnapshot.prototype.hasChildren = function () {
  return !!this.numChildren();
};

MockDataSnapshot.prototype.name = function () {
  console.warn('DataSnapshot.name() is deprecated. Use DataSnapshot.key');
  return this.key;
};

MockDataSnapshot.prototype.numChildren = function () {
  return _.size(this.val());
};


MockDataSnapshot.prototype.exportVal = function () {
  var exportData = {};
  var priority = this.getPriority();
  var hasPriority = _.isString(priority) || _.isNumber(priority);
  if (hasPriority) {
    exportData['.priority'] = priority;
  }
  if (isValue(this.val())) {
    if (hasPriority) {
      exportData['.value'] = this.val();
    }
    else {
      exportData = this.val();
    }
  }
  else {
    _.reduce(this.val(), _.bind(function (acc, value, key) {
      acc[key] = this.child(key).exportVal();
      return acc;
    }, this), exportData);
  }
  return exportData;
};

function isValue (value) {
  return !_.isObject(value);
}

module.exports = MockDataSnapshot;
