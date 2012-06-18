/*jshint laxcomma:true asi:true */
var Stream = require('stream')
  , util = require('util')

function ThrottledStream(bytesPerSecond, maxWaitTimeMs) {
  Stream.call(this)
  this.writable = true
  this.readable = true
  this._paused = false
  this._ended = false
  this._pending = []

  this.startTime = undefined
  this.totalBytes = 0
  this.bytesPerSecond = bytesPerSecond
  this.timeoutId = undefined
  this.maxWaitTime = maxWaitTimeMs || 100
  this._boundResume = this.resume.bind(this)
}
util.inherits(ThrottledStream, Stream);

ThrottledStream.prototype.write = function(data) {
  if(this._ended) return
  if(!this._paused) {
    var expected = data.length
      , actual = this._emitData(data)
    if(expected != actual) { // couldn't output whole chunk
      this._pending.unshift(data.slice(actual)) // place leftover piece in pending queue
      return false
    }
    return true
  }
  else {
    this._pending.push(data)
    return false
  }
}

ThrottledStream.prototype.end = function(data) {
  if(!this._ended) {
    this.emit('end')
    if(this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
  }
  this._ended = true;
}

ThrottledStream.prototype.pause = function() {
  this._paused = true;
  if(this.timeoutId) {
    clearTimeout(this.timeoutId)
    this.timeoutId = undefined
  }
}

ThrottledStream.prototype.resume = function() {
  this._paused = false
  this.timeoutId = undefined
  this._emitPending()
}

ThrottledStream.prototype.destroy = function() {
  this._ended = true
  if(this.timeoutId) {
    clearTimeout(this.timeoutId)
    this.timeoutId = undefined
  }
}

ThrottledStream.prototype._emitPending = function() {
  if(!this._pending.length) return

  var self = this
  process.nextTick(function() {
    while(!self._paused && self._pending.length) {
      var chunk = self._pending.shift()
        , expected = chunk.length
        , actual = self._emitData(chunk)

      if(expected != actual) { // couldn't output whole chunk
        self._pending.unshift(chunk.slice(actual)) // add leftover piece back to front of queue
      }
    }

    if(!self._paused && !self._pending.length && !self._ended) {
      self.emit('drain')
    }
  })
}

ThrottledStream.prototype._emitData = function(data) {
  if(!this.startTime) this.startTime = Date.now()
  var totalSeconds = (Date.now() - this.startTime) / 1000
    , allowed = Math.round(this.bytesPerSecond * totalSeconds)
    , newTotal = this.totalBytes + data.length

  if(newTotal > allowed) {
    var leftover = newTotal - allowed
      , cropped = data.slice(0, data.length - leftover)
      , sleepTime = leftover / this.bytesPerSecond * 1000

    if(sleepTime > this.maxWaitTime) sleepTime = this.maxWaitTime
    if(cropped.length) {
      this.totalBytes = this.totalBytes + cropped.length
      this.emit('data', cropped)
    }
    this.pause()
    if(this.timeoutId) clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(this._boundResume, sleepTime)
    return cropped.length
  }
  else {
    this.totalBytes = newTotal
    this.emit('data', data)
    return data.length
  }
}

module.exports = function(s, bytesPerSecond, maxWaitTimeMs) {
  var throttled = new ThrottledStream(bytesPerSecond, maxWaitTimeMs)
  return s.pipe(throttled)
}

// vim: tabstop=2:shiftwidth=2:softtabstop=2:expandtab

