const resourceNames = ["Sriram PR", "Yaswanth", "Sibhi S", "Kaushik"];
let currentTimesheetPage = 1; // Current page for timesheet entries
let currentProjectPage = 1;
const perPageProjects = 10;
let currentProjectFilters = {};


//timesheet pagination Code
//let currentTimesheetPage = 1; // Current page for timesheet entries

//let currentTimesheetPage = 1; // Default to page 1
//for add product issue modal
document.getElementById('add-product-issue').addEventListener('click', () => {
    document.getElementById('product-issue-modal').classList.remove('hidden');
});

document.getElementById('close-product-issue-modal').addEventListener('click', () => {
    document.getElementById('product-issue-modal').classList.add('hidden');
});

document.getElementById('import-product-issues').addEventListener('click', () => {
    document.getElementById('import-product-issues-modal').classList.remove('hidden');
});
const importForm = document.getElementById('import-product-issues-form');
document.getElementById('close-import-product-issue-modal').addEventListener('click', () => {
    document.getElementById('import-product-issues-modal').classList.add('hidden');
});
document.getElementById('apply-product-filters').addEventListener('click', async () => {
    const issueType = document.getElementById('filter-issue-type').value;
    const raisedOn = document.getElementById('filter-raised-on').value;
    const currentStatus = document.getElementById('filter-current-status').value;

    const queryParams = new URLSearchParams({
        issue_type: issueType,
        raised_on: raisedOn,
        current_status: currentStatus,
    });

    const response = await fetch(`/filter_product_issues?${queryParams}`);
    const data = await response.json();

    displayProductIssues(data);
});

// Reset Filters
document.getElementById('reset-product-filters').addEventListener('click', () => {
    document.getElementById('filter-issue-type').value = '';
    document.getElementById('filter-raised-on').value = '';
    document.getElementById('filter-current-status').value = '';

    fetchProductIssues(); // Load all issues without filters
    loadProductIssueSummary(); //load summary
});

//function for handling action menu threedots for edit and delete product Issues
function setupProductIssueActions(row) {
    const menuButton = row.querySelector('.three-dots');
    const menuOptions = row.querySelector('.menu-options');

    // Toggle the menu visibility
    menuButton.addEventListener('click', (event) => {
        event.stopPropagation();  // Prevent closing when clicking inside the menu
        menuOptions.classList.toggle('hidden');

        // Close the menu if clicked outside
        document.addEventListener('click', (e) => {
            if (!menuOptions.contains(e.target) && e.target !== menuButton) {
                menuOptions.classList.add('hidden');
            }
        });
    });

    // Edit Issue Action
    row.querySelector('.edit-issue').addEventListener('click', () => {
        handleEditProductIssue(row);
    });

    // Delete Issue Action
    row.querySelector('.delete-issue').addEventListener('click', () => {
        const issueId = row.dataset.issueId;
        handleDeleteProductIssue(issueId);
    });
}


// Fetch timesheet entries and update the pagination links
async function fetchTimesheetEntries(page = 1) {
    try {
        console.log(`Fetching data for page: ${page}`); // Debug log
        const response = await fetch(`/get_all?page=${page}&per_page=10`);
        const data = await response.json();

        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        // Populate the table
        data.entries.forEach(entry => {
          if (!entry.id) {
              console.error('Missing ID for entry:', entry); // Log error for missing IDs
          }
          const row = document.createElement('tr');
          row.dataset.entryId = entry.id || 'N/A'; // Use "N/A" if ID is missing
          row.innerHTML = `
              <td>${entry.id || 'N/A'}</td> <!-- Safeguard against undefined -->
              <td contenteditable="false" data-field="Project Name">${entry['Project Name']}</td>
              <td contenteditable="false" data-field="Task Type">${entry['Task Type']}</td>
              <td contenteditable="false" data-field="Task Name">${entry['Task Name']}</td>
              <td contenteditable="false" data-field="Resource Name">${entry['Resource Name']}</td>
              <td contenteditable="false" data-field="Hours Worked">${entry['Hours Worked']}</td>
              <td contenteditable="false" data-field="Date">${new Date(entry['Date']).toISOString().split('T')[0]}</td>
              <td class="actions-cell">
                <div class="actions-wrapper">
                  <button class="action-btn three-dots">⋮</button>
                  <div class="menu-options hidden">
                    <button class="edit-entry">Edit</button>
                    <button class="delete-entry">Delete</button>
                    <button class="clone-entry">Clone</button>
                  </div>
                </div>
              </td>
          `;
            tableBody.appendChild(row);
            // Add event listeners for Edit and Delete actions
            setupActions(row);
        });

        // Update pagination links
        const pageLinksContainer = document.getElementById('page-numbers');
        pageLinksContainer.innerHTML = ''; // Clear existing links

        // Display only 10 pages at a time
        const totalPages = data.total_pages;
        const currentPage = data.current_page;
        const startPage = Math.max(1, currentPage - 4); // Show 5 pages before the current page
        const endPage = Math.min(totalPages, currentPage + 5); // Show 5 pages after the current page

        for (let i = startPage; i <= endPage; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = i;
            pageLink.classList.add('page-link');
            if (i === currentPage) {
                pageLink.classList.add('active'); // Highlight current page
            }
            pageLink.addEventListener('click', (event) => {
                event.preventDefault();
                fetchTimesheetEntries(i); // Fetch data for the selected page
            });
            pageLinksContainer.appendChild(pageLink);
        }

        // Enable/Disable Previous and Next buttons
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage === totalPages;

        // Enable/Disable Jump to First and Jump to Last buttons
        document.getElementById('jump-to-first').classList.toggle('disabled', currentPage === 1);
        document.getElementById('jump-to-last').classList.toggle('disabled', currentPage === totalPages);

        // Update current page
        currentTimesheetPage = currentPage;
    } catch (error) {
        console.error('Error fetching timesheet entries:', error);
    }
}


// Add event listeners for pagination buttons
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentTimesheetPage > 1) {
            fetchTimesheetEntries(currentTimesheetPage - 1);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        fetchTimesheetEntries(currentTimesheetPage + 1);
    });

    // Fetch the first page of timesheet entries
    fetchTimesheetEntries();
});


// On page load, fetch the first page of timesheet entries
document.addEventListener('DOMContentLoaded', () => {
    fetchTimesheetEntries();

    // Jump to the first page
    document.getElementById('jump-to-first').addEventListener('click', (event) => {
        event.preventDefault();
        fetchTimesheetEntries(1); // Navigate to page 1
    });

    // Jump to the last page
    document.getElementById('jump-to-last').addEventListener('click', async (event) => {
        event.preventDefault();

        try {
            const response = await fetch('/get_all?page=1&per_page=10');
            const data = await response.json();
            fetchTimesheetEntries(data.total_pages); // Navigate to the last page
        } catch (error) {
            console.error('Error fetching the last page:', error);
        }
    });

    // Event listeners for Next and Previous buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentTimesheetPage > 1) {
            fetchTimesheetEntries(currentTimesheetPage - 1);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        fetchTimesheetEntries(currentTimesheetPage + 1);
    });
});


