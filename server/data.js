async function fetchTimetables() {

    /*
    Returns an array of objects
    [
      {
        tt_num: '5',
        text: 'Saraksts_2025_Janvaris_19.ned._06.01.-10.12 (06. 01. - 10. 01. 2025)'
      },
      {
        tt_num: '9',
        text: 'Saraksts_2025__Janvaris_20.ned_13.01.-17.01. (13. 01. - 17. 01. 2025)'
      },
      {
        tt_num: '11',
        text: 'Saraksts_2025_21.ned_20.01.- 24.01. (20. 01. - 24. 01. 2025)'
      },
    ]
    */

    const res = await fetch("https://rtk.edupage.org/timetable/server/ttviewer.js?__func=getTTViewerData", {
        method: "POST",
        headers: {
            "content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ __args: [null, 2025], __gsh: "00000000" }),
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

async function fetchData() {
    const timetables = await fetchTimetables(); // [{"tt_num", "text"}]
    const groups = {}; // group -> week -> pos -> card

    for (const { tt_num, text: weekName } of timetables) {
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

// --- Cache ---
const PAGE_SIZE = 3;
let cachedData = null;
let cachedGroupsMeta = null;

async function init() {
    console.log('[Data] Fetching data...');
    cachedData = await fetchData();
    cachedGroupsMeta = Object.keys(cachedData)
        .sort()
        .map((name) => {
            const weekCount = Object.keys(cachedData[name]).length;
            return { name, pages: Math.ceil(weekCount / PAGE_SIZE) };
        });
    console.log(`[Data] Cached ${cachedGroupsMeta.length} groups`);
}

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

module.exports = { fetchTimetables, fetchWeekData, fetchData, init, getGroupsMeta, getGroupPage };