module.exports.emailBody = (name, url, key) => {
    return 
    `Hello ${name},
    
    To reset your email, please visit,
    ${url + key}
    If you don't want to reset your password or you didn't request this, ignore or delete this message.
    Do not forward this message.

    Issue Tracker`
};