// for applying filters in timehseet page
document.getElementById('apply-filters').addEventListener('click', async () => {
    const projectName = document.getElementById('filter-project-name').value;
    const resourceName = document.getElementById('filter-resource-name').value;
    const taskType = document.getElementById('filter-task-type').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;

    const queryParams = new URLSearchParams({
        project_name: projectName,
        resource_name: resourceName,
        task_type: taskType,
        start_date: startDate,
        end_date: endDate
    });

    try {
        const response = await fetch(`/filter_timesheet?${queryParams.toString()}`);
        const data = await response.json();

        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        data.forEach(entry => {
          if (!entry.id) {
              console.error('Missing ID for entry:', entry); // Log error for missing IDs
          }
          const row = document.createElement('tr');
          row.dataset.entryId = entry.id || 'N/A'; // Use "N/A" if ID is missing
          row.innerHTML = `
              <td>${entry.id || 'N/A'}</td> <!-- Safeguard against undefined -->
              <td contenteditable="false" data-field="Project Name">${entry['Project Name']}</td>
              <td contenteditable="false" data-field="Task Type">${entry['Task Type']}</td>
              <td contenteditable="false" data-field="Task Name">${entry['Task Name']}</td>
              <td contenteditable="false" data-field="Resource Name">${entry['Resource Name']}</td>
              <td contenteditable="false" data-field="Hours Worked">${entry['Hours Worked']}</td>
              <td contenteditable="false" data-field="Date">${new Date(entry['Date']).toISOString().split('T')[0]}</td>
              <td>
                  <div class="action-menu">
                      <button class="three-dots">⋮</button>
                      <div class="menu-options hidden">
                          <button class="edit-entry">Edit</button>
                          <button class="delete-entry">Delete</button>
                          <button class="clone-entry">Clone</button>
                      </div>
                  </div>
              </td>
          `;
            tableBody.appendChild(row);
            // Add event listeners for Edit and Delete actions
            setupActions(row);
        });
    } catch (error) {
        console.error('Error applying filters:', error);
    }
});

// logic for reset filter button
document.getElementById('reset-filters').addEventListener('click', () => {
    // Reset filter dropdowns to their default state
    document.getElementById('filter-project-name').value = '';
    document.getElementById('filter-resource-name').value = '';
    document.getElementById('filter-task-type').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';

    // Reload the unfiltered data
    fetchTimesheetEntries();
});
// Fetch and Populate Quarters in the Filter Dropdown
async function fetchQuarters() {
    try {
        const response = await fetch('/get_quarters');
        const data = await response.json();
        const quarterFilter = document.getElementById('quarter-filter');

        // Populate the dropdown
        quarterFilter.innerHTML = '<option value="all" selected>All Quarters</option>'; // Reset dropdown
        data.forEach(quarter => {
            const option = document.createElement('option');
            option.value = quarter;
            option.textContent = quarter;
            quarterFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching quarters:', error);
    }
}

// Fetch and populate Timesheet entries fetchENtries func is not being used
//async function fetchEntries() {
  //  const response = await fetch('/get_all');
  //  const data = await response.json();
  //  console.log(data); // Debug log to verify response structure
//
  //  const tableBody = document.getElementById('table-body');

    // Clear existing rows
    //tableBody.innerHTML = '';

    // Populate rows
    //data.forEach(entry => {
      //  if (!entry.id) {
        //    console.error('Missing ID for entry:', entry); // Log error for missing IDs
        //}
        //const row = document.createElement('tr');
        //row.dataset.entryId = entry.id || 'N/A'; // Use "N/A" if ID is missing
        //row.innerHTML = `
          //  <td>${entry.id || 'N/A'}</td> <!-- Safeguard against undefined -->
            //<td contenteditable="false" data-field="Project Name">${entry['Project Name']}</td>
            //<td contenteditable="false" data-field="Task Type">${entry['Task Type']}</td>
            //<td contenteditable="false" data-field="Task Name">${entry['Task Name']}</td>
            //<td contenteditable="false" data-field="Resource Name">${entry['Resource Name']}</td>
            //<td contenteditable="false" data-field="Hours Worked">${entry['Hours Worked']}</td>
            //<td contenteditable="false" data-field="Date">${new Date(entry['Date']).toISOString().split('T')[0]}</td>
            //<td>
              //  <div class="action-menu">
                //    <button class="three-dots">⋮</button>
                  //  <div class="menu-options hidden">
                    //    <button class="edit-entry">Edit</button>
                      //  <button class="delete-entry">Delete</button>
                    //</div>
                //</div>
            //</td>
        //`;
        //tableBody.appendChild(row);

        // Add event listeners for Edit and Delete actions
        //setupActions(row);
    //});
//}

// Add functionality for Edit and Delete actions
function setupActions(row) {
    const menuButton = row.querySelector('.three-dots');
    const menuOptions = row.querySelector('.menu-options');

    // Hide other open menus when clicking a new one
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling to document
        document.querySelectorAll('.menu-options').forEach(menu => {
            if (menu !== menuOptions) {
                menu.classList.add('hidden');
            }
        });
        menuOptions.classList.toggle('hidden');
    });

    // Close menu when clicking anywhere outside
    document.addEventListener('click', () => {
        menuOptions.classList.add('hidden');
    });

    // Prevent menu from closing when clicking inside the menu
    menuOptions.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Edit Action
    row.querySelector('.edit-entry').addEventListener('click', () => {
        handleEditRow(row);
        menuOptions.classList.add('hidden');
    });

    // Delete Action
    row.querySelector('.delete-entry').addEventListener('click', () => {
        const entryId = row.dataset.entryId;
        handleDeleteRow(entryId);
        menuOptions.classList.add('hidden');
    });

    // Clone Action
    row.querySelector('.clone-entry').addEventListener('click', () => {
        handleCloneRow(row);
        menuOptions.classList.add('hidden');
    });
}


// Handle Edit Row
function handleEditRow(row) {
    const entryId = row.dataset.entryId; // Retrieve the entry ID from the row

    if (!entryId) {
        alert('Error: Entry ID not found!');
        return;
    }

    const editButton = row.querySelector('.edit-entry');
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.classList.add('save-entry');

    editButton.replaceWith(saveButton);

    // Make fields editable
    row.querySelectorAll('td[contenteditable]').forEach(td => {
    if (td.dataset.field === 'Resource Name') {
        // Replace Resource Name cell with a dropdown
        const currentValue = td.textContent.trim();
        const select = document.createElement('select');
        resourceNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (name === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        td.textContent = ''; // Clear existing content
        td.appendChild(select);
    } else {
        td.contentEditable = 'true';
    }
});

    // Save updated entry
    saveButton.addEventListener('click', async () => {
      const updatedEntry = { id: parseInt(entryId, 10) }; // Include the entry ID
      row.querySelectorAll('td').forEach(td => {
          if (td.dataset.field === 'Resource Name') {
              // Get value from dropdown
              const select = td.querySelector('select');
              updatedEntry[td.dataset.field] = select ? select.value : td.textContent.trim();
          } else {
              updatedEntry[td.dataset.field] = td.textContent.trim();
          }
      });

      console.log('Updating Entry:', updatedEntry); // Debug log

      const response = await fetch('/update_entry', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEntry)
      });

      if (response.ok) {
          alert('Entry updated successfully!');
          fetchTimesheetEntries(); // Refresh the table
      } else {
          alert('Error updating entry!');
      }
  });
}

