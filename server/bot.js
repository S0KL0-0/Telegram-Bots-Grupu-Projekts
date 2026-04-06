const { Bot } = require('grammy');
const data = require('./data');

const token = process.env.BOT_TOKEN;
let bot = null;

if (token) {
    bot = new Bot(token);

    bot.command('start', (ctx) => ctx.reply('Hello!'));
} else {
    console.error('[Bot] BOT_TOKEN not set — bot disabled');
}

module.exports = {
    start: () => {
        if (!bot) return;
        bot.start({ onStart: () => console.log('[Bot] Polling started') });
    },
    stop: () => {
        if (bot) bot.stop();
    },
    bot,
};