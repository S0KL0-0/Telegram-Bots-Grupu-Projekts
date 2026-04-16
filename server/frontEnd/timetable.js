console.log("Starting...");

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




const DAYS = ["Pi", "Ot", "Tr", "Ce", "Pk"];


let currentGroup = null;
let currentPage = 0;
let hasMore = false;

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

        const time = document.createElement("div");
        time.textContent = `${PERIODS[p].from} - ${PERIODS[p].to}`;

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

        //lession
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

function formatWeekName(name) {
    const month = name.split("_")[1];
    const match = name.match(/\((.+)\)/);
    const dates = match ? match[1] : "";
    return `${month} ${dates}`;
}

function appendWeeks(weeks) {


    const out = document.getElementById("output");
    out.innerHTML = ""; // clear previous

    const weekEntries = Object.entries(weeks)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .slice(-2);

    for (const [tt_num, week] of weekEntries) {
        console.log(weeks);
        // title
        const title = document.createElement("div");
        title.className = "week-title";
        title.textContent = formatWeekName(week.name);

        out.appendChild(title);

        // build structured days
        const days = buildDays(week);

        // render table
        const table = renderGrid(days);

        // append
        out.appendChild(table);
    }
}

// Load groups on init
fetch("/api/groups")
    .then(r => r.json())
    .then(groups => {
        const groupSel = document.getElementById("groupSelect");
        groupSel.innerHTML = groups.map(g =>
            `<option value="${g.name}">${g.name} </option>` // removed (${g.pages} pg) unececary cluter
        ).join("");
        onGroupChange();
    });

document.getElementById("groupSelect").addEventListener("change", onGroupChange);
document.getElementById("loadMore").addEventListener("click", loadNextPage);

function onGroupChange() {
    currentGroup = document.getElementById("groupSelect").value;
    currentPage = 0;
    document.getElementById("output").innerHTML = "";
    loadNextPage();
}

function loadNextPage() {
    currentPage++;
    const btn = document.getElementById("loadMore");
    btn.disabled = true;

    fetch(`/api/group/${encodeURIComponent(currentGroup)}?page=${currentPage}`)
        .then(r => r.json())
        .then(data => {
            hasMore = data.hasMore;
            appendWeeks(data.weeks);
            btn.style.display = hasMore ? "inline-block" : "none";
            btn.disabled = false;
        });
}