// Handle Delete Row
function handleDeleteRow(entryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        fetch(`/delete_entry/${entryId}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Entry deleted successfully!');
                    fetchTimesheetEntries(); // Refresh the table
                } else {
                    alert('Error deleting entry!');
                }
            });
    }
}

// Handle clone Row
function handleCloneRow(row) {
    // Open the Add Entry Modal
    const modal = document.getElementById('entry-modal');
    modal.classList.remove('hidden');

    // Extract existing row data
    const projectName = row.querySelector('td[data-field="Project Name"]').textContent.trim();
    const taskType = row.querySelector('td[data-field="Task Type"]').textContent.trim();
    const taskName = row.querySelector('td[data-field="Task Name"]').textContent.trim();
    const resourceName = row.querySelector('td[data-field="Resource Name"]').textContent.trim();
    const hoursWorked = row.querySelector('td[data-field="Hours Worked"]').textContent.trim();
    const date = row.querySelector('td[data-field="Date"]').textContent.trim();

    // Populate modal fields with the existing values
    document.getElementById('project-name').value = projectName;
    document.getElementById('task-type').value = taskType;
    document.getElementById('task-name').value = taskName;
    document.getElementById('resource-name').value = resourceName;
    document.getElementById('hours-worked').value = hoursWorked;
    document.getElementById('date').value = date;

    console.log('Cloning entry with values:', { projectName, taskType, taskName, resourceName, hoursWorked, date });
}


// for populating dropdown values in bandwidth utilization report, fetchrreport()
async function fetchResourceQuarters() {
    try {
        const response = await fetch('/get_resource_hours_quarters');
        const data = await response.json();
        const quarterFilter = document.getElementById('resource-quarter-filter');

        // Populate the dropdown
        data.forEach(quarter => {
            const option = document.createElement('option');
            option.value = quarter;
            option.textContent = quarter;
            quarterFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching resource quarters:', error);
    }
}

// code for populating data based on filter option selected in bandwidth report, fetchreport()
document.getElementById('resource-quarter-filter').addEventListener('change', (event) => {
    const selectedQuarter = event.target.value;
    fetchReport(1,10,selectedQuarter); // Fetch data for the selected quarter
});

//on page load populating right set of values in filter dropdown for bandwidth report, fetchreport()
document.addEventListener('DOMContentLoaded', () => {
    fetchResourceQuarters(); // Populate the resource-specific quarters dropdown
  //  fetchResourceHours(); // Load all resource hours data by default
    fetchProjectReport();
});


// Fetch and populate Resource-based Reports data
async function fetchReport(page = 1, perPage = 10,selectedQuarter = 'all') {
    const response = await fetch(`/get_report?page=${page}&per_page=${perPage}&quarter=${selectedQuarter}`);
    const data = await response.json();
    const reportsBody = document.getElementById('reports-body');

    // Clear existing rows
    reportsBody.innerHTML = '';

    // Populate rows with Resource Name, Total Hours, and Quarter
    data.entries.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${report['Resource Name']}</td>
            <td>${report['Total Hours']}</td>
            <td>${report['Quarter']}</td>
        `;
        reportsBody.appendChild(row);
    });

    renderPagination('resource-report-pagination', data.current_page, data.total_pages, (newPage) => fetchReport(newPage, perPage, quarter));

    // Fetch project-based report
    //fetchProjectReport();
}
//filter projects
document.getElementById("apply-project-filters").addEventListener("click", () => {
    const params = new URLSearchParams({
        start_date: document.getElementById("filter-start-date").value,
        end_date: document.getElementById("filter-end-date").value,
        region: document.getElementById("filter-region").value,
        project_started: document.getElementById("filter-started").value,
        project_completed: document.getElementById("filter-completed").value,
    });

    fetch(`/filter_projects?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        const projects = data.projects;
        const tbody = document.getElementById("projects-table-body");
        tbody.innerHTML = "";

        projects.forEach(proj => {
          const row = document.createElement("tr");
          row.dataset.entryId = projects.id;
          row.innerHTML = `
            <td>${proj["Customer Name"]}</td>
            <td>${proj["Implementation Cost"]}</td>
            <td>${proj["Order Form"] ? `<a href="${proj["Order Form"]}" target="_blank">Order Form</a>` : ''}</td>
            <td>${proj["Scope of Work"] ? `<a href="${proj["Scope of Work"]}" target="_blank">Scope of Work</a>` : ''}</td>
            <td>${proj["Sales Name"]}</td>
            <td>${proj["Solution Engineer Name"]}</td>
            <td>${proj["Start Date"]}</td>
            <td>${proj["Expected Close Date"] || ''}</td>
            <td>${proj["Status"] || ''}</td>
            <td>${proj["Region"] || ''}</td>
            <td>${proj["Project Started"]}</td>
            <td>${proj["Project Completed"]}</td>
            <td>
              <button class="edit-project">Edit</button>
              <button class="delete-project">Delete</button>
            </td>
          `;
          tbody.appendChild(row);

          // Attach edit and delete event listeners
          row.querySelector('.edit-project').addEventListener('click', () => handleEditProjectRow(row));
          row.querySelector('.delete-project').addEventListener('click', () => handleDeleteProjectRow(entry.id));

          // 🔁 If you use event delegation, you’re done
          // Otherwise, add event listeners here for edit/delete
        });
      });

});

document.getElementById("reset-project-filters").addEventListener("click", () => {
    document.getElementById("filter-start-date").value = "";
    document.getElementById("filter-end-date").value = "";
    document.getElementById("filter-region").value = "";
    document.getElementById("filter-started").value = "";
    document.getElementById("filter-completed").value = "";

    currentProjectFilters = {};
    currentProjectPage = 1;
    fetchProjects(currentProjectPage, currentProjectFilters);
});


    // Trigger reload if needed
    document.getElementById("apply-project-filters").addEventListener("click", () => {
        currentProjectFilters = getProjectFilters();
        currentProjectPage = 1;
        fetchProjects(currentProjectPage, currentProjectFilters);
    });

// Fetch and populate Project-based Reports data
async function fetchProjectReport(page = 1, perPage = 10) {
    const response = await fetch(`/get_project_report?page=${page}&per_page=${perPage}`);
    const data = await response.json();
    const projectsBody = document.getElementById('projects-body');

    // Clear existing rows
    projectsBody.innerHTML = '';

    // Populate rows with Project Name and Total Hours
    data.entries.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${report['Project Name']}</td>
            <td>${report['Total Hours']}</td>
        `;
        projectsBody.appendChild(row);
    });
    renderPagination('project-report-pagination', data.current_page, data.total_pages, (newPage) => fetchProjectReport(newPage, perPage));
}

