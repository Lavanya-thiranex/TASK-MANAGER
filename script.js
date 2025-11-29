/**
 * ThiranFlow Main Script
 * Handles API communication, UI updates, and shared logic.
 */

// REPLACE THIS URL WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
const API_URL = "https://script.google.com/macros/s/AKfycbzRrJdxoz6NfR20AL_xvdc-Z3I3vGu6ZSGj0Ja93lHP_MnbENvITgKJZBYeu8dTG33VsA/exec";

// --- Mock Backend for Demo Purposes (runs if API_URL is empty) ---
const MOCK_DATA = {
    users: [
        { employeeId: "admin", name: "System Admin", email: "admin@thiranex.com", mobile: "0000000000", password: "admin", role: "Admin", status: "Active" },
        { employeeId: "emp001", name: "John Doe", email: "john@thiranex.com", mobile: "9876543210", password: "emp", role: "Employee", status: "Active" }
    ],
    tasks: [
        { taskId: "Task 001", title: "Design Homepage", description: "Create the main landing page design.", assignedTo: "emp001", priority: "High", startDate: "2023-10-01", dueDate: "2023-10-05", status: "Open" },
        { taskId: "Task 002", title: "Database Setup", description: "Setup Google Sheets backend.", assignedTo: "emp001", priority: "Medium", startDate: "2023-10-02", dueDate: "2023-10-06", status: "In Progress" }
    ]
};

class MockBackend {
    static async handleRequest(action, params) {
        console.log(`[MockBackend] Action: ${action}`, params);
        await new Promise(r => setTimeout(r, 500)); // Simulate network delay

        if (action === "login") {
            const idInput = params.idOrEmail.toLowerCase();
            const user = MOCK_DATA.users.find(u => (u.employeeId.toLowerCase() === idInput || u.email.toLowerCase() === idInput) && u.password === params.password);
            if (user) {
                if (user.status !== "Active") return { status: "error", message: "Account is inactive." };
                return { status: "success", user: { employeeId: user.employeeId, name: user.name, email: user.email, role: user.role } };
            }
            return { status: "error", message: "Invalid credentials. (Try admin/admin or emp001/emp)" };
        }

        if (action === "getUsers") {
            return { status: "success", users: MOCK_DATA.users };
        }

        if (action === "addUser") {
            const newUser = JSON.parse(params.data);
            if (MOCK_DATA.users.find(u => u.employeeId === newUser.employeeId || u.email === newUser.email)) {
                return { status: "error", message: "User already exists." };
            }
            MOCK_DATA.users.push(newUser);
            return { status: "success", message: "User added." };
        }

        if (action === "toggleUserStatus") {
            const user = MOCK_DATA.users.find(u => u.employeeId === params.employeeId);
            if (user) {
                user.status = params.status;
                return { status: "success", message: "Status updated." };
            }
            return { status: "error", message: "User not found." };
        }

        if (action === "getTasks") {
            let tasks = MOCK_DATA.tasks;
            if (params.role === "Employee") {
                tasks = tasks.filter(t => t.assignedTo === params.employeeId);
            }
            return { status: "success", tasks: tasks };
        }

        if (action === "addTask") {
            const newTask = JSON.parse(params.data);

            let nextId = 1;
            if (MOCK_DATA.tasks.length > 0) {
                const lastTask = MOCK_DATA.tasks[MOCK_DATA.tasks.length - 1];
                const match = lastTask.taskId.match(/Task (\d+)/);
                if (match) nextId = parseInt(match[1]) + 1;
            }
            newTask.taskId = "Task " + String(nextId).padStart(3, '0');

            newTask.status = "Open";
            MOCK_DATA.tasks.push(newTask);
            return { status: "success", message: "Task created." };
        }

        if (action === "updateTaskStatus") {
            const task = MOCK_DATA.tasks.find(t => t.taskId === params.taskId);
            if (task) {
                task.status = params.status;
                return { status: "success", message: "Task updated." };
            }
            return { status: "error", message: "Task not found." };
        }

        return { status: "error", message: "Unknown action" };
    }
}

// --- API Handler ---

async function callAPI(action, params = {}) {
    if (!API_URL) {
        console.warn("API_URL is not set. Using Mock Backend.");
        return MockBackend.handleRequest(action, params);
    }

    const url = new URL(API_URL);
    url.searchParams.append("action", action);
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }

    try {
        const response = await fetch(url);
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Invalid JSON response:", text);
            return { status: "error", message: "Server returned invalid data. Check console for details." };
        }
    } catch (error) {
        console.error("API Error:", error);
        return { status: "error", message: "Network error. Check console." };
    }
}

// --- Session Management ---

function checkSession() {
    const user = JSON.parse(localStorage.getItem("thiranflow_user"));
    if (!user) {
        window.location.href = "index.html";
        return null;
    }
    return user;
}

function logout() {
    localStorage.removeItem("thiranflow_user");
    window.location.href = "index.html";
}

// --- UI Helpers ---

function showLoading(elementId, show = true) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = show ? "block" : "none";
}

function showAlert(message, type = "info") {
    alert(message); // Simple alert for now, can be upgraded to a toast
}

function renderBadge(status) {
    let cls = "badge-open";
    if (status === "In Progress") cls = "badge-progress";
    if (status === "Completed Request") cls = "badge-completed";
    if (status === "Closed") cls = "badge-closed";
    if (status === "Active") cls = "badge-active";
    if (status === "Inactive") cls = "badge-inactive";
    return `<span class="badge ${cls}">${status}</span>`;
}
