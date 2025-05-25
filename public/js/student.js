// Tab switching functionality
    function switchTab(tabId, tabButton) {
      // Remove active class from all tabs
      document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Add active class to clicked tab
      tabButton.classList.add('active');
      
      // Hide all tab panes
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show');
      });
      
      // Show selected tab pane
      document.getElementById(tabId).classList.add('show');
    }

    // Dropdown functionality
    function toggleDropdown() {
      const dropdown = document.getElementById('userDropdown');
      dropdown.classList.toggle('show');
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
      const dropdown = document.getElementById('userDropdown');
      const toggle = document.querySelector('.dropdown-toggle');
      
      if (!toggle.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
      }
    });

    // Modal functionality
    function openModal() {
      document.getElementById('submitRequestModal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('submitRequestModal').classList.remove('show');
    }

    // Close modal when clicking outside
    document.getElementById('submitRequestModal').addEventListener('click', function(event) {
      if (event.target === this) {
        closeModal();
      }
    });

    // Form submission
    function submitForm() {
  const form = document.getElementById('permissionRequestForm');
  form.submit(); // This will POST the form to your backend
}

    // Reset form
    function resetForm() {
      document.getElementById('permissionRequestForm').reset();
    }

    // Update stats (demo function)
    function updateStats() {
      const submitted = document.getElementById('submittedCount');
      const pending = document.getElementById('pendingCount');
      
      submitted.textContent = parseInt(submitted.textContent) + 1;
      pending.textContent = parseInt(pending.textContent) + 1;
    }

    // Set minimum date to today
    document.addEventListener('DOMContentLoaded', function() {
      const dateInput = document.getElementById('requestDate');
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
    });