// Switch tabs
document.querySelectorAll('.menu-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and tabs
        document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        // Add active class to clicked button and corresponding tab
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');

        // Load reports if Reports tab is selected
        if (button.dataset.tab === 'reports-tab') {
            fetchReport();
            fetchProjectReport();
        }

      //Load product issues on clicking product issues tab
      if (button.dataset.tab === 'product-issues-tab') {
            fetchProductIssues(); //Call function when tab is clicked
            loadProjectNames();
        }
    });
});

document.querySelectorAll('.menu-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));

        button.classList.add('active');
        const targetTab = document.getElementById(button.dataset.tab);
        targetTab.classList.remove('hidden');

        if (button.dataset.tab === 'timesheet-tab') {
            fetchTimesheetEntries();
            fetchProjectNames();
        } else if (button.dataset.tab === 'pipeline-tab') {
            fetchPipelineEntries();
        } else if (button.dataset.tab === 'projects-tab') {
            fetchProjects();
            loadProjectsSummary();
        }
    });
});



// Clickable logo script
document.querySelector('.logo-link').addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    document.querySelector('[data-tab="timesheet-tab"]').classList.add('active');
    document.getElementById('timesheet-tab').classList.add('active');
});

// Handle form submission
document.getElementById('entry-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const entry = {
        "Project Name": document.getElementById('project-name').value,
        "Task Type": document.getElementById('task-type').value,
        "Task Name": document.getElementById('task-name').value,
        "Resource Name": document.getElementById('resource-name').value,
        "Hours Worked": document.getElementById('hours-worked').value,
        "Date": document.getElementById('date').value
    };
    const dateInput = document.getElementById('date').value;
    const enteredDate = new Date(dateInput);
    const currentDate = new Date();

    // Validate date is not in the future
    if (enteredDate > currentDate) {
      alert('Error: Date cannot be greater than today!');
    return;
    }

    const response = await fetch('/add_entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    });

    if (response.ok) {
        alert('Entry added successfully!');
        document.getElementById('entry-modal').classList.add('hidden');
        fetchTimesheetEntries(); // Refresh timesheet table
    } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
    }
});


// Open modal on clicking the "Add Entry" button
document.getElementById('add-entry').addEventListener('click', () => {
    document.getElementById('entry-modal').classList.remove('hidden');
});

// Close modal on clicking the Cancel button
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('entry-modal').classList.add('hidden');
});


// Load projects on page load
document.addEventListener('DOMContentLoaded', () => fetchProjects());

function getProjectFilters() {
    return {
        start_date: document.getElementById("filter-start-date").value,
        end_date: document.getElementById("filter-end-date").value,
        region: document.getElementById("filter-region").value,
        project_started: document.getElementById("filter-started").value,
        project_completed: document.getElementById("filter-completed").value
    };
}

//async function for adding projects
async function fetchProjects() {
    const response = await fetch('/get_projects');
    const data = await response.json();
    const tableBody = document.getElementById('projects-table-body');
    tableBody.innerHTML = '';

    data.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry['Customer Name']}</td>
            <td>${entry['Implementation Cost']}</td>
            <td><a href="${entry['Order Form']}" target="_blank">Order Form</a></td>
            <td><a href="${entry['Scope of Work']}" target="_blank">Scope of Work</a></td>
            <td>${entry['Sales Name']}</td>
            <td>${entry['Solution Engineer Name']}</td>
            <td>${entry['Start Date']}</td>
            <td>${entry['Expected Close Date']}</td>
            <td>${entry['Status'] || 'N/A'}</td>
            <td>${entry['Region'] || 'N/A'}</td> <!-- Display Region -->
            <td>${entry['Project Started']}</td>
            <td>${entry['Project Completed']}</td>
            <td>
                <button class="edit-project">Edit</button>
                <button class="delete-project">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// all for handling adding  new porject functionality
document.getElementById('project-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = document.getElementById('project-form');
    const formData = new FormData(form);
    const projectId = document.getElementById('project-id').value;

    let endpoint = '/add_project';
    let method = 'POST';

    if (projectId) {
        endpoint = `/update_project/${projectId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(endpoint, {
            method: method,
            body: formData,
        });

        if (response.ok) {
            alert(projectId ? 'Project updated successfully!' : 'Project added successfully!');
            document.getElementById('project-modal').classList.add('hidden');
            fetchProjects();
            loadProjectsSummary(); // Refresh summary as well
        } else {
            alert('Failed to save project.');
        }
    } catch (err) {
        console.error('Error saving project:', err);
    }
});


// Open modal for adding projects
document.getElementById('add-project-entry').addEventListener('click', () => {
    document.getElementById('project-modal').classList.remove('hidden');
});

// Close modal
document.getElementById('close-project-modal').addEventListener('click', () => {
    document.getElementById('project-modal').classList.add('hidden');
});

// Edit project row code (save the updated entry)
async function handleEditProjectRow(row) {
    const projectId = row.dataset.entryId;
    if (!projectId) {
        alert('Invalid project ID.');
        return;
    }

    try {
        const response = await fetch(`/get_project/${projectId}`);
        const project = await response.json();

        // Populate modal fields
        document.getElementById('project-id').value = project.id;
        document.getElementById('customer-name').value = project["Customer Name"] || '';
        document.getElementById('implementation-cost').value = project["Implementation Cost"] || '';
        document.getElementById('sales-name').value = project["Sales Name"] || '';
        document.getElementById('solution-engineer-name').value = project["Solution Engineer Name"] || '';
        document.getElementById('start-date').value = project["Start Date"] || '';
        document.getElementById('expected-close-date').value = project["Expected Close Date"] || '';
        document.getElementById('status').value = project["Status"] || '';
        document.getElementById('region').value = project["Region"] || '';
        document.getElementById('project-started').value = project["Project Started"] || 'No';
        document.getElementById('project-completed').value = project["Project Completed"] || 'No';

        // Set modal title
        document.getElementById('project-modal-title').textContent = "Edit Project";

        // Open modal
        document.getElementById('project-modal').classList.remove('hidden');
    } catch (err) {
        alert("Failed to load project data.");
        console.error(err);
    }
}



// delete the project entry

function handleDeleteProjectRow(entryId) {
    if (confirm('Are you sure you want to delete this project?')) {
        fetch(`/delete_project/${entryId}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Project deleted successfully!');
                    fetchProjects(); // Refresh the projects table
                } else {
                    alert('Error deleting project!');
                }
            });
    }
}

function renderProjectPagination(currentPage, totalPages) {
    const container = document.getElementById('project-pagination-numbers');
    container.innerHTML = '';

    if (totalPages <= 1) return;

    const createBtn = (label, disabled, onClick) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.disabled = disabled;
        btn.className = disabled ? 'btn-secondary disabled' : 'btn-secondary';
        btn.addEventListener('click', onClick);
        return btn;
    };

    container.appendChild(createBtn('<< First', currentPage === 1, () => loadProjectsPage(1)));
    container.appendChild(createBtn('< Prev', currentPage === 1, () => loadProjectsPage(currentPage - 1)));

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'btn-primary' : 'btn-secondary';
        pageBtn.addEventListener('click', () => loadProjectsPage(i));
        container.appendChild(pageBtn);
    }

    container.appendChild(createBtn('Next >', currentPage === totalPages, () => loadProjectsPage(currentPage + 1)));
    container.appendChild(createBtn('Last >>', currentPage === totalPages, () => loadProjectsPage(totalPages)));
}


