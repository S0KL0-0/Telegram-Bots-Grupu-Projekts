const PERIODS = {
    "1": { from: "08:20", to: "09:00" },
    "2": { from: "09:05", to: "09:45" },
    "3": { from: "10:05", to: "10:45" },
    "4": { from: "10:50", to: "11:30" },
    "5": { from: "12:10", to: "12:50" },
    "6": { from: "12:55", to: "13:35" },
    "7": { from: "13:45", to: "14:25" },
    "8": { from: "14:30", to: "15:10" },
    "9": { from: "15:20", to: "16:00" },
    "10": { from: "16:05", to: "16:45" }
};

const DAYS_FULL = ['Pirmdiena', 'Otrdiena', 'Trešdiena', 'Ceturtdiena', 'Piektdiena'];

async function fetchTimetables() {
    // Returns: [ { tt_num: '5', text: 'Saraksts_2025_Janvaris_19.ned._06.01.-10.12 (06. 01. - 10. 01. 2025)' } ]

    const res = await fetch("https://rtk.edupage.org/timetable/server/ttviewer.js?__func=getTTViewerData", {
        method: "POST",
        headers: {
            "content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ __args: [null, new Date().getFullYear()], __gsh: "00000000" }),
    });

    const json = await res.json();

    return json.r.regular.timetables
        .map(({ tt_num, text }) => ({ tt_num, text }))
        .sort((a, b) => Number(a.tt_num) - Number(b.tt_num));
}

async function fetchWeekData(tt_num) {
    const res = await fetch("https://rtk.edupage.org/timetable/server/regulartt.js?__func=regularttGetData", {
        method: "POST",
        headers: {
            "content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ __args: [null, tt_num], __gsh: "00000000" }),
    });

    const json = await res.json();
    const tables = json.r.dbiAccessorRes.tables;

    const lookup = {};
    for (const key of ["cards", "classrooms", "lessons", "classes", "subjects", "teachers", "groups"]) {
        const table = tables.find(t => t.id === key);
        lookup[key] = table ? table.data_rows : [];
    }

    return lookup;
}

function loadPrecomputed() {
    // Improved loading by reducing loading time from ~7100ms to ~600ms
    try {
        const { precomputedWeeks, precomputedGroups } = require('./precomputed');
        console.log(`[DATA] Loaded precomputed cache (${precomputedWeeks.length} weeks)`);
        return {
            groups: precomputedGroups,
            precomputedWeeks: new Set(precomputedWeeks),
        };
    } catch {
        return { groups: {}, precomputedWeeks: new Set() };
    }
}

async function fetchData() {
    const { groups, precomputedWeeks } = loadPrecomputed();

    const timetables = await fetchTimetables();
    const toFetch = timetables.filter(t => !precomputedWeeks.has(t.tt_num));

    for (const { tt_num, text: weekName } of toFetch) {
        const week = await fetchWeekData(tt_num); // {"cards", "classrooms", "lessons", "classes", "subjects", "teachers", "groups"}

        const lessonsMap = Object.fromEntries(week.lessons.map(l => [l.id, l]));
        const classesMap = Object.fromEntries(week.classes.map(c => [c.id, c]));

        const subjectsMap = Object.fromEntries(week.subjects.map(s => [s.id, s]));
        const teachersMap = Object.fromEntries(week.teachers.map(t => [t.id, t]));
        const classroomsMap = Object.fromEntries(week.classrooms.map(c => [c.id, c]));

        for (const card of week.cards) {
            const lesson = lessonsMap[card.lessonid];
            if (!lesson) continue;

            const day = card.days.indexOf("1");
            if (day === -1) continue;

            const pos = (day * 10) + Number(card.period);

            const slotData = {
                subject: subjectsMap[lesson.subjectid]?.name,
                teacher: teachersMap[lesson.teacherids?.[0]]?.name,
                classroom: classroomsMap[card.classroomids?.[0]]?.name,
                duration: lesson.durationperiods || 1,
            };

            for (const classId of lesson.classids || []) {
                const className = classesMap[classId]?.name;
                if (!className) continue;

                groups[className] ??= {};
                groups[className][tt_num] ??= { name: weekName, slots: {} };
                groups[className][tt_num].slots[pos] = slotData;
            }
        }
    }

    return groups;
}

// ----------- Cache -----------
const PAGE_SIZE = 3;
let cachedData = null;
let cachedGroupsMeta = null;

async function init() {
    console.log('[DATA] Fetching data...');
    cachedData = await fetchData();
    cachedGroupsMeta = Object.keys(cachedData)
        .sort()
        .map((name) => {
            const weekCount = Object.keys(cachedData[name]).length;
            return { name, pages: Math.ceil(weekCount / PAGE_SIZE) };
        });
    console.log(`[DATA] Cached ${cachedGroupsMeta.length} groups`);
}

// -----------------------------------------------------------------

// Api

function getGroupsMeta() {
    return cachedGroupsMeta;
}

function getGroupPage(name, page = 1) {
    const data = cachedData[name];
    if (!data) return null;

    const sortedEntries = Object.entries(data).sort((a, b) => Number(b[0]) - Number(a[0]));
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    return {
        weeks: Object.fromEntries(sortedEntries.slice(start, end)),
        hasMore: end < sortedEntries.length,
    };
}

// Bot

function getGroupNames() {
    return cachedGroupsMeta ? cachedGroupsMeta.map(g => g.name) : [];
}

function parseWeekRange(text) {
    // "Saraksts_2025_21.ned_20.01.- 24.01. (20. 01. - 24. 01. 2025)"
    // [20, 1, 24, 1, 2025]
    const m = text.match(/\((\d{2})\.\s*(\d{2})\.\s*-\s*(\d{2})\.\s*(\d{2})\.\s*(\d{4})\)/);
    if (!m) return null;
    const [, d1, m1, d2, m2, year] = m;
    return {
        from: new Date(Number(year), Number(m1) - 1, Number(d1)),
        to:   new Date(Number(year), Number(m2) - 1, Number(d2)),
    };
}

function toMonday(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 6=Sat
    if (day === 0) d.setDate(d.getDate() + 1);      // Sun -> next Mon
    else if (day === 6) d.setDate(d.getDate() + 2); // Sat -> next Mon
    return d;
}

function findWeekForDate(groupData, date) {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    for (const [tt_num, week] of Object.entries(groupData)) {
        const range = parseWeekRange(week.name);
        if (!range) continue;
        if (range.from <= target && target <= range.to) {
            return { tt_num, week };
        }
    }
    return null;
}

function findNextWeek(groupData, date) {
    const next = new Date(date);
    next.setDate(next.getDate() + 7);
    return findWeekForDate(groupData, next);
}

function getGroupData(name) {
    return cachedData ? cachedData[name] || null : null;
}

function getDaySlots(week, dayIndex) {
    const slots = {};
    for (let p = 1; p <= 10; p++) {
        const pos = dayIndex * 10 + p;
        if (week.slots[pos]) {
            slots[pos] = week.slots[pos];
        }
    }
    return slots;
}

module.exports = {
    PERIODS, DAYS_FULL, init, getGroupsMeta, getGroupPage,
    getGroupNames, getGroupData, findWeekForDate, toMonday, findNextWeek, getDaySlots, parseWeekRange
};