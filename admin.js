document.addEventListener("DOMContentLoaded", async () => {
    const user = checkSession();
    const role = (user.role || "").trim().toLowerCase();
    if (role !== "admin") {
        localStorage.removeItem("thiranflow_user"); // CRITICAL FIX: Stop the loop
        window.location.href = "index.html";
        return;
    }
    document.getElementById("adminName").innerText = user.name;

    await loadDashboard();

    // Event Listeners for Forms
    document.getElementById("addTaskForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const res = await callAPI("addTask", { data: JSON.stringify(data) });
        if (res.status === "success") {
            alert("Task created successfully!");
            hideModal("taskModal");
            e.target.reset();
            loadDashboard();
        } else {
            alert(res.message);
        }
    });

    document.getElementById("rejectTaskForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const taskId = document.getElementById("rejectTaskId").value;
        const reason = document.getElementById("rejectReason").value;

        // Rejection sets status back to "In Progress" (or "Open" if preferred) with a comment
        const res = await callAPI("updateTaskStatus", { taskId, status: "In Progress", comment: reason });

        if (res.status === "success") {
            alert("Task rejected and comment added.");
            hideModal("rejectModal");
            document.getElementById("rejectTaskForm").reset();
            loadDashboard();
        } else {
            alert(res.message);
        }
    });
});

async function loadDashboard() {
    const [usersRes, tasksRes] = await Promise.all([
        callAPI("getUsers"),
        callAPI("getTasks", { role: "Admin" })
    ]);

    if (tasksRes.status === "success") renderTasks(tasksRes.tasks);

    // We still need users for the stats and the dropdown, but not for the table
    const users = usersRes.status === "success" ? usersRes.users : [];
    const tasks = tasksRes.status === "success" ? tasksRes.tasks : [];

    updateStats(users, tasks);

    // Explicitly call populate with the fetched users
    if (users.length > 0) {
        populateEmployeeSelect(users);
    } else {
        console.warn("No users fetched to populate dropdown");
    }
}

function renderTasks(tasks) {
    const activeTbody = document.querySelector("#taskTable tbody");
    const closedTbody = document.querySelector("#closedTaskTable tbody");

    activeTbody.innerHTML = "";
    closedTbody.innerHTML = "";

    tasks.forEach(t => {
        let actions = "";
        let targetTbody = activeTbody;

        if (t.status === "Closed") {
            targetTbody = closedTbody;
            actions = `<span class="text-light">Closed</span>`;
        } else {
            if (t.status === "Completed Request") {
                actions = `
                    <button class="btn btn-sm btn-success" onclick="updateTaskStatus('${t.taskId}', 'Closed')">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="openRejectModal('${t.taskId}')">Reject</button>
                `;
            } else {
                actions = `<span class="text-light">In Progress</span>`;
            }
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${t.taskId}</td>
            <td>${t.title}</td>
            <td>${t.assignedTo}</td>
            <td>${t.priority}</td>
            <td>${t.dueDate}</td>
            <td>${renderBadge(t.status)}</td>
            <td>${actions}</td>
        `;
        targetTbody.appendChild(tr);
    });

    if (activeTbody.innerHTML === "") activeTbody.innerHTML = "<tr><td colspan='7' class='text-center'>No active tasks.</td></tr>";
    if (closedTbody.innerHTML === "") closedTbody.innerHTML = "<tr><td colspan='7' class='text-center'>No closed tasks.</td></tr>";
}

function updateStats(users, tasks) {
    document.getElementById("statTotalUsers").innerText = users.length;
    document.getElementById("statTotalTasks").innerText = tasks.length;
    document.getElementById("statPendingTasks").innerText = tasks.filter(t => t.status === "Open" || t.status === "In Progress").length;
    document.getElementById("statCompletedRequests").innerText = tasks.filter(t => t.status === "Completed Request").length;
    document.getElementById("statClosedTasks").innerText = tasks.filter(t => t.status === "Closed").length;
}

function populateEmployeeSelect(users) {
    const select = document.getElementById("employeeSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Select Employee</option>';

    // Filter out Admins only, show everyone else so we can see what's going on
    const potentialEmployees = users.filter(u => (u.role || "").toString().toLowerCase() !== "admin");

    if (potentialEmployees.length === 0) {
        const option = document.createElement("option");
        option.text = "No employees found (Only Admins?)";
        select.add(option);
        return;
    }

    potentialEmployees.forEach(u => {
        const option = document.createElement("option");
        option.value = u.employeeId;

        const status = (u.status || "Unknown").toString();
        let label = `${u.name} (${u.employeeId})`;

        if (status.toLowerCase() !== "active") {
            label += ` [${status}]`; // Show status if not active
        }

        option.innerText = label;
        select.appendChild(option);
    });
}

async function updateTaskStatus(taskId, newStatus) {
    const res = await callAPI("updateTaskStatus", { taskId, status: newStatus });
    if (res.status === "success") loadDashboard();
    else alert(res.message);
}

function openRejectModal(taskId) {
    document.getElementById("rejectTaskId").value = taskId;
    showModal("rejectModal");
}

// Modal Helpers
function showModal(id) {
    document.getElementById(id).classList.remove("hidden");
    document.getElementById(id).style.display = "flex";
}

function hideModal(id) {
    document.getElementById(id).classList.add("hidden");
    document.getElementById(id).style.display = "none";
}
