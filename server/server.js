require('dotenv').config({ path: __dirname + '/.env' });
const data = require('./data');
const api = require('./api');
const bot = require('./bot');

async function main() {
    try {
        await data.init();
    } catch (err) {
        console.error('[Data] Init failed — exiting:', err.message);
        process.exit(1);
    }

    api.start();
    bot.start();
}

main();

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());