function isEmpty(obj) {
    for (var prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            return false
        }
    }

    return true
}

module.exports = { isEmpty }
