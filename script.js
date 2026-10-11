const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const today = () => new Date().toLocaleDateString("en-CA");

const money = amount =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP"
    }).format(Number(amount) || 0);

function loadData(key, fallback) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch {
        return fallback;
    }
}

let jobs = loadData("cyclecare_jobs", [
    {
        id: "JOB-1001",
        customer: "Mika Reyes",
        phone: "09175550182",
        bike: "Mountain Bike 29er",
        issue: "Brake adjustment",
        date: today(),
        status: "In Progress",
        cost: 650
    },
    {
        id: "JOB-1002",
        customer: "Daniel Cruz",
        phone: "09204412081",
        bike: "Road Bike",
        issue: "Replace inner tube",
        date: today(),
        status: "Ready for Pickup",
        cost: 280
    },
    {
        id: "JOB-1003",
        customer: "Angela Lim",
        phone: "09987301022",
        bike: "City Bike",
        issue: "Chain cleaning",
        date: today(),
        status: "Received",
        cost: 350
    }
]);

let customers = loadData("cyclecare_customers", []);

let parts = loadData("cyclecare_parts", [
    { id: 1, name: "Inner Tube 29 inch", sku: "TUB-029", qty: 3, price: 180, min: 5 },
    { id: 2, name: "Disc Brake Pads", sku: "BRK-014", qty: 12, price: 250, min: 4 },
    { id: 3, name: "Bike Chain 8 Speed", sku: "CHN-008", qty: 2, price: 420, min: 4 },
    { id: 4, name: "Bike Lubricant", sku: "LUB-100", qty: 9, price: 150, min: 3 }
]);

function saveData() {
    localStorage.setItem("cyclecare_jobs", JSON.stringify(jobs));
    localStorage.setItem("cyclecare_customers", JSON.stringify(customers));
    localStorage.setItem("cyclecare_parts", JSON.stringify(parts));
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 2500);
}

function emptyRow(columns, message) {
    return `<tr><td colspan="${columns}" class="empty-state">${message}</td></tr>`;
}

function statusBadge(status) {
    const className = status.toLowerCase().replaceAll(" ", "-");

    return `<span class="pill ${className}">${escapeHTML(status)}</span>`;
}

function getCustomers() {
    const customerMap = new Map();

    customers.forEach(customer => {
        customerMap.set(customer.name.toLowerCase(), { ...customer });
    });

    jobs.forEach(job => {
        const key = job.customer.toLowerCase();

        if (!customerMap.has(key)) {
            customerMap.set(key, {
                name: job.customer,
                phone: job.phone || "—",
                email: "—"
            });
        }
    });

    return [...customerMap.values()];
}

// DASHBOARD
function renderDashboard() {
    $("#activeCount").textContent =
        jobs.filter(job =>
            !["Completed", "Ready for Pickup"].includes(job.status)
        ).length;

    $("#readyCount").textContent =
        jobs.filter(job => job.status === "Ready for Pickup").length;

    $("#customerCount").textContent = getCustomers().length;

    $("#lowStockCount").textContent =
        parts.filter(part => part.qty <= part.min).length;

    const recent = [...jobs].reverse().slice(0, 5);

    $("#recentJobs").innerHTML = recent.length
        ? recent.map(job => `
            <tr>
                <td>
                    <strong>${escapeHTML(job.id)}</strong>
                    <span class="subtext">${escapeHTML(job.customer)}</span>
                </td>
                <td>${escapeHTML(job.bike)}</td>
                <td>${statusBadge(job.status)}</td>
                <td>${money(job.cost)}</td>
                <td>${escapeHTML(job.issue)}</td>
            </tr>
        `).join("")
        : emptyRow(5, "No repair jobs yet.");

    const lowStock = parts.filter(part => part.qty <= part.min);

    $("#lowStockList").innerHTML = lowStock.length
        ? lowStock.map(part => `
            <div class="stock-item">
                <div>
                    <strong>${escapeHTML(part.name)}</strong>
                    <small>${escapeHTML(part.sku)}</small>
                </div>
                <span class="stock-count">${part.qty} left</span>
            </div>
        `).join("")
        : `<p class="empty-state">All parts are sufficiently stocked!</p>`;
}

