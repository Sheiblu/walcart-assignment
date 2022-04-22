const redis = require('redis');
const port = process.env.REDIS_PORT || 6379;
let host = process.env.REDIS_HOST || "127.0.0.1";

const client = redis.createClient({
    host: host,
    port: port
});

client.on('error', err => {
    console.log('Error redis connect' + err);
});


module.exports = {
    client
};