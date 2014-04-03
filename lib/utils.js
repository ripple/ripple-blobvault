var generateEmailToken = function() {
    return (Math.random()+1).toString(36).substr(2)
}
exports.generateToken = generateEmailToken