// Event listeners for project module's edit and delete action button

async function fetchProjects(page = 1, filters = {}) {
    const queryParams = new URLSearchParams({ ...filters, page, per_page: perPageProjects });

    const response = await fetch(`/filter_projects?${queryParams}`);
    const data = await response.json();
    const tableBody = document.getElementById("projects-table-body");
    tableBody.innerHTML = '';

    data.projects.forEach(entry => {
        const row = document.createElement("tr");
        row.dataset.entryId = entry.id;
        row.innerHTML = `
            <td>${entry['Customer Name']}</td>
            <td>${entry['Implementation Cost']}</td>
            <td><a href="${entry['Order Form']}" target="_blank">Order Form</a></td>
            <td><a href="${entry['Scope of Work']}" target="_blank">Scope of Work</a></td>
            <td>${entry['Sales Name']}</td>
            <td>${entry['Solution Engineer Name']}</td>
            <td>${entry['Start Date']}</td>
            <td>${entry['Expected Close Date']}</td>
            <td>${entry['Status']}</td>
            <td>${entry['Region']}</td>
            <td>${entry['Project Started']}</td>
            <td>${entry['Project Completed']}</td>
            <td>
                <button class="edit-project">Edit</button>
                <button class="delete-project">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
        row.querySelector('.edit-project').addEventListener('click', () => handleEditProjectRow(row));
        row.querySelector('.delete-project').addEventListener('click', () => handleDeleteProjectRow(entry.id));
    });

    renderProjectPagination(page, Math.ceil(data.total_records / perPageProjects));
}

function loadProjectsPage(pageNumber) {
    currentProjectPage = pageNumber;
    fetchProjects(currentProjectPage, currentProjectFilters);
}


// for fetching project names and displaying when adding timesheet entry in modal

async function fetchProjectNames() {
    try {
        const response = await fetch('/get_project_names');
        if (!response.ok) {
            throw new Error('Failed to fetch project names');
        }
        const projectNames = await response.json();
        const projectNameDropdown = document.getElementById('project-name');
        console.log('Project names fetched:', projectNames);

        // Clear existing options
        projectNameDropdown.innerHTML = `
            <option value="" disabled selected>Select project name</option>
        `;

        // Populate dropdown with project names
        projectNames.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectNameDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching project names:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('jump-to-first-project')?.addEventListener('click', () => {
    loadProjectsPage(1);
  });

  document.getElementById('jump-to-last-project')?.addEventListener('click', async () => {
    const response = await fetch(`/filter_projects?${new URLSearchParams({ ...currentProjectFilters, page: 1, per_page: 1 })}`);
    const data = await response.json();
    const lastPage = Math.ceil(data.total_records / perPageProjects);
    loadProjectsPage(lastPage);
  });

  document.getElementById('prev-project-page')?.addEventListener('click', () => {
    if (currentProjectPage > 1) {
      loadProjectsPage(currentProjectPage - 1);
    }
  });

  document.getElementById('next-project-page')?.addEventListener('click', async () => {
    const response = await fetch(`/filter_projects?${new URLSearchParams({ ...currentProjectFilters, page: 1, per_page: 1 })}`);
    const data = await response.json();
    const lastPage = Math.ceil(data.total_records / perPageProjects);
    if (currentProjectPage < lastPage) {
      loadProjectsPage(currentProjectPage + 1);
    }
  });
});

// this fucntion is for making sure that if the user lands by default
//and clicks on add entry button, still the getprojectnames function uploads
// on page load event
document.addEventListener('DOMContentLoaded', () => {
    const activeTab = document.querySelector('.menu-button.active').dataset.tab;

    if (activeTab === 'timesheet-tab') {
        console.log('Loading Timesheet tab by default...');
        fetchTimesheetEntries(); // Load timesheet entries
        fetchProjectNames(); // Load project names
    }
});

// Add JavaScript logic to open the import modal,
// send the file to the backend, and handle the response
document.addEventListener('DOMContentLoaded', () => {
    // Open Import Modal for Timesheet
    document.getElementById('import-timesheet').addEventListener('click', () => {
        document.getElementById('import-type').value = 'timesheet';
        document.getElementById('import-modal').classList.remove('hidden');
    });

    // Open Import Modal for Projects
    document.getElementById('import-projects').addEventListener('click', () => {
        document.getElementById('import-type').value = 'projects';
        document.getElementById('import-modal').classList.remove('hidden');
    });

    // Close Import Modal
    document.getElementById('close-import-modal').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('hidden');
    });

    // Handle File Import
    document.getElementById('import-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const fileInput = document.getElementById('import-file');
        const importType = document.getElementById('import-type').value;

        if (!fileInput.files.length) {
            alert('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        const apiUrl = importType === 'timesheet' ? '/import_timesheet' : '/import_projects';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to import data.');
            }

            alert(`Import completed. Success: ${result.success}, Errors: ${result.errors}`);

            // Download error logs
            if (result.error_logs.length > 0) {
                const blob = new Blob([result.error_logs.join('\n')], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${importType}_import_errors.txt`;
                link.click();
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            document.getElementById('import-modal').classList.add('hidden');
            fileInput.value = ''; // Clear the file input
        }
    });
});

// for populating values on filter dropdowns in timesheet page

async function populateFilters() {
    try {
        // Fetch all records without pagination
        const response = await fetch('/get_all?per_page=0'); // 'per_page=0' is assumed to fetch all records
        const data = await response.json();

        // Extract unique project names and resource names from the entire dataset
        const projectNames = [...new Set(data.entries.map(entry => entry['Project Name']))];
        const resourceNames = [...new Set(data.entries.map(entry => entry['Resource Name']))];

        // Populate project name filter
        const projectNameDropdown = document.getElementById('filter-project-name');
        projectNameDropdown.innerHTML = `<option value="">All</option>`;
        projectNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            projectNameDropdown.appendChild(option);
        });

        // Populate resource name filter
        const resourceNameDropdown = document.getElementById('filter-resource-name');
        resourceNameDropdown.innerHTML = `<option value="">All</option>`;
        resourceNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            resourceNameDropdown.appendChild(option);
        });

        console.log('Filters populated successfully.');
    } catch (error) {
        console.error('Error populating filters:', error);
    }
}


// Call this function when the Timesheet tab is active
document.addEventListener('DOMContentLoaded', () => {
    populateFilters();
});



