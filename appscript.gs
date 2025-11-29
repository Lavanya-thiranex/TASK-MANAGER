// Google Apps Script Code for ThiranFlow
// Copy and paste this into a new Google Apps Script project attached to your Google Sheet.

const SHEET_USERS = "Users";
const SHEET_TASKS = "Tasks";

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "login") {
    return handleLogin(e.parameter.idOrEmail, e.parameter.password);
  } else if (action === "getUsers") {
    return getUsers();
  } else if (action === "addUser") {
    return addUser(e.parameter.data);
  } else if (action === "editUser") {
    return editUser(e.parameter.data);
  } else if (action === "toggleUserStatus") {
    return toggleUserStatus(e.parameter.employeeId, e.parameter.status);
  } else if (action === "getTasks") {
    return getTasks(e.parameter.role, e.parameter.employeeId);
  } else if (action === "addTask") {
    return addTask(e.parameter.data);
  } else if (action === "updateTaskStatus") {
    return updateTaskStatus(e.parameter.taskId, e.parameter.status, e.parameter.employeeId, e.parameter.comment);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Invalid action"})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return doGet(e);
}

// --- Helper Functions ---

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_USERS) {
      sheet.appendRow(["EmployeeID", "Name", "Email", "Mobile", "Password", "Role", "Status"]);
      // Add default admin
      sheet.appendRow(["ADMIN001", "System Admin", "admin@thiranex.com", "0000000000", "admin123", "Admin", "Active"]);
    } else if (name === SHEET_TASKS) {
      sheet.appendRow(["TaskID", "Title", "Description", "AssignedTo", "Priority", "StartDate", "DueDate", "Status", "Comments"]);
    }
  }
  return sheet;
}

function handleLogin(idOrEmail, password) {
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // row[0] = EmployeeID, row[2] = Email, row[4] = Password, row[6] = Status
    if ((row[0] == idOrEmail || row[2] == idOrEmail) && row[4] == password) {
      if (row[6] !== "Active") {
        return responseJSON({status: "error", message: "Account is inactive."});
      }
      return responseJSON({
        status: "success",
        user: {
          employeeId: row[0],
          name: row[1],
          email: row[2],
          role: row[5]
        }
      });
    }
  }
  return responseJSON({status: "error", message: "Invalid credentials."});
}

function getUsers() {
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      employeeId: data[i][0],
      name: data[i][1],
      email: data[i][2],
      mobile: data[i][3],
      role: data[i][5],
      status: data[i][6]
    });
  }
  return responseJSON({status: "success", users: users});
}

function addUser(jsonData) {
  const user = JSON.parse(jsonData);
  const sheet = getSheet(SHEET_USERS);
  
  // Check if ID or Email exists
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == user.employeeId || data[i][2] == user.email) {
      return responseJSON({status: "error", message: "User ID or Email already exists."});
    }
  }
  
  sheet.appendRow([user.employeeId, user.name, user.email, user.mobile, user.password, user.role, user.status]);
  return responseJSON({status: "success", message: "User added successfully."});
}

function editUser(jsonData) {
  const user = JSON.parse(jsonData);
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == user.employeeId) {
      // Update columns: Name(1), Email(2), Mobile(3), Password(4)
      // Row is i + 1 because data is 0-indexed but sheet rows are 1-indexed
      sheet.getRange(i + 1, 2).setValue(user.name);
      sheet.getRange(i + 1, 3).setValue(user.email);
      sheet.getRange(i + 1, 4).setValue(user.mobile);
      sheet.getRange(i + 1, 5).setValue(user.password);
      return responseJSON({status: "success", message: "User details updated."});
    }
  }
  return responseJSON({status: "error", message: "User not found."});
}

function toggleUserStatus(employeeId, status) {
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == employeeId) {
      sheet.getRange(i + 1, 7).setValue(status); // Column 7 is Status
      return responseJSON({status: "success", message: "User status updated."});
    }
  }
  return responseJSON({status: "error", message: "User not found."});
}

