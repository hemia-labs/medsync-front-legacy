import crypto from 'crypto-js';

function toSHA256(value) {
    let encrypted = crypto.SHA256(value)
    return encrypted.toString()
}

export {
    toSHA256
}