// REPAIR JOBS
function renderRepairs() {
    const search = ($("#repairSearch").value || "").toLowerCase();
    const status = $("#statusFilter").value;

    const filtered = jobs.filter(job => {
        const matchesSearch = [
            job.id, job.customer, job.bike, job.issue
        ].some(value => String(value).toLowerCase().includes(search));

        return matchesSearch && (!status || job.status === status);
    });

    $("#repairsTable").innerHTML = filtered.length
        ? [...filtered].reverse().map(job => `
            <tr>
                <td><strong>${escapeHTML(job.id)}</strong></td>
                <td>
                    ${escapeHTML(job.customer)}
                    <span class="subtext">${escapeHTML(job.phone)}</span>
                </td>
                <td>
                    ${escapeHTML(job.bike)}
                    <span class="subtext">${escapeHTML(job.issue)}</span>
                </td>
                <td>${escapeHTML(job.date)}</td>
                <td>
                    <select class="action-select"
                        onchange="changeStatus('${job.id}', this.value)">
                        ${["Received", "In Progress", "Ready for Pickup", "Completed"]
                            .map(status => `
                                <option ${job.status === status ? "selected" : ""}>
                                    ${status}
                                </option>
                            `).join("")}
                    </select>
                </td>
                <td>${money(job.cost)}</td>
                <td>
                    <button class="small-btn"
                        onclick="deleteJob('${job.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("")
        : emptyRow(7, "No matching repair jobs found.");
}

function changeStatus(id, newStatus) {
    const job = jobs.find(job => job.id === id);

    if (job) {
        job.status = newStatus;
        render();
        showToast("Repair status updated!");
    }
}

function deleteJob(id) {
    if (!confirm("Delete this repair job?")) return;

    jobs = jobs.filter(job => job.id !== id);
    render();
    showToast("Repair job deleted.");
}

// CUSTOMER MANAGEMENT
function renderCustomers() {
    const search = ($("#customerSearch").value || "").toLowerCase();

    const filtered = getCustomers().filter(customer =>
        [customer.name, customer.phone, customer.email]
            .some(value => String(value || "").toLowerCase().includes(search))
    );

    $("#customersTable").innerHTML = filtered.length
        ? filtered.map(customer => {
            const count = jobs.filter(job =>
                job.customer.toLowerCase() === customer.name.toLowerCase()
            ).length;

            return `
                <tr>
                    <td><strong>${escapeHTML(customer.name)}</strong></td>
                    <td>${escapeHTML(customer.phone || "—")}</td>
                    <td>${escapeHTML(customer.email || "—")}</td>
                    <td>${count}</td>
                </tr>
            `;
        }).join("")
        : emptyRow(4, "No customers found.");
}

// PARTS INVENTORY
function renderParts() {
    const search = ($("#partSearch").value || "").toLowerCase();
    const lowOnly = $("#stockFilter").value === "low";

    const filtered = parts.filter(part => {
        const matchesSearch = [part.name, part.sku]
            .some(value => value.toLowerCase().includes(search));

        return matchesSearch && (!lowOnly || part.qty <= part.min);
    });

    $("#inventoryTable").innerHTML = filtered.length
        ? filtered.map(part => `
            <tr>
                <td><strong>${escapeHTML(part.name)}</strong></td>
                <td>${escapeHTML(part.sku)}</td>
                <td>${part.qty}</td>
                <td>${money(part.price)}</td>
                <td>
                    <span class="${part.qty <= part.min
                        ? "low-stock-label"
                        : "ok-stock-label"}">
                        ${part.qty <= part.min ? "Low Stock" : "In Stock"}
                    </span>
                </td>
                <td>
                    <button class="small-btn"
                        onclick="adjustPart(${part.id}, -1)">−</button>
                    <button class="small-btn"
                        onclick="adjustPart(${part.id}, 1)">+</button>
                    <button class="small-btn"
                        onclick="deletePart(${part.id})">Delete</button>
                </td>
            </tr>
        `).join("")
        : emptyRow(6, "No matching parts found.");
}

function adjustPart(id, amount) {
    const part = parts.find(part => part.id === id);

    if (part) {
        part.qty = Math.max(0, part.qty + amount);
        render();
        showToast("Inventory updated!");
    }
}

function deletePart(id) {
    if (!confirm("Delete this inventory item?")) return;

    parts = parts.filter(part => part.id !== id);
    render();
    showToast("Part deleted.");
}

// PAGE NAVIGATION
function navigate(view) {
    $$(".view").forEach(section => {
        section.classList.toggle("active", section.id === view + "View");
    });

    $$(".nav-link").forEach(button => {
        button.classList.toggle("active", button.dataset.view === view);
    });

    const titles = {
        dashboard: "Dashboard",
        repairs: "Repair Jobs",
        customers: "Customers",
        inventory: "Parts Inventory"
    };

    $("#pageTitle").textContent = titles[view];
    $("#sidebar").classList.remove("open");
}

$$(".nav-link").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.view));
});

$$("[data-goto]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.goto));
});

$("#menuBtn").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
});

// ADD REPAIR FORM
const backdrop = $("#modalBackdrop");
const form = $("#repairForm");

function openModal() {
    form.reset();
    form.elements.date.value = today();
    backdrop.classList.add("open");
}

function closeModal() {
    backdrop.classList.remove("open");
}

$("#newRepairBtn").addEventListener("click", openModal);
$("#newRepairBtn2").addEventListener("click", openModal);
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);

backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});

form.addEventListener("submit", event => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    const highestNumber = Math.max(
        1000,
        ...jobs.map(job => Number(job.id.split("-")[1]) || 1000)
    );

    const newJob = {
        id: "JOB-" + (highestNumber + 1),
        customer: data.customer.trim(),
        phone: data.phone.trim(),
        bike: data.bike.trim(),
        issue: data.issue.trim(),
        date: data.date,
        status: data.status,
        cost: Number(data.cost)
    };

    jobs.push(newJob);
    render();
    closeModal();
    navigate("repairs");
    showToast("Repair job saved successfully!");
});

// ADD CUSTOMER
$("#addCustomerBtn").addEventListener("click", () => {
    const name = prompt("Customer full name:");

    if (!name || !name.trim()) return;

    if (getCustomers().some(customer =>
        customer.name.toLowerCase() === name.trim().toLowerCase()
    )) {
        showToast("Customer already exists.");
        return;
    }

    const phone = prompt("Phone number:") || "—";
    const email = prompt("Email address:") || "—";

    customers.push({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim()
    });

    render();
    showToast("Customer added!");
});

// ADD PART
$("#addPartBtn").addEventListener("click", () => {
    const name = prompt("Part name:");
    if (!name || !name.trim()) return;

    const sku = prompt("SKU / part code:");
    if (!sku || !sku.trim()) return;

    const qty = Number(prompt("Starting quantity:", "1"));
    if (!Number.isFinite(qty) || qty < 0) {
        showToast("Enter a valid quantity.");
        return;
    }

    const price = Number(prompt("Unit price in PHP:", "0"));
    if (!Number.isFinite(price) || price < 0) {
        showToast("Enter a valid price.");
        return;
    }

    const min = Number(prompt("Low-stock alert level:", "3"));

    parts.push({
        id: Date.now(),
        name: name.trim(),
        sku: sku.trim(),
        qty,
        price,
        min: Number.isFinite(min) && min >= 0 ? min : 3
    });

    render();
    showToast("Part added successfully!");
});

// SEARCH AND FILTER EVENTS
$("#repairSearch").addEventListener("input", renderRepairs);
$("#statusFilter").addEventListener("change", renderRepairs);
$("#customerSearch").addEventListener("input", renderCustomers);
$("#partSearch").addEventListener("input", renderParts);
$("#stockFilter").addEventListener("change", renderParts);

// UPDATE ALL SECTIONS
function render() {
    saveData();
    renderDashboard();
    renderRepairs();
    renderCustomers();
    renderParts();
}

// INITIALIZE WEBSITE
$("#today") && (
    $("#today").textContent = new Date().toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    })
);

render();
