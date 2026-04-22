const serverUrl = "https://stundu-saraksts.onrender.com"
const RENDER_DASHBOARD = "https://stundu-saraksts.onrender.com";
const REPO_URL = "https://github.com/S0KL0-0/Telegram-Bots-Grupu-Projekts";

function showStartupPopup() {
    const overlay = document.createElement("div");
    overlay.id = "startupOverlay";
    overlay.innerHTML = `
        <div id="startupPopup">
            <h2>Serveris nav pieejams</h2>
            <p id="popupStatus">Nospied pogu lai pārbaudītu serveri.</p>
            <p id="popupDescription">
                Serveris ir hostots uz bezmaksas Render.com instances, tāpēc palaišana var aizņemt kādu laiku.
                Lai sekotu progresam, spied <a href="${RENDER_DASHBOARD}" target="_blank">šeit</a>.
                Ja serveris vairs nav pieejams, vari to hostot pats no šī <a href="${REPO_URL}" target="_blank">repozitorija</a>.
            </p>
            <button id="popupContinue">Turpināt</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const statusEl = document.getElementById("popupStatus");
    const continueBtn = document.getElementById("popupContinue");

    continueBtn.addEventListener("click", async () => {
        continueBtn.disabled = true;
        statusEl.textContent = "Pārbauda serveri...";

        try {
            const res = await fetch(`${serverUrl}/health`);
            if (res.ok) {
                overlay.remove();
                fetchGroups();
                return;
            }
        } catch (e) {
            // not ready
        }

        statusEl.textContent = "Serveris vēl nav gatavs. Mēģini vēlāk.";

        // 5s cooldown
        let seconds = 5;
        continueBtn.textContent = `Uzgaidi (${seconds}s)`;
        const countdown = setInterval(() => {
            seconds--;
            continueBtn.textContent = `Uzgaidi (${seconds}s)`;
            if (seconds <= 0) {
                clearInterval(countdown);
                continueBtn.textContent = "Turpināt";
                continueBtn.disabled = false;
            }
        }, 1000);
    });
}

// -----------------------------------------------------------------

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

// -----------------------------------------------------------------

const DAYS = ["Pi", "Ot", "Tr", "Ce", "Pk"];

let currentGroup = null;
let currentPage = 0;
let hasMore = false;
let isShortDay = false;

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

const ShortenDay = {
    "1": { from: "08:20", to: "08:50" },
    "2": { from: "08:50", to: "09:20" },
    "3": { from: "09:35", to: "10:05" },
    "4": { from: "10:05", to: "10:35" },
    "5": { from: "11:05", to: "11:35" },
    "6": { from: "11:35", to: "12:05" },
    "7": { from: "12:15", to: "12:45" },
    "8": { from: "12:45", to: "13:15" },
    "9": { from: "13:25", to: "13:55" },
    "10": { from: "13:55", to: "14:25" }
}

const rtkPrograms = {
    AT: "Autotransports",
    DT: "Datorsistēmas",
    E: "Enerģētika",
    EL: "Elektronika / elektriskās iekārtas",
    LD: "Loģistika",
    MH: "Mehānika (inženiermehānika)",
    P: "Programmēšana",
    ST: "Sakaru tehnoloģijas (telekomunikācijas / telemātika)",
    T: "Tehnoloģijas",
    VT: "Vides tehnoloģijas"
};

function renderSidebar(groups) {

    const sidebar = document.getElementById("sidebar");
    const grouped = groupByPrefix(groups);


    for (const prefix of Object.keys(grouped)) {
        const prefixLi = document.createElement("li");
        prefixLi.textContent = `${prefix} - ${rtkPrograms[prefix] || prefix}`;

        const groupUl = document.createElement("ul");
        groupUl.classList.add("hidden");

        const backLi = document.createElement("li");
        backLi.textContent = "Atpakaļ";
        backLi.addEventListener("click", (e) => {
            e.stopPropagation();
            groupUl.classList.add("hidden");
            sidebar.querySelectorAll(":scope > li").forEach(li => li.classList.remove("hidden"));
        });
        groupUl.prepend(backLi);

        prefixLi.addEventListener("click", () => {
            sidebar.querySelectorAll(":scope > li").forEach(li => li.classList.add("hidden"));
            groupUl.classList.remove("hidden");
        });

        for (const group of grouped[prefix]) {
            const year = document.createElement("li");
            year.textContent = group.name;

            year.addEventListener("click", () => {
                currentGroup = group.name;
                currentPage = 0;
                document.getElementById("output").innerHTML = "";
                localStorage.setItem("lastGroup", group.name);
                loadNextPage();
            });

            groupUl.appendChild(year);
        }


        sidebar.appendChild(prefixLi);
        sidebar.appendChild(groupUl);
    }

}

function loadNextPage() {
    currentPage++;
    const btn = document.getElementById("loadMoreBtn");
    btn.disabled = true;

    if (currentPage === 1) {
        document.getElementById("currentGroup").textContent = currentGroup;
    }

    fetch(`${serverUrl}/api/group/${encodeURIComponent(currentGroup)}?page=${currentPage}`)
        .then(r => r.json())
        .then(data => {
            hasMore = data.hasMore;
            appendWeeks(data.weeks);
            btn.style.display = hasMore ? "inline-block" : "none";
            btn.disabled = false;
        });
}

function appendWeeks(weeks) {

    const out = document.getElementById("output");

    const weekEntries = Object.entries(weeks)
        .sort((a, b) => Number(b[0]) - Number(a[0]))

    for (const [tt_num, week] of weekEntries) {

        // title
        const titleDiv = document.createElement("div");
        titleDiv.className = "week-title";

        const label = document.createElement("span");
        label.textContent = getWeekLabel(week.name);

        const date = document.createElement("span");
        date.textContent = formatWeekName(week.name);

        titleDiv.appendChild(label);
        titleDiv.appendChild(date);
        out.appendChild(titleDiv);

        // build structured days
        const days = buildDays(week);

        // render table
        const table = renderGrid(days);

        // append
        out.appendChild(table);

    }
}

function getWeekLabel(weekName){

    const today = new Date();
    const range = parseWeekRange(weekName);

    if(!range) return "";
    if(range.from <= today && today <= range.to) return "Šī nedēļa";

    const dayAfterToday = new Date(today);
    dayAfterToday.setDate(dayAfterToday.getDate() + 7);
    if(range.from > today && range.from <= dayAfterToday) return "Nākošā nedēļa";

    return "";
}

function renderGrid(days){
    const table = document.createElement("table");

    //HEADER
    const headerRow = document.createElement("tr");
    const corner = document.createElement("th");
    headerRow.appendChild(corner);

    for (let p = 1; p <= 10; p++) {
        const th = document.createElement('th');
        const num = document.createElement("div");
        num.textContent = p;
        const periods = isShortDay ? ShortenDay : PERIODS;

        const time = document.createElement("div");
        time.textContent = `${periods[p].from} - ${periods[p].to}`;

        th.appendChild(num);
        th.appendChild(time);

        headerRow.appendChild(th);
    }

    table.appendChild(headerRow)

    // BODY
    days.forEach(day => {
        const row = document.createElement("tr");

        const dayCell = document.createElement("th");

        dayCell.textContent = day.label;
        row.appendChild(dayCell);

        // lesson
        let p = 0;
        while (p < day.slots.length) {
            const slot = day.slots[p];
            const td = document.createElement('td');

            if (slot) {
                // how many periods does this lesson occupy?
                const span = slot.duration || 1;
                if (span > 1) td.colSpan = span;

                td.innerHTML = `
                    <div>${slot.subject || ''}</div>
                    <div>${slot.teacher || ''}</div>
                     <div>${slot.classroom || ''}</div>
                    `;
                row.appendChild(td);
                p += span;                     // skip the next (span-1) columns
            } else {
                // empty period – single blank cell
                td.className = 'empty';
                td.textContent = '—';
                row.appendChild(td);
                p += 1;
            }
        }

        table.appendChild(row);
    });
    return table;
}

// -----------------------------------------------------------------

function fetchGroups() {
    fetch(`${serverUrl}/api/groups`)
        .then(r => r.json())
        .then(groups => {
            renderSidebar(groups);

            const lastGroup = localStorage.getItem("lastGroup");
            if (lastGroup) {
                currentGroup = lastGroup;
                loadNextPage();
            } else {
                currentGroup = groups[0].name;
                loadNextPage();
            }
        });
}

document.addEventListener("DOMContentLoaded",  async () => {
    document.getElementById("loadMoreBtn").addEventListener("click", loadNextPage);

    document.getElementById("ShortDayBtn").addEventListener("click", () => {
        isShortDay = !isShortDay;
        document.getElementById("ShortDayBtn").textContent = isShortDay ? "Parastā diena" : "Saīsinātā diena";
        if (currentGroup) {
            currentPage = 0;
            document.getElementById("output").innerHTML = "";
            loadNextPage();
        }
    });

    try {
        const res = await fetch(`${serverUrl}/health`);
        if (res.ok) {
            fetchGroups();
            return;
        }
    } catch (e) {
        // server not ready
    }

    showStartupPopup();
});