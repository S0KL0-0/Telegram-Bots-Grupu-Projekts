const serverUrl = ""
let serverStatus = "unknown"; // "unknown" | "loading" | "alive" | "dead"

async function pingServer(retries = 10, interval = 5000) {
    serverStatus = "loading";
    console.log(`Starting server check`);
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i + 1}/${retries}...`);
            const res = await fetch(`${serverUrl}/health`);
            if (res.ok) {
                serverStatus = "alive";
                console.log(`Server is alive!`);
                return true;
            }
            console.warn(`Got status ${res.status}`);
        } catch (e) {
            console.warn(`Failed: ${e.message}`);
            // server not started yet or not hosted
        }
        await new Promise(r => setTimeout(r, interval));
    }
    serverStatus = "dead";
    console.error(`Server unreachable`);
    return false;
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

    fetch(`/api/group/${encodeURIComponent(currentGroup)}?page=${currentPage}`)
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
        });
}

document.addEventListener("DOMContentLoaded",  async () => {
    document.getElementById("loadMoreBtn").addEventListener("click", loadNextPage);

    const alive = await pingServer();
    if (alive) {
        fetchGroups();
    }
});