module.exports = (name, url, key) => {
    console.log('In module function', name);
    return  `Hello ${name},
    
    To reset your email, please visit,
    ${url}/reset/${key}
    If you don't want to reset your password or you didn't request this, ignore or delete this message.
    Do not forward this message.

    Issue Tracker`;
};