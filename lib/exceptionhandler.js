// Handle an exception and post an error response
exports.handleException = function handleException(res, err) {
	console.log("Exception:", (err && err.stack) ? err.stack : err);
  // XXX Error message
  res.json({
    result: 'error'
  });
};

