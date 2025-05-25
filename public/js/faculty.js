console.log("Faculty Dashboard Loaded");

// const samplePendingRequests = [
//       {
//         studentId: "23261A1290",
//         name: "Rohit Sharma",
//         requestType: "Gate-Pass",
//         dateSubmitted: "2025-01-15",
//         description: "Medical appointment"
//       },
//       {
//         studentId: "23261A1291",
//         name: "Priya Patel",
//         requestType: "Leave",
//         dateSubmitted: "2025-01-14",
//         description: "Family function"
//       }
//     ];

//     const sampleAllRequests = [
//       {
//         id: "REQ001",
//         student: "Rohit Sharma (23261A1290)",
//         type: "Gate-Pass",
//         dateSubmitted: "2025-01-15",
//         status: "pending",
//         comments: "",
//         studentId: "23261A1290",
//         name: "Rohit Sharma",
//         section: "CSE-A",
//         description: "Medical appointment"
//       },
//       {
//         id: "REQ002",
//         student: "Priya Patel (23261A1291)",
//         type: "Leave",
//         dateSubmitted: "2025-01-14",
//         status: "approved",
//         comments: "Approved for family function",
//         studentId: "23261A1291",
//         name: "Priya Patel",
//         section: "CSE-B",
//         description: "Family function"
//       }
//     ];

//     const sampleStudents = [
//       {
//         id: "23261A1290",
//         name: "Rohit Sharma",
//         section: "CSE-A",
//         requests: 3
//       },
//       {
//         id: "23261A1291",
//         name: "Priya Patel",
//         section: "CSE-B",
//         requests: 2
//       }
//     ];

//     // Tab switching functionality
//     function switchTab(tabId, tabButton) {
//       // Remove active class from all tabs
//       document.querySelectorAll('.nav-tab').forEach(tab => {
//         tab.classList.remove('active');
//       });
      
//       // Add active class to clicked tab
//       tabButton.classList.add('active');
      
//       // Hide all tab panes
//       document.querySelectorAll('.tab-pane').forEach(pane => {
//         pane.classList.remove('show');
//       });
      
//       // Show selected tab pane
//       document.getElementById(tabId).classList.add('show');
//     }

//     // Dropdown functionality
//     function toggleDropdown() {
//       const dropdown = document.getElementById('userDropdown');
//       dropdown.classList.toggle('show');
//     }

//     // Close dropdown when clicking outside
//     document.addEventListener('click', function(event) {
//       const dropdown = document.getElementById('userDropdown');
//       const toggle = document.querySelector('.dropdown-toggle');
      
//       if (!toggle.contains(event.target) && !dropdown.contains(event.target)) {
//         dropdown.classList.remove('show');
//       }
//     });

//     // Modal functionality
//     function openModal(requestData) {
//       document.getElementById('modalStudentId').textContent = requestData.studentId;
//       document.getElementById('modalStudentName').textContent = requestData.name;
//       document.getElementById('modalStudentSection').textContent = requestData.section || 'CSE-A';
//       document.getElementById('modalRequestType').textContent = requestData.type || requestData.requestType;
//       document.getElementById('modalRequestDate').textContent = requestData.dateSubmitted;
//       document.getElementById('modalRequestDescription').textContent = requestData.description;
      
//       const statusElement = document.getElementById('modalRequestStatus');
//       const status = requestData.status || 'pending';
//       statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
//       statusElement.className = `status-badge status-${status}`;
      
//       document.getElementById('requestDetailsModal').classList.add('show');
//     }

//     function closeModal() {
//       document.getElementById('requestDetailsModal').classList.remove('show');
//     }

//     // Close modal when clicking outside
//     document.getElementById('requestDetailsModal').addEventListener('click', function(event) {
//       if (event.target === this) {
//         closeModal();
//       }
//     });

//     // Populate tables
//     function populatePendingRequests() {
//       const tableBody = document.getElementById('pendingRequestsTable');
//       tableBody.innerHTML = '';
      
//       samplePendingRequests.forEach(request => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//           <td>${request.studentId}</td>
//           <td>${request.name}</td>
//           <td>${request.requestType}</td>
//           <td>${request.dateSubmitted}</td>
//           <td><button class="btn btn-primary" onclick="openModal({
//             studentId: '${request.studentId}',
//             name: '${request.name}',
//             requestType: '${request.requestType}',
//             dateSubmitted: '${request.dateSubmitted}',
//             description: '${request.description}'
//           })">View Details</button></td>
//           <td>
//             <button class="btn btn-success">Approve</button>
//             <button class="btn btn-danger">Reject</button>
//           </td>
//         `;
//         tableBody.appendChild(row);
//       });
//     }

//     function populateAllRequests() {
//       const tableBody = document.getElementById('allRequestsTable');
//       tableBody.innerHTML = '';
      
//       sampleAllRequests.forEach(request => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//           <td>${request.id}</td>
//           <td>${request.student}</td>
//           <td>${request.type}</td>
//           <td>${request.dateSubmitted}</td>
//           <td><span class="status-badge status-${request.status}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></td>
//           <td>${request.comments}</td>
//           <td><button class="btn btn-primary" onclick="openModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">View Details</button></td>
//         `;
//         tableBody.appendChild(row);
//       });
//     }

//     function populateStudents() {
//       const tableBody = document.getElementById('studentsTable');
//       tableBody.innerHTML = '';
      
//       sampleStudents.forEach(student => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//           <td>${student.id}</td>
//           <td>${student.name}</td>
//           <td>${student.section}</td>
//           <td>${student.requests}</td>
//           <td><button class="btn btn-primary">View Profile</button></td>
//         `;
//         tableBody.appendChild(row);
//       });
//     }

//     // Search functionality
//     function setupSearch() {
//       document.getElementById('requestSearch').addEventListener('input', function(e) {
//         // Implement search logic for all requests
//       });
      
//       document.getElementById('studentSearch').addEventListener('input', function(e) {
//         // Implement search logic for students
//       });
//     }

//     // Initialize the page
//     document.addEventListener('DOMContentLoaded', function() {
//       populatePendingRequests();
//       populateAllRequests();
//       populateStudents();
//       setupSearch();
//     });