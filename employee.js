document.addEventListener("DOMContentLoaded", async () => {
    const user = checkSession();
    console.log("Session User:", user); // Debug log

    if (!user) return; // checkSession handles redirect, but just in case

    const role = (user.role || "").trim().toLowerCase();
    console.log("Normalized Role:", role); // Debug log

    if (role === "admin") {
        console.warn("Admin trying to access Employee page. Redirecting to Admin Dashboard.");
        window.location.href = "admin.html";
        return;
    }
    // Allow any other role (Employee, Intern, Manager, etc.) to proceed
    document.getElementById("employeeName").innerText = user.name;

    await loadDashboard(user.employeeId);
});

async function loadDashboard(employeeId) {
    const res = await callAPI("getTasks", { role: "Employee", employeeId: employeeId });

    if (res.status === "success") {
        renderTasks(res.tasks);
        updateStats(res.tasks);
    } else {
        alert("Failed to load tasks.");
    }
}

function renderTasks(tasks) {
    const activeTbody = document.querySelector("#myTaskTable tbody");
    const closedTbody = document.querySelector("#myClosedTaskTable tbody");

    activeTbody.innerHTML = "";
    closedTbody.innerHTML = "";

    tasks.forEach(t => {
        let actionBtn = "";
        let targetTbody = activeTbody;

        if (t.status === "Closed") {
            targetTbody = closedTbody;
            actionBtn = `<span class="text-light">Closed</span>`;
        } else {
            if (t.status === "Open") {
                actionBtn = `<button class="btn btn-sm" onclick="updateStatus('${t.taskId}', 'In Progress')">Start Task</button>`;
            } else if (t.status === "In Progress") {
                actionBtn = `<button class="btn btn-sm btn-success" onclick="updateStatus('${t.taskId}', 'Completed Request')">Mark Complete</button>`;
            } else if (t.status === "Completed Request") {
                actionBtn = `<span class="text-light">Waiting Approval</span>`;
            }
        }

        let statusBadge = renderBadge(t.status);
        if (t.comment) {
            statusBadge += `<div style="font-size: 0.8rem; color: var(--danger); margin-top: 5px;"><strong>Note:</strong> ${t.comment}</div>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Task ID">${t.taskId}</td>
            <td data-label="Title">${t.title}</td>
            <td data-label="Description">${t.description}</td>
            <td data-label="Priority">${t.priority}</td>
            <td data-label="Due Date">${t.dueDate}</td>
            <td data-label="Status">${statusBadge}</td>
            <td data-label="Actions">${actionBtn}</td>
        `;
        targetTbody.appendChild(tr);
    });

    if (activeTbody.innerHTML === "") activeTbody.innerHTML = "<tr><td colspan='7' class='text-center'>No active tasks assigned.</td></tr>";
    if (closedTbody.innerHTML === "") closedTbody.innerHTML = "<tr><td colspan='7' class='text-center'>No closed tasks history.</td></tr>";
}

function updateStats(tasks) {
    document.getElementById("statMyPending").innerText = tasks.filter(t => t.status === "Open" || t.status === "In Progress").length;
    document.getElementById("statMyCompleted").innerText = tasks.filter(t => t.status === "Completed Request").length;
    document.getElementById("statMyClosed").innerText = tasks.filter(t => t.status === "Closed").length;
}

async function updateStatus(taskId, newStatus) {
    const user = checkSession();
    const res = await callAPI("updateTaskStatus", { taskId, status: newStatus, employeeId: user.employeeId });
    if (res.status === "success") {
        loadDashboard(user.employeeId);
    } else {
        alert(res.message);
    }
}