// Fetch and Populate Quarterly Revenue Report
async function fetchQuarterlyRevenue(selectedQuarter = 'all', page = 1, perPage = 10) {
    try {
        const response = await fetch(`/get_quarterly_revenue?quarter=${selectedQuarter}&page=${page}&per_page=${perPage}`);
        if (!response.ok) {
            throw new Error('Failed to fetch quarterly revenue report.');
        }
        const data = await response.json();
        const tableBody = document.getElementById('quarterly-revenue-body');
        tableBody.innerHTML = ''; // Clear existing rows

        // Populate rows with Quarterly Revenue data
        data.entries.forEach(row => {
            const tableRow = document.createElement('tr');
            tableRow.innerHTML = `
                <td>${row['Quarter']}</td>
                <td>${row['Category']}</td>
                <td>${row['Total Revenue']}</td>
            `;
            tableBody.appendChild(tableRow);
        });
    } catch (error) {
        console.error('Error fetching quarterly revenue report:', error);
    }
    renderPagination('revenue-report-pagination', data.current_page, data.total_pages, (newPage) => fetchQuarterlyRevenue(quarter, newPage, perPage));
}

// Event Listener for Filter Change
document.getElementById('quarter-filter').addEventListener('change', (event) => {
    const selectedQuarter = event.target.value;
    fetchQuarterlyRevenue(selectedQuarter,1); // Fetch data for the selected quarter
});

// On Page Load: Populate Quarter Filter and Load All Quarters by Default
document.addEventListener('DOMContentLoaded', () => {
    fetchQuarters(); // Populate the quarter dropdown
    fetchQuarterlyRevenue(); // Load all quarters by default
});

//logic to show only selected report and hide others
//document.getElementById('report-filter').addEventListener('change', (event) => {
//    const selectedReport = event.target.value;

    // Hide all reports
//    document.getElementById('resources-hours-report').classList.add('hidden');
//    document.getElementById('hours-spent-project-report').classList.add('hidden');
//    document.getElementById('quarterly-revenue-report').classList.add('hidden');

    // Show the selected report
//    if (selectedReport === 'resources-hours') {
//        document.getElementById('reports-table').classList.remove('hidden');
//        fetchReport(); // Fetch and display Resources Hours Report
//    } else if (selectedReport === 'hours-spent-project') {
//        document.getElementById('projects-table').classList.remove('hidden');
//        fetchHoursSpentByProject(); // Fetch and display Hours Spent by Project Report
//    } else if (selectedReport === 'quarterly-revenue') {
    //    document.getElementById('quarterly-revenue-table').classList.remove('hidden');
//        fetchQuarterlyRevenue(); // Fetch and display Quarterly Revenue Report
  //  }
//});

// logic to load default report "resources by hours report"
//document.addEventListener('DOMContentLoaded', () => {
    // Default to Resources Hours Report
  //  fetchReport();
//    document.getElementById('resources-hours-report').classList.remove('hidden');
//});

// for populating quarter values in fetch quarterly rvenue report
async function fetchQuarters() {
    try {
        const response = await fetch('/get_quarters');
        const data = await response.json();
        const quarterFilter = document.getElementById('quarter-filter');

        // Populate the dropdown
        data.forEach(quarter => {
            const option = document.createElement('option');
            option.value = quarter;
            option.textContent = quarter;
            quarterFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching quarters:', error);
    }
}

//for add product issue modal
// Fetch Project Names for Dropdown
async function loadProjectNames() {
  try {
      const response = await fetch('/get_project_names');
      if (!response.ok) {
          throw new Error('Failed to fetch project names');
      }
      const projectNames = await response.json();
      const projectNameDropdown = document.getElementById('project-name-product-issues');
      console.log('Project names fetched:', projectNames);

      // Clear existing options
      projectNameDropdown.innerHTML = `
          <option value="" disabled selected>Select project name</option>
      `;

      // Populate dropdown with project names
      projectNames.forEach(project => {
          const option = document.createElement('option');
          option.value = project;
          option.textContent = project;
          projectNameDropdown.appendChild(option);
      });
  } catch (error) {
      console.error('Error fetching project names:', error);
  }
}

// Load project names when the modal opens
document.getElementById('add-product-issue').addEventListener('click', loadProjectNames());

// Handle form submission
document.getElementById('product-issue-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Check if we are editing an issue or adding a new one
    const issueId = document.getElementById('product-issue-id').value.trim();

    const productIssueData = {
        issue_type: document.getElementById('issue-type').value,
        jira_l2_ticket: document.getElementById('jira-ticket').value,
        raised_on: document.getElementById('raised-on').value,
        eta: document.getElementById('eta').value || null,
        project_name: document.getElementById('project-name-product-issues').value || null,
        current_status: document.getElementById('current-status').value,
        use_case_link: document.getElementById('use-case').value || null,
        chargeable: document.getElementById('chargeable').value,
        region: document.getElementById('region').value || null,
        comments: document.getElementById('comments').value || null,
    };

    try {
        let apiUrl;
        let methodType;
        let successMessage;

        if (issueId && issueId !== '') {  // ✅ Editing existing issue
            apiUrl = `/update_product_issue/${issueId}`;
            methodType = 'PUT';
            successMessage = 'Product Issue Updated Successfully!';
        } else {  // ✅ Adding a new issue
            apiUrl = '/add_product_issue';
            methodType = 'POST';
            successMessage = 'Product Issue Added Successfully!';
        }

        const response = await fetch(apiUrl, {
            method: methodType,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productIssueData)
        });

        if (response.ok) {
            alert(successMessage);
            document.getElementById('product-issue-modal').classList.add('hidden');
            fetchProductIssues(); // Refresh issue list
        } else {
            console.error('Failed to process product issue');
        }
    } catch (error) {
        console.error('Error processing product issue:', error);
    }
});



// function for pagination in product issues tab
function updatePagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('product-issues-pagination');
    paginationContainer.innerHTML = ''; // Clear existing pagination

    if (totalPages > 1) {
        // Jump to First
        const firstPageButton = document.createElement('button');
        firstPageButton.textContent = '<< First';
        firstPageButton.disabled = currentPage === 1;
        firstPageButton.addEventListener('click', () => fetchProductIssues(1));
        paginationContainer.appendChild(firstPageButton);

        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.textContent = '< Prev';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => fetchProductIssues(currentPage - 1));
        paginationContainer.appendChild(prevButton);

        // Page Numbers (Showing only 10 at a time)
        const startPage = Math.max(1, currentPage - 5);
        const endPage = Math.min(totalPages, startPage + 9);

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('pagination-button');
            if (i === currentPage) {
                pageButton.classList.add('active'); // Highlight current page
            }
            pageButton.addEventListener('click', () => fetchProductIssues(i));
            paginationContainer.appendChild(pageButton);
        }

        // Next Button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next >';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => fetchProductIssues(currentPage + 1));
        paginationContainer.appendChild(nextButton);

        // Jump to Last
        const lastPageButton = document.createElement('button');
        lastPageButton.textContent = 'Last >>';
        lastPageButton.disabled = currentPage === totalPages;
        lastPageButton.addEventListener('click', () => fetchProductIssues(totalPages));
        paginationContainer.appendChild(lastPageButton);
    }
}


