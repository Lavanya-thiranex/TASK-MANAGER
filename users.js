document.addEventListener("DOMContentLoaded", async () => {
    const user = checkSession();
    if (user.role !== "Admin") {
        window.location.href = "index.html";
        return;
    }
    document.getElementById("adminName").innerText = user.name;

    await loadUsers();

    // Event Listeners for Forms
    document.getElementById("addUserForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.status = "Active";

        const res = await callAPI("addUser", { data: JSON.stringify(data) });
        if (res.status === "success") {
            alert("User added successfully!");
            hideModal("userModal");
            e.target.reset();
            loadUsers();
        } else {
            alert(res.message);
        }
    });

    document.getElementById("editUserForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const res = await callAPI("editUser", { data: JSON.stringify(data) });
        if (res.status === "success") {
            alert("User details updated successfully!");
            hideModal("editUserModal");
            loadUsers();
        } else {
            alert(res.message);
        }
    });
});

async function loadUsers() {
    const res = await callAPI("getUsers");
    if (res.status === "success") {
        renderUsers(res.users);
    } else {
        alert("Failed to load users.");
    }
}

function renderUsers(users) {
    const tbody = document.querySelector("#userTable tbody");
    tbody.innerHTML = "";
    users.forEach(u => {
        if (u.role === "Admin") return; // Don't show admin in management list or make it editable
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${u.employeeId}</td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>${renderBadge(u.status)}</td>
            <td>
                <button class="btn btn-sm" onclick='openEditModal(${JSON.stringify(u)})'>Edit</button>
                <button class="btn btn-sm ${u.status === 'Active' ? 'btn-danger' : 'btn-success'}" 
                    onclick="toggleUserStatus('${u.employeeId}', '${u.status === 'Active' ? 'Inactive' : 'Active'}')">
                    ${u.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditModal(user) {
    document.getElementById("editEmployeeId").value = user.employeeId;
    document.getElementById("editName").value = user.name;
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editMobile").value = user.mobile || "";
    document.getElementById("editPassword").value = ""; // Leave blank or require new password

    showModal("editUserModal");
}

async function toggleUserStatus(empId, newStatus) {
    if (!confirm(`Are you sure you want to set user ${empId} to ${newStatus}?`)) return;
    const res = await callAPI("toggleUserStatus", { employeeId: empId, status: newStatus });
    if (res.status === "success") loadUsers();
    else alert(res.message);
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
