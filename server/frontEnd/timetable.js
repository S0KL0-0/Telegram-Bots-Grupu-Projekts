console.log("Starting...");






const DAYS = ["Pi", "Ot", "Tr", "Ce", "Pk"];
const PERIODS = 10;

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

    const headerRow = document.createElement("tr");
    const corner = document.createElement("td");

    headerRow.appendChild(corner);

    for (let p = 1; p <= 10; p++) {
        const th = document.createElement('th');
        th.textContent = p;
        headerRow.appendChild(th);
    }


    return table;
}



// Load groups on init
fetch("/api/groups")
    .then(r => r.json())
    .then(groups => {
        const groupSel = document.getElementById("groupSelect");
        groupSel.innerHTML = groups.map(g =>
            `<option value="${g.name}">${g.name} (${g.pages} pg)</option>`
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

function appendWeeks(weeks) {
    const out = document.getElementById("output");
    const weekEntries = Object.entries(weeks).sort((a, b) => Number(b[0]) - Number(a[0]));

    for (const [tt_num, week] of weekEntries) {
        const title = document.createElement("div");
        title.className = "week-title";
        title.textContent = week.name;
        out.appendChild(title);

        const table = document.createElement("table");
        let thead = `<tr><th></th>`;
        for (let p = 1; p <= PERIODS; p++) thead += `<th>${p}</th>`;
        thead += `</tr>`;

        let tbody = "";
        for (let d = 0; d < 5; d++) {
            tbody += `<tr><th>${DAYS[d]}</th>`;
            let p = 1;
            while (p <= PERIODS) {
                const pos = d * 10 + p;
                const slot = week.slots[pos];
                if (slot) {
                    const span = slot.duration || 1;
                    tbody += `<td${span > 1 ? ` colspan="${span}"` : ""}><div class="cell-subject">${slot.subject || ""}</div><div class="cell-bottom"><span>${slot.classroom || ""}</span><span>${slot.teacher || ""}</span></div></td>`;
                    p += span;
                } else {
                    tbody += `<td class="empty">—</td>`;
                    p++;
                }
            }
            tbody += "</tr>";
        }

        table.innerHTML = thead + tbody;
        out.appendChild(table);
    }
}