function groupByPrefix(groups) {
    const result = {};

    for (const group  of groups) {
        const prefix =  group.name.match(/^[A-Z]+/)[0];
        if (!group.name.match(/[A-Z]+\d{2}/)) continue;
        result[prefix] ??= [];
        result[prefix].push(group);
    }
    return result;
}

function parseWeekRange(text) {
    const m = text.match(/\((\d{2})\.\s*(\d{2})\.\s*-\s*(\d{2})\.\s*(\d{2})\.\s*(\d{4})\)/);
    if (!m) return null;
    const [, d1, m1, d2, m2, year] = m;
    return {
        from: new Date(Number(year), Number(m1) - 1, Number(d1)),
        to:   new Date(Number(year), Number(m2) - 1, Number(d2)),
    };
}

function formatWeekName(name) {
    const match = name.match(/\((.+)\)/);
    if (!match) return name;
    return match[1].replace(/^\d+\.ned\.\s*/, "");
}

function buildDays(week) {
    const days = [];

    for (let d = 0; d < 5; d++) {
        days.push({
            label: DAYS[d],
            slots: []
        });
        for (let p = 1; p <= 10; p++) {
            const slot = week.slots[d * 10 + p];
            days[d].slots.push(slot);
        }
    }
    return days
}