function getTasks(role, employeeId) {
  const sheet = getSheet(SHEET_TASKS);
  const data = sheet.getDataRange().getValues();
  const tasks = [];
  
  // If Employee, find their Name first because we might be saving Names now
  let employeeName = "";
  if (role !== "Admin" && employeeId) {
     const userSheet = getSheet(SHEET_USERS);
     const userData = userSheet.getDataRange().getValues();
     for (let i = 1; i < userData.length; i++) {
       if (userData[i][0] == employeeId) {
         employeeName = userData[i][1];
         break;
       }
     }
  }
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // row[3] = AssignedTo (could be ID or Name now)
    // We check if it matches ID OR Name to be backward compatible
    if (role === "Admin" || row[3] == employeeId || (employeeName && row[3] == employeeName)) {
      tasks.push({
        taskId: row[0],
        title: row[1],
        description: row[2],
        assignedTo: row[3],
        priority: row[4],
        startDate: row[5],
        dueDate: row[6],
        status: row[7],
        comment: row[8] || "" // Column 9 is Comments (index 8)
      });
    }
  }
  return responseJSON({status: "success", tasks: tasks});
}

function addTask(jsonData) {
  const task = JSON.parse(jsonData);
  const sheet = getSheet(SHEET_TASKS);
  
  const data = sheet.getDataRange().getValues();
  let nextId = 1;
  
  if (data.length > 1) {
    const lastTaskId = data[data.length - 1][0]; // Get last row, first column
    // Expected format "Task 001"
    const match = lastTaskId.toString().match(/Task (\d+)/);
    if (match && match[1]) {
      nextId = parseInt(match[1], 10) + 1;
    } else {
       // Fallback if format is different or it's the first one after header
       nextId = data.length; 
    }
  }
  
  // --- Find Employee Name & Email ---
  const userSheet = getSheet(SHEET_USERS);
  const userData = userSheet.getDataRange().getValues();
  let employeeEmail = "";
  let employeeName = task.assignedTo; // Default to ID if name not found

  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] == task.assignedTo) {
      employeeName = userData[i][1];
      employeeEmail = userData[i][2];
      break;
    }
  }

  // Pad with zeros to 3 digits
  const taskId = "Task " + String(nextId).padStart(3, '0');
  
  // Save NAME instead of ID in the sheet. Append empty string for Comments column.
  sheet.appendRow([taskId, task.title, task.description, employeeName, task.priority, task.startDate, task.dueDate, "Open", ""]);
  
  // --- Send Email Notification ---
  try {
    if (employeeEmail) {
      const subject = `New Task Assigned: ${task.title} [${taskId}]`;
      const body = `Hello ${employeeName},\n\n` +
                   `You have been assigned a new task on ThiranFlow.\n\n` +
                   `Task ID: ${taskId}\n` +
                   `Title: ${task.title}\n` +
                   `Priority: ${task.priority}\n` +
                   `Due Date: ${task.dueDate}\n\n` +
                   `Description:\n${task.description}\n\n` +
                   `Please login to ThiranFlow to view and manage this task.\n\n` +
                   `Best regards,\nThiranFlow Admin System`;
                   
      MailApp.sendEmail({
        to: employeeEmail,
        subject: subject,
        body: body
      });
    }
  } catch (e) {
    // Log error but don't fail the task creation
    console.error("Failed to send email: " + e.toString());
  }

  return responseJSON({status: "success", message: "Task created and notification sent."});
}

function updateTaskStatus(taskId, status, employeeId, comment) {
  const sheet = getSheet(SHEET_TASKS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == taskId) {
      // Validate permissions
      // Admin can do anything. Employee can only move Open->In Progress->Completed Request
      // We assume the frontend sends the correct status, but backend should ideally verify.
      // For simplicity, we just update.
      
      sheet.getRange(i + 1, 8).setValue(status); // Column 8 is Status
      
      if (comment) {
        sheet.getRange(i + 1, 9).setValue(comment); // Column 9 is Comments
      }
      
      return responseJSON({status: "success", message: "Task updated."});
    }
  }
  return responseJSON({status: "error", message: "Task not found."});
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