//for product issues tab
async function fetchProductIssues(page = 1, perPage = 10) {
    try {
        const response = await fetch(`/get_product_issues?page=${page}&per_page=${perPage}`);
        const data = await response.json();

        console.log("Product Issues API Response:", data); // Debug API response

        const tableBody = document.getElementById('product-issues-table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        data.entries.forEach(entry => {
            console.log("Processing Entry:", entry); // Log each entry for debugging

            const row = document.createElement('tr');
            row.dataset.issueId = entry.id;
            row.innerHTML = `
                <td contenteditable="false" data-field="Issue Type">${entry['Issue Type']}</td>
                <td contenteditable="false" data-field="Jira/L2 Ticket Link">${entry['Jira/L2 Ticket Link']}</td>
                <td contenteditable="false" data-field="Raised On">${entry['Raised On']}</td>
                <td contenteditable="false" data-field="ETA">${entry['ETA']}</td>
                <td contenteditable="false" data-field="Project Name">${entry['Project Name']}</td>
                <td contenteditable="false" data-field="Current Status">${entry['Current Status']}</td>
                <td contenteditable="false" data-field="Use Case Document Link">${entry['Use Case Document Link']}</td>
                <td contenteditable="false" data-field="Chargeable">${entry['Chargeable']}</td>
                <td contenteditable="false" data-field="Region">${entry['Region']}</td>
                <td contenteditable="false" data-field="Comments">${entry['Comments']}</td>
                <td>
                <div class="action-menu">
                    <button class="three-dots">⋮</button>
                    <div class="menu-options hidden">
                        <button class="edit-issue">Edit</button>
                        <button class="delete-issue">Delete</button>
                    </div>
                </div>
            </td>
            `;
            tableBody.appendChild(row);
            // Attach event listeners for Edit/Delete actions
            setupProductIssueActions(row);
        });

        //Call updatePagination to update pagination UI
        updatePagination(data.current_page, data.total_pages);

    } catch (error) {
        console.error("Error fetching product issues:", error);
    }
}

//function for loading product issues summary
function loadProductIssueSummary() {
    fetch('/product_issues_summary')
        .then(res => res.json())
        .then(data => {
            const summaryDiv = document.getElementById('product-issue-summary');
            if (!summaryDiv) return;

            let statusHTML = '<h3>Status Summary:</h3><ul>';
            for (const [status, count] of Object.entries(data.status_summary)) {
                statusHTML += `<li><strong>${status}:</strong> ${count}</li>`;
            }
            statusHTML += '</ul>';

            let typeHTML = '<h3>Issue Type Summary:</h3><ul>';
            for (const [type, count] of Object.entries(data.type_summary)) {
                typeHTML += `<li><strong>${type}:</strong> ${count}</li>`;
            }
            typeHTML += '</ul>';

            summaryDiv.innerHTML = statusHTML + typeHTML;
        })
        .catch(err => console.error("Summary load failed", err));
}


//function for handling action menu threedots for edit and delete product Issues
// function for handling action menu three dots for edit and delete product Issues
function setupProductIssueActions(row) {
    const menuButton = row.querySelector('.three-dots');
    const menuOptions = row.querySelector('.menu-options');

    // Toggle the menu visibility
    menuButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent closing when clicking inside the menu
        menuOptions.classList.toggle('hidden');

        // Close the menu if clicked outside
        document.addEventListener('click', (e) => {
            if (!menuOptions.contains(e.target) && e.target !== menuButton) {
                menuOptions.classList.add('hidden');
            }
        });
    });

    // Edit Issue Action
    row.querySelector('.edit-issue').addEventListener('click', () => {
        const issueId = row.dataset.issueId;  // Ensure dataset is properly set
        if (!issueId) {
            console.error('Error: Issue ID not found in dataset');
            return;
        }
        handleEditProductIssue(issueId);
    });

    // Delete Issue Action
    row.querySelector('.delete-issue').addEventListener('click', () => {
        const issueId = row.dataset.issueId;
        if (!issueId) {
            console.error('Error: Issue ID not found for deletion');
            return;
        }
        handleDeleteProductIssue(issueId);
    });
}



// function for import product issues
    // Handle Import Form Submission
    document.getElementById('import-product-issues-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        const fileInput = document.getElementById('import-product-file');
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select a CSV file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch('/import_product_issues', {
                method: 'POST',
                body: formData  // ✅ Send as multipart/form-data
            });

            const result = await response.json();

            if (response.ok) {
                alert('Product Issues Imported Successfully!');
                document.getElementById('import-product-issues-modal').classList.add('hidden');
                fetchProductIssues(); // Refresh product issue list
            } else {
                alert('Error importing product issues: ' + result.error);
            }
        } catch (error) {
            console.error('Error importing product issues:', error);
        }
    });


//to handle edit and delete product issues
// Edit Product Issue
async function handleEditProductIssue(issueId) {
    try {
        console.log("Fetching Product Issue ID for edit:", issueId);

        const response = await fetch(`/get_product_issues/${issueId}`);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const issue = await response.json();

        console.log("Product Issue Data:", issue);

        // ✅ Set issue ID in the hidden field
        document.getElementById('product-issue-id').value = issueId;

        // ✅ Populate form fields with fetched data
        document.getElementById('issue-type').value = issue['Issue Type'] || '';
        document.getElementById('jira-ticket').value = issue['Jira/L2 Ticket Link'] || '';
        document.getElementById('raised-on').value = issue['Raised On'] || '';
        document.getElementById('eta').value = issue['ETA'] || '';
        document.getElementById('project-name-product-issues').value = issue['Project Name'] || '';
        document.getElementById('current-status').value = issue['Current Status'] || '';
        document.getElementById('use-case').value = issue['Use Case Document Link'] || '';
        document.getElementById('chargeable').value = issue['Chargeable'] || '';
        document.getElementById('region').value = issue['Region'] || '';
        document.getElementById('comments').value = issue['Comments'] || '';


        // Show the modal
        document.getElementById('product-issue-modal').classList.remove('hidden');

    } catch (error) {
        console.error('Error fetching product issue:', error);
        alert('Failed to fetch issue details. Please try again.');
    }
}



// Ensure a hidden field exists in the modal to store the issue ID
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('product-issue-modal');
    if (!document.getElementById('product-issue-id')) {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.id = 'product-issue-id';
        modal.appendChild(hiddenField);
    }
});

// Modify the form submission function
document.getElementById('product-issue-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Get the issue ID from the hidden field
    const issueId = document.getElementById('product-issue-id').value;

    const productIssueData = {
        issue_type: document.getElementById('issue-type').value,
        jira_l2_ticket: document.getElementById('jira-ticket').value,
        raised_on: document.getElementById('raised-on').value,
        eta: document.getElementById('eta').value || null,
        project_name: document.getElementById('project-name-product-issues').value || null,
        current_status: document.getElementById('current-status').value,
        use_case_link: document.getElementById('use-case').value || null,
        chargeable: document.getElementById('chargeable').value,
        region: document.getElementById('region').value,
        comments: document.getElementById('comments').value || null,
    };

    console.log("Submitting Product Issue:", productIssueData, "Issue ID:", issueId);

    let apiUrl;
    let methodType;

    if (issueId) {
        apiUrl = `/update_product_issue/${issueId}`;
        methodType = 'PUT';
    } else {
        apiUrl = '/add_product_issue';
        methodType = 'POST';
        console.log("error in updating the product-issue");
    }

    try {
        const response = await fetch(apiUrl, {
            method: methodType,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productIssueData)
        });

        if (response.ok) {
            alert(issueId ? 'Product Issue Updated Successfully!' : 'Product Issue Added Successfully!');
            document.getElementById('product-issue-modal').classList.add('hidden');
            fetchProductIssues(); // Refresh issue list
        } else {
            alert('Error updating/adding product issue.');
        }
    } catch (error) {
        console.error('Error submitting product issue:', error);
    }
});



