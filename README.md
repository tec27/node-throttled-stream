#throttled-stream
Stream implementation with support for throttling data to a specified number of bytes per second. Inspired by [node-throttle](https://github.com/TooTallNate/node-throttle), but implemented as a full-on stream interface so that we can have more granular control over when and how data gets sent.

##Usage
```javascript
var throttle = require('throttled-stream')

// open a normal stream
var stream = require('fs').createReadStream('./myFile')

// get a throttled stream that runs at 64 KB/s or slower
var slowStream = throttle(stream, 64*1024)

slowStream.on('data', function(chunk) {
	// ...
})
```

##Methods
###throttled-stream(stream, bytesPerSecond, [maxWaitTimeMs = 100])
Pipes the specified stream into a new throttled stream, allowing at most `bytesPerSecond` bytes per second through. `maxWaitTimeMs` allows you to specify the maximum amount of time, in milliseconds, that the stream will wait before trying to emit another `data` event if it receives more data than it can allow through at once.

##Installation
```
npm install throttled-stream
```

##License
WTFPL
