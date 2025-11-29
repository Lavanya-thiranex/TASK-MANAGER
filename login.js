document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const errorMsg = document.getElementById("errorMsg");

    // Check if already logged in
    const user = JSON.parse(localStorage.getItem("thiranflow_user"));
    if (user) {
        const role = (user.role || "").trim().toLowerCase();
        if (role === "admin") window.location.href = "admin.html";
        else window.location.href = "employee.html";
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const idOrEmail = document.getElementById("idOrEmail").value;
        const password = document.getElementById("password").value;

        loginBtn.disabled = true;
        loginBtn.innerText = "Logging in...";
        errorMsg.classList.add("hidden");

        const response = await callAPI("login", { idOrEmail, password });

        console.log("Login Response:", response); // Debug log

        if (response.status === "success") {
            localStorage.setItem("thiranflow_user", JSON.stringify(response.user));
            const role = (response.user.role || "").trim().toLowerCase();

            console.log("Detected Role:", role); // Debug log

            if (role === "admin") {
                // alert("Login successful! Redirecting to Admin Dashboard..."); // Optional: Uncomment for debugging
                window.location.href = "admin.html";
            } else {
                // Treat ANY other role as an Employee (Custom Roles Support)
                // alert("Login successful! Redirecting to Employee Dashboard..."); // Optional: Uncomment for debugging
                window.location.href = "employee.html";
            }
        } else {
            console.error("Login Failed:", response.message);
            errorMsg.innerText = response.message;
            errorMsg.classList.remove("hidden");
            loginBtn.disabled = false;
            loginBtn.innerText = "Login";
        }
    });
});