// Delete Product Issue
async function handleDeleteProductIssue(id) {
    if (confirm('Are you sure you want to delete this product issue?')) {
        const response = await fetch(`/delete_product_issue/${id}`, { method: 'DELETE' });

        if (response.ok) {
            alert('Product Issue Deleted Successfully!');
            fetchProductIssues();
        } else {
            alert('Error deleting product issue.');
        }
    }
}

//for apply filter and reset filter in product issues tab
// Apply Filters
document.getElementById('apply-product-filters').addEventListener('click', async () => {
    const issueType = document.getElementById('filter-issue-type').value;
    const raisedOn = document.getElementById('filter-raised-on').value;
    const currentStatus = document.getElementById('filter-current-status').value;

    const queryParams = new URLSearchParams({
        issue_type: issueType,
        raised_on: raisedOn,
        current_status: currentStatus,
    });

    const response = await fetch(`/filter_product_issues?${queryParams}`);
    const data = await response.json();

    displayProductIssues(data);
});

// Reset Filters
document.getElementById('reset-product-filters').addEventListener('click', () => {
    document.getElementById('filter-issue-type').value = '';
    document.getElementById('filter-raised-on').value = '';
    document.getElementById('filter-current-status').value = '';

    fetchProductIssues(); // Load all issues without filters
});

//this function is being called from line 38 where filtering button on product-issue tab is declared
function displayProductIssues(issues) {
    const tableBody = document.getElementById('product-issues-table-body');
    tableBody.innerHTML = ''; // Clear existing rows

    issues.forEach(issue => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${issue['Issue Type'] || 'N/A'}</td>
            <td>${issue['Jira/L2 Ticket Link'] || 'N/A'}</td>
            <td>${issue['Raised On'] || 'N/A'}</td>
            <td>${issue['ETA'] || 'N/A'}</td>
            <td>${issue['Project Name'] || 'N/A'}</td>
            <td>${issue['Current Status'] || 'N/A'}</td>
            <td>${issue['Use Case Document Link'] || 'N/A'}</td>
            <td>${issue['Chargeable'] || 'N/A'}</td>
            <td>${issue['Region'] || 'N/A'}</td>
            <td>${issue['Comments'] || 'N/A'}</td>
            <td>
            <div class="action-menu">
                <button class="three-dots">⋮</button>
                <div class="menu-options hidden">
                    <button class="edit-issue">Edit</button>
                    <button class="delete-issue">Delete</button>
                </div>
            </div>
        </td>
        `;
        tableBody.appendChild(row);
        setupProductIssueActions(row);
    });
}

function setupProductIssueActions(row) {
    const menuButton = row.querySelector('.three-dots');
    const menuOptions = row.querySelector('.menu-options');

    // Toggle the menu visibility
    menuButton.addEventListener('click', (event) => {
        event.stopPropagation();  // Prevent closing when clicking inside the menu
        menuOptions.classList.toggle('hidden');

        // Close the menu if clicked outside
        document.addEventListener('click', (e) => {
            if (!menuOptions.contains(e.target) && e.target !== menuButton) {
                menuOptions.classList.add('hidden');
            }
        });
    });

    // Edit Issue Action
    row.querySelector('.edit-issue').addEventListener('click', () => {
        handleEditProductIssue(row);
    });

    // Delete Issue Action
    row.querySelector('.delete-issue').addEventListener('click', () => {
        const issueId = row.dataset.issueId;
        handleDeleteProductIssue(issueId);
    });
}

async function loadProjectsSummary() {
    try {
        const response = await fetch('/projects_summary');
        const data = await response.json();

        const summaryBox = document.getElementById('projects-summary');
        summaryBox.innerHTML = `
            <div><span>Active Projects:</span> ${data.active_projects}</div>
            <div><span>Total Revenue:</span> $${data.total_revenue.toLocaleString()}</div>
        `;
    } catch (error) {
        console.error("Failed to load project summary:", error);
    }
}

// Export All Projects
document.getElementById("export-all-projects").addEventListener("click", () => {
    window.location.href = "/export_projects_all";
});

// Export Filtered Projects
document.getElementById("export-filtered-projects").addEventListener("click", () => {
    const region = document.getElementById("filter-region").value;
    const project_started = document.getElementById("filter-started").value;
    const project_completed = document.getElementById("filter-completed").value;

    const queryParams = new URLSearchParams({
        region,
        project_started,
        project_completed
    });

    window.location.href = `/export_projects_filtered?${queryParams.toString()}`;
});

function renderPagination(containerId, currentPage, totalPages, fetchFunction) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const createBtn = (label, page, disabled = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.disabled = disabled;
        btn.addEventListener('click', () => fetchFunction(page));
        return btn;
    };

    container.appendChild(createBtn('<< First', 1, currentPage === 1));
    container.appendChild(createBtn('< Prev', currentPage - 1, currentPage === 1));

    const startPage = Math.max(1, currentPage - 4);
    const endPage = Math.min(totalPages, currentPage + 5);

    for (let i = startPage; i <= endPage; i++) {
        const btn = createBtn(i, i);
        if (i === currentPage) btn.classList.add('active');
        container.appendChild(btn);
    }

    container.appendChild(createBtn('Next >', currentPage + 1, currentPage === totalPages));
    container.appendChild(createBtn('Last >>', totalPages, currentPage === totalPages));
}

document.getElementById('export-timesheet').addEventListener('click', async () => {
    const filters = {
        project_name: document.getElementById('filter-project-name').value,
        resource_name: document.getElementById('filter-resource-name').value,
        task_type: document.getElementById('filter-task-type').value,
        start_date: document.getElementById('filter-start-date').value,
        end_date: document.getElementById('filter-end-date').value
    };

    const hasFilters = Object.values(filters).some(val => val !== '');

    let queryParams = '';
    if (hasFilters) {
        queryParams = new URLSearchParams(filters).toString();
    }

    const endpoint = hasFilters ? `/export_timesheet_filtered?${queryParams}` : '/export_timesheet_all';

    try {
        const response = await fetch(endpoint);
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = hasFilters ? 'filtered_timesheet.csv' : 'all_timesheet.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Export failed:', err);
        alert('Failed to export data.');
    }
});


// Fetch entries on page load
document.addEventListener('DOMContentLoaded', fetchTimesheetEntries);
