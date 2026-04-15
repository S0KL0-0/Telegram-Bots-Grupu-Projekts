const { Bot, InlineKeyboard, webhookCallback } = require('grammy');
const data = require('./data');

const token = process.env.BOT_TOKEN?.toUpperCase() !== 'NONE' && process.env.BOT_TOKEN || null;
const WEBHOOK_URL = (process.env.WEBHOOK_URL?.toUpperCase() !== 'NONE' && process.env.WEBHOOK_URL)
    || process.env.RENDER_EXTERNAL_URL
    || null;
let bot = null;

// Helpers

function now() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Riga' }));
}

function tomorrow() {
    const d = now(); d.setDate(d.getDate() + 1); return d;
}

function fmtDate(d) {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function cleanWeekName(name) {
    const range = data.parseWeekRange(name);
    if (!range) return name;
    return `${fmtDate(range.from)} - ${fmtDate(range.to)} (${range.from.getFullYear()})`;
}

// Responses

function formatDay(week, dayIndex, label) {
    const slots = data.getDaySlots(week, dayIndex);
    const entries = Object.entries(slots).sort((a, b) => a[0] - b[0]);
    if (!entries.length) return null;

    const lines = [`<b>${label}</b>`];
    for (const [pos, slot] of entries) {
        const p = pos - dayIndex * 10;
        const pEnd = p + (slot.duration || 1) - 1;
        const tFrom = data.PERIODS[String(p)];
        const tTo = data.PERIODS[String(pEnd)];
        const pRange = slot.duration > 1 ? `${p}-${pEnd}` : `${p}`;
        const tRange = tFrom && tTo ? ` (${tFrom.from}-${tTo.to})` : '';

        lines.push(`${pRange}.${tRange}`);
        lines.push(`  <b>${slot.subject || ''}</b>`);
        const details = [slot.classroom, slot.teacher].filter(Boolean).join(' · ');
        if (details) lines.push(`  <i>${details}</i>`);
    }
    return lines.join('\n');
}

function lookupDay(groupName, date) {
    const di = date.getDay() - 1;
    if (di < 0 || di > 4) return 'Brīvdiena.';

    const gd = data.getGroupData(groupName);
    if (!gd) return `Grupa <b>${groupName}</b> nav atrasta.`;

    const found = data.findWeekForDate(gd, date);
    if (!found) return `Nav saraksta ${fmtDate(date)} grupai <b>${groupName}</b>.`;

    const txt = formatDay(found.week, di, `${data.DAYS_FULL[di]}, ${fmtDate(date)}`);
    if (!txt) return `<b>${groupName}</b> - ${data.DAYS_FULL[di].toLowerCase()} nav stundu.`;

    return `<b>${groupName}</b>\n\n${txt}`;
}

function lookupWeek(groupName, next) {
    const gd = data.getGroupData(groupName);
    if (!gd) return `Grupa <b>${groupName}</b> nav atrasta.`;

    const monday = data.toMonday(now());
    const found = next
        ? data.findNextWeek(gd, monday)
        : data.findWeekForDate(gd, monday);

    if (!found) return `Nav saraksta ${next ? 'nākamajai' : 'šai'} nedēļai grupai <b>${groupName}</b>.`;

    const parts = [];
    for (let d = 0; d < 5; d++) {
        const txt = formatDay(found.week, d, data.DAYS_FULL[d]);
        if (txt) parts.push(txt);
    }

    if (!parts.length) return `<b>${groupName}</b> - ${next ? 'nākamajā' : 'šajā'} nedēļā nav stundu.`;

    return `<b>${groupName}</b>\n\n<b>${cleanWeekName(found.week.name)}</b>\n\n` + parts.join('\n\n');
}

// Keyboards

const SEP = ':';
// tag:pfx:group
// Stack example
// td:P:P23-2

function spush(base, segment) {
    return base + SEP + segment;
}

function spop(base) {
    const i = base.lastIndexOf(SEP);
    return i === -1 ? base : base.slice(0, i);
}

function getGroupsByPrefix() {
    // Map of:
    // "P": {"P23-1", "P23-2", "P24-1", "P24-2"}, e.c.
    const map = new Map();
    for (const name of data.getGroupNames()) {
        const pfx = name.match(/^([A-Za-z]+)/)?.[1] || name;
        if (!map.has(pfx)) map.set(pfx, []);
        map.get(pfx).push(name);
    }
    return map;
}

function prefixKeyboard(tag) {
    // P, DT, E, LD, T
    const kb = new InlineKeyboard();
    let col = 0;
    for (const [pfx, groups] of getGroupsByPrefix()) {
        kb.text(`${pfx} (${groups.length})`, spush(tag, pfx));
        if (++col % 4 === 0) kb.row();
    }
    return kb;
}

function groupKeyboard(callbackBase, prefix) {
    // P23-1, P23-2, P24-1, P24-2, utt.
    const kb = new InlineKeyboard();
    const groups = getGroupsByPrefix().get(prefix) || [];
    let col = 0;
    for (const g of groups) {
        kb.text(g, spush(callbackBase, g));
        if (++col % 3 === 0) kb.row();
    }
    kb.row().text('Atpakaļ', spop(callbackBase));
    return kb;
}

function promptGroup(ctx, tag, label) {
    // First: P, DT, E, LD, T
    // Then: From the map (getGroupsByPrefix) (done using telegrams callback query handlers)
    return ctx.reply(`${label} - izvēlies grupu:`, {
        parse_mode: 'HTML',
        reply_markup: prefixKeyboard(tag),
    });
}

if (token) {
    bot = new Bot(token);

    bot.catch((err) => {
        console.error('[Bot] Unhandled error:', err.message);
    });

    bot.command('start', (ctx) => ctx.reply(
        '<b>RTK Stundu Saraksts</b>\n\n' +
        '/today - Šodienas saraksts\n' +
        '/tmrw - Rītdienas saraksts\n' +
        '/week - Šīs nedēļas saraksts\n' +
        '/nweek - Nākamās nedēļas saraksts',
        { parse_mode: 'HTML' }
    ));

    bot.command('help', (ctx) => ctx.reply(
        '/today - Šodienas saraksts\n' +
        '/tmrw - Rītdienas saraksts\n' +
        '/week - Šīs nedēļas saraksts\n' +
        '/nweek - Nākamās nedēļas saraksts',
        { parse_mode: 'HTML' }
    ));

    bot.command('today', async (ctx) => {await promptGroup(ctx, 'td', 'Šodiena');});
    bot.command('tmrw', async (ctx) => {await promptGroup(ctx, 'tm', 'Rītdiena');});
    bot.command('week', async (ctx) => {await promptGroup(ctx, 'wk', 'Šī nedēļa');});
    bot.command('nweek', async (ctx) => {await promptGroup(ctx, 'nw', 'Nākamā nedēļa');});

    bot.on('callback_query:data', async (ctx) => {
        try {
            const parts = ctx.callbackQuery.data.split(SEP);

            switch (parts.length) {
                case 1:
                    await ctx.editMessageReplyMarkup({
                        reply_markup: prefixKeyboard(parts[0]),
                    });
                    break;
                case 2:
                    await ctx.editMessageReplyMarkup({
                        reply_markup: groupKeyboard(ctx.callbackQuery.data, parts[1]),
                    });
                    break;
                case 3: {
                    const tag = parts[0];
                    const group = parts[2];
                    const label = { td: 'Šodiena', tm: 'Rītdiena', wk: 'Šī nedēļa', nw: 'Nākamā nedēļa' }[parts[0]] || '?';

                    await ctx.editMessageText(`${label} (${group})`, { parse_mode: 'HTML' });

                    let text;
                    switch (tag) {
                        case 'td': text = lookupDay(group, now()); break;
                        case 'tm': text = lookupDay(group, tomorrow()); break;
                        case 'wk': text = lookupWeek(group, false); break;
                        case 'nw': text = lookupWeek(group, true); break;
                        default:   text = '?';
                    }
                    await ctx.reply(text, { parse_mode: 'HTML' });
                    break;
                }
            }
        } catch (err) {
            console.error('[Bot] Callback error:', err.message);
        }
        await ctx.answerCallbackQuery();
    });

    bot.api.setMyCommands([
        { command: 'today', description: 'Šodienas saraksts' },
        { command: 'tmrw', description: 'Rītdienas saraksts' },
        { command: 'week', description: 'Šīs nedēļas saraksts' },
        { command: 'nweek', description: 'Nākamās nedēļas saraksts' },
    ]).catch(err => console.error('[Bot] setMyCommands failed:', err.message));

} else {
    console.error('[Bot] BOT_TOKEN not set - bot disabled');
}

module.exports = {
    start: () => {
        if (!bot) return;
        if (WEBHOOK_URL) {
            bot.api.setWebhook(`${WEBHOOK_URL}/bot`);
            console.log(`[Bot] Webhook set to ${WEBHOOK_URL}/bot`);
        } else {
            bot.start({ onStart: () => console.log('[Bot] Polling started') });
        }
    },
    stop: () => { if (bot) bot.stop(); },
    bot,
    webhook: bot && WEBHOOK_URL ? webhookCallback(bot, 'express') : null,
};