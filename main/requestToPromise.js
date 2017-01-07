var walk = require('y-walk'),
    Cb = require('y-callback');

module.exports = walk.wrap(function*(req){
  var result = {
    error: req.onerror = Cb(),
    success: req.onsuccess = Cb()
  };

  result = yield result;

  if('success' in result) return req.result;
  throw req.error;
});
