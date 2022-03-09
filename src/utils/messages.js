const prepMsg = (text, username = "") => {
    return {
        username,
        text,
        timestamp: new Date().getTime()
    }
}

module.exports = {
    prepMsg
}