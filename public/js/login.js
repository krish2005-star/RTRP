document.getElementById('role-select').addEventListener('change', function() {
  const idField = document.getElementById('username');
  if (this.value === 'student') {
    idField.placeholder = 'Enter your email';
  } else {
    idField.placeholder = 'Enter your email';
  }
});