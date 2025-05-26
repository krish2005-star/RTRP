import express from 'express';
import session from 'express-session';
import path from 'path';
import bodyParser from 'body-parser';
const { urlencoded } = bodyParser;
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import fs from 'fs';
import profileRoutes from './profileRoutes.js';
import facultyProfileRoutes from './facultyProfileRoutes.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'm.krishna0513@gmail.com',      // your Gmail address
    pass: 'ucsmfezsagwylceg'      // use an App Password
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Use true with HTTPS
}));
app.use('/profile', profileRoutes);
app.use('/faculty/profile', facultyProfileRoutes);

// PostgreSQL client
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false } // Required for Render
});

db.connect(err => {
  if (err) {
    console.error("Database connection error:", err.stack);
    process.exit(1);
  } else {
    console.log("Connected to PostgreSQL database.");
  }
  app.locals.db = db;
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// Routes
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const username = req.body.username.trim();
  const password = req.body.password; 
  const role = req.body.role;


  console.log('Login attempt:', { username, password, role }); // Debug log

  let query;
  let idField;
  let redirectPath;

  // Set up query based on role
  if (role === 'student') {
    query = 'SELECT * FROM student WHERE email = $1';
    idField = 'sid';
    redirectPath = '/student';
  } else if (role === 'faculty') {
    query = 'SELECT * FROM faculty WHERE email = $1';
    idField = 'fid';
    redirectPath = '/faculty';
  } else {
    return res.render('login', { error: 'Invalid role selected' });
  }

  console.log('Executing query:', query);
  console.log('With parameters:', [username]);

  // Execute the query
  db.query(query, [username], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.render('login', { error: 'Database error occurred' });
    }

    console.log('Query result:', result.rows);
    console.log('Number of rows found:', result.rows.length);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Found user:', user);
      console.log('Stored password:', user.password);
      console.log('Entered password:', password);

      if (user.password && user.password.startsWith('$2b$')) {
        // Use bcrypt to compare hashed password
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            console.error('Bcrypt comparison error:', err);
            return res.render('login', { error: 'Authentication error' });
          }

          console.log('Bcrypt password match:', isMatch);

          if (isMatch) {
            // Login successful
            req.session.user = {
              id: user[idField],
              name: user.name,
              email: user.email,
              role: role
            };

            console.log('Login successful for:', user.name);
            res.redirect(redirectPath);
          } else {
            console.log('Bcrypt password mismatch');
            res.render('login', { error: 'Invalid username or password' });
          }
        });
      } else if (!user.password){
        // Password is null: allow login with ID as password (first-time login)
        if (password === String(user[idField])) {
          req.session.user = {
            id: user[idField],
            name: user.name,
            email: user.email,
            role: role
          };
          res.redirect(redirectPath)
        } else {
          const isMatch = String(user.password) === String(password);
          if (isMatch) {
            req.session.user = {
              id: user[idField],
              name: user.name,
              email: user.email,
              role: role
            };
            res.redirect(redirectPath);
        }else {
      // No user found
      console.log('No user found with email:', username);
      res.render('login', { error: 'Invalid username or password' });
        }
      }
    }
  }
});
});

app.get('/student', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.redirect('/login');
  }

  const sid = req.session.user.id;

  // 1. Fetch user info
  db.query('SELECT * FROM student WHERE sid = $1', [sid], (err, userResult) => {
    if (err || userResult.rows.length === 0) {
      return res.redirect('/login');
    }
    const user = userResult.rows[0];

    // 2. Fetch monthly request count
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const countQuery = `
      SELECT COUNT(*) AS monthly_count
      FROM requests
      WHERE sid = $1
        AND EXTRACT(MONTH FROM req_date) = $2
        AND EXTRACT(YEAR FROM req_date) = $3
    `;

    db.query(countQuery, [sid, month, year], (err, countResult) => {
      const monthlyCount = (!err && countResult.rows.length > 0)
        ? parseInt(countResult.rows[0].monthly_count, 10)
        : 0;

      // 3. Fetch stats
      const statsQuery = `
        SELECT 
          COUNT(*) AS submitted,
          COUNT(*) FILTER (WHERE status = 'Approved') AS approved,
          COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected,
          COUNT(*) FILTER (WHERE status = 'Pending') AS pending
        FROM Requests
        WHERE sid = $1;
      `;

      db.query(statsQuery, [sid], (err, statsResult) => {
        const stats = (!err && statsResult.rows.length > 0)
          ? statsResult.rows[0]
          : { submitted: 0, approved: 0, rejected: 0, pending: 0 };

        // 4. Fetch recent requests
        db.query(
          "SELECT * FROM Requests WHERE sid = $1 ORDER BY req_date DESC LIMIT 5",
          [sid],
          (err, recentResult) => {
            const recentRequests = (!err && recentResult.rows.length > 0)
              ? recentResult.rows.map(req => ({
                  title: req.req_type,
                  status: req.status,
                  date: new Date(req.req_date).toLocaleDateString(),
                  submittedAt: req.submitted_at ? new Date(req.submitted_at).toLocaleString() : ''
                }))
              : [];

            // 5. Fetch all requests
            db.query(
              "SELECT * FROM Requests WHERE sid = $1 ORDER BY req_date DESC",
              [sid],
              (err, allResult) => {
                const allRequests = (!err && allResult.rows.length > 0)
                  ? allResult.rows.map(req => ({
                      id: req.reqid,
                      type: req.req_type,
                      date: new Date(req.req_date).toLocaleDateString(),
                      status: req.status,
                      comments: req.faculty_comments
                    }))
                  : [];

                // 6. Render only once with all data
                res.render('student', {
                  user,
                  monthlyCount,
                  recentRequests,
                  allRequests,
                  stats
                });
              }
            );
          }
        );
      });
    });
  });
});

app.post('/submit-request', isAuthenticated, upload.single('requestDocument'), (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { req_type, description, req_date } = req.body;
  const attendance = req.file ? req.file.buffer : null;

  // Insert request into database
  db.query(
    "INSERT INTO Requests (sid, req_type, description, req_date, attendance, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING reqid",
    [req.session.user.id, req_type, description, req_date, attendance, 'Pending'],
    (err, result) => {
      if (err) {
        console.error("Error submitting request:", err);
        return res.json({ success: false, message: 'Failed to submit request' });
      }

      // Fetch all faculty emails from the database
      db.query('SELECT email FROM faculty', (err2, facultyResult) => {
        if (err2) {
          console.error("Error fetching faculty emails:", err2);
          // Still redirect, but log the error
          return res.redirect('/student');
        }

        const facultyEmails = facultyResult.rows.map(row => row.email).filter(Boolean);

        if (facultyEmails.length > 0) {
          // Compose the email
          const mailOptions = {
            from: 'm.krishna0513@gmail.com', // your system Gmail
            replyTo: req.session.user.email, // student's email for replies
            to: facultyEmails, // Array of emails
            subject: 'New Student Request Submitted',
            text: `A new request has been submitted by student ${req.session.user.name} (${req.session.user.id}).
Type: ${req_type}
Date: ${req_date}
Please review it in the faculty dashboard.`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Notification email sent to faculty:', info.response);
            }
            // Redirect after attempting to send email
            res.redirect('/student');
          });
        } else {
          // No faculty emails found, just redirect
          res.redirect('/student');
        }
      });
    }
  );
});

// app.get('/faculty', isAuthenticated, (req, res) => {
//   if (req.session.user.role !== 'faculty') {
//     return res.redirect('/login');
//   }

//   // Get all pending requests for the faculty
//   db.query(
//     `SELECT r.*, s.name as student_name, s.sid as student_id 
//      FROM Requests r 
//      JOIN Student s ON r.sid = s.sid 
//      WHERE r.status = 'Pending' 
//      ORDER BY r.req_date DESC`,
//     (err, pendingResult) => {
//       if (err) {
//         console.error("Error fetching pending requests:", err);
//         return res.render('faculty', { 
//           user: req.session.user,
//           pendingRequests: []
//         });
//       }

//       res.render('faculty', { 
//         user: req.session.user,
//         pendingRequests: pendingResult.rows
//       });
//     }
//   );
// });

app.get('/faculty', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'faculty') {
    return res.redirect('/login');
  }

  const fid = req.session.user.id;

  // Get faculty info
  db.query('SELECT * FROM faculty WHERE fid = $1', [fid], (err, facultyResult) => {
    if (err || facultyResult.rows.length === 0) {
      return res.render('faculty', { faculty: {}, stats: {}, pendingRequests: [], allRequests: [], students: [] });
    }
    const faculty = facultyResult.rows[0];

    // Get all pending requests with parent details
    db.query(
      `SELECT r.*, s.name as student_name, s.sid as student_id, s.mobile_no as student_mobile, s.branch as student_branch, p.name as parent_name, p.mobile as parent_mobile, p.email as parent_email
       FROM Requests r
       JOIN Student s ON r.sid = s.sid
       LEFT JOIN Parent p ON s.sid = p.sid
       WHERE r.status = 'Pending'
       ORDER BY r.req_date DESC`,
      (err, pendingResult) => {
        if (err) {
          console.error("Error fetching pending requests:", err);
          return res.render('faculty', { faculty, stats: {}, pendingRequests: [], allRequests: [], students: [] });
        }

        // Get all requests with parent details
        db.query(
          `SELECT r.*, s.name as student_name, s.sid as student_id, s.mobile_no as student_mobile, s.branch as student_branch,
                  p.name as parent_name, p.mobile as parent_mobile, p.email as parent_email
           FROM Requests r
           JOIN Student s ON r.sid = s.sid
           LEFT JOIN Parent p ON s.sid = p.sid
           ORDER BY r.req_date DESC`,
          (err, allRequestsResult) => {
            if (err) {
              console.error("Error fetching all requests:", err);
              return res.render('faculty', { faculty, stats: {}, pendingRequests: [], allRequests: [], students: [] });
            }

            // Get all students
            db.query('SELECT * FROM Student', (err, studentsResult) => {
              if (err) {
                console.error("Error fetching students:", err);
                return res.render('faculty', { faculty, stats: {}, pendingRequests: [], allRequests: [], students: [] });
              }

              // Calculate monthlyCount for each pending request
              pendingResult.rows.forEach(req => {
                req.monthlyCount = allRequestsResult.rows.filter(r =>
                  r.sid === req.sid &&
                  new Date(r.req_date).getMonth() === new Date(req.req_date).getMonth() &&
                  new Date(r.req_date).getFullYear() === new Date(req.req_date).getFullYear()
                ).length;
              });

              // Now you have all data, so calculate stats and render
              const stats = {
                pendingRequests: pendingResult.rows.length,
                allRequests: allRequestsResult.rows.length,
                students: studentsResult.rows.length
              };

              res.render('faculty', {
                faculty,
                stats,
                pendingRequests: pendingResult.rows,
                allRequests: allRequestsResult.rows,
                students: studentsResult.rows
              });
            });
          }
        );
      }
    );
  });
});

app.get('/attendance/:reqid', isAuthenticated, (req, res) => {
  db.query('SELECT attendance FROM Requests WHERE reqid = $1', [req.params.reqid], (err, result) => {
    if (err || !result.rows.length || !result.rows[0].attendance) {
      return res.status(404).send('No image found');
    }
    res.set('Content-Type', 'image/png'); // or detect type if you want
    res.send(result.rows[0].attendance);
  });
});

// API endpoint to get pending requests (for AJAX calls)

app.get('/api/pending-requests', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'faculty') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  db.query(
    `SELECT r.*, s.name as student_name, s.sid as student_id 
     FROM Requests r 
     JOIN Student s ON r.sid = s.sid 
     WHERE r.status = 'Pending' 
     ORDER BY r.req_date DESC`,
    (err, result) => {
      if (err) {
        console.error("Error fetching pending requests:", err);
        return res.json({ success: false, message: 'Failed to fetch requests' });
      }

      const formattedRequests = result.rows.map(req => ({
        id: req.request_id,
        studentId: req.student_id,
        name: req.student_name,
        type: req.type,
        date: new Date(req.req_date).toLocaleDateString(),
        description: req.description,
        status: req.status
      }));

      res.json({ success: true, requests: formattedRequests });
    }
  );
});

// API endpoint to get all requests
app.get('/api/all-requests', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'faculty') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  db.query(
    `SELECT r.*, s.name as student_name, s.sid as student_id 
     FROM Requests r 
     JOIN Student s ON r.sid = s.sid 
     ORDER BY r.req_date DESC`,
    (err, result) => {
      if (err) {
        console.error("Error fetching all requests:", err);
        return res.json({ success: false, message: 'Failed to fetch requests' });
      }

      const formattedRequests = result.rows.map(req => ({
        id: req.request_id,
        studentId: req.student_id,
        student: req.student_name,
        type: req.type,
        date: new Date(req.req_date).toLocaleDateString(),
        status: req.status,
        comments: req.faculty_comments || '',
        description: req.description
      }));

      res.json({ success: true, requests: formattedRequests });
    }
  );
});

// API endpoint to get students
app.get('/api/students', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'faculty') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  db.query(
    `SELECT s.sid, s.name, s.section, 
     COUNT(r.request_id) as request_count
     FROM Student s 
     LEFT JOIN Requests r ON s.sid = r.sid 
     GROUP BY s.sid, s.name, s.section 
     ORDER BY s.name`,
    (err, result) => {
      if (err) {
        console.error("Error fetching students:", err);
        return res.json({ success: false, message: 'Failed to fetch students' });
      }

      const formattedStudents = result.rows.map(student => ({
        id: student.sid,
        name: student.name,
        section: student.section || 'N/A',
        requests: student.request_count
      }));

      res.json({ success: true, students: formattedStudents });
    }
  );
});

app.post('/update-request', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'faculty') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const reqId = req.body.reqId || req.body.requestId;
  const status = req.body.status;
  const comments = req.body.comments;
  const fid = req.session.user.id;

  // 1. Update the request status
  db.query(
    "UPDATE requests SET status = $1 WHERE reqid = $2",
    [status, reqId],
    (err) => {
      if (err) {
        console.error("Error updating request:", err);
        return res.json({ success: false, message: 'Failed to update request' });
      }

      // 2. Get the student ID for this request
      db.query(
        "SELECT sid FROM Requests WHERE reqid = $1",
        [reqId],
        (err, result) => {
          if (err || !result.rows.length) {
            console.error("Error fetching sid:", err);
            return res.json({ success: false, message: 'Failed to find request' });
          }
          const sid = result.rows[0].sid;

          // 3. Check if response already exists for this reqid and faculty
          db.query(
            "SELECT * FROM responses WHERE reqid = $1 AND fid = $2",
            [reqId, fid],
            (err3, resResult) => {
              if (err3) {
                console.error("Error checking existing response:", err3);
                return res.json({ success: false, message: 'Failed to check response' });
              }
              if (resResult.rows.length > 0) {
                return res.json({ success: false, message: 'Already responded to this request' });
              }

              // 4. Insert the response
              db.query(
                "INSERT INTO responses (sid, fid, reqid, comment, res_status) VALUES ($1, $2, $3, $4, $5)",
                [sid, fid, reqId, comments, status],
                (err2) => {
                  if (err2) {
                    console.error("Error inserting response:", err2);
                    return res.json({ success: false, message: 'Failed to save response' });
                  }

                  // 5. Fetch student email, name, request info
                  db.query(
                    `SELECT s.email, s.name, r.req_type, r.req_date
                     FROM student s
                     JOIN requests r ON s.sid = r.sid
                     WHERE r.reqid = $1`,
                    [reqId],
                    (err3, result3) => {
                      if (err3 || !result3.rows.length) {
                        console.error("Error fetching student email/info:", err3);
                        return res.json({ success: true, message: 'Request updated, but could not notify student.' });
                      }

                      const student = result3.rows[0];

                      // 6. Fetch faculty name
                      db.query(
                        'SELECT name FROM faculty WHERE fid = $1',
                        [fid],
                        (err4, result4) => {
                          const facultyName = (!err4 && result4.rows.length > 0) ? result4.rows[0].name : 'Faculty';

                          // 7. Compose and send the email
                          const mailOptions = {
                            from: 'm.krishna0513@gmail.com', // your system Gmail
                            to: student.email,
                            subject: `Your Request Has Been ${status}`,
                            text: `Dear ${student.name},

Your request of type "${student.req_type}" dated ${new Date(student.req_date).toLocaleDateString()} has been ${status.toLowerCase()} by faculty: ${facultyName}.

${comments ? `Faculty comments: ${comments}\n\n` : ''}
Thank you,
MGIT`
                          };

                          transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                              console.error('Error sending email to student:', error);
                            } else {
                              console.log('Notification email sent to student:', info.response);
                            }
                            // Respond to AJAX/fetch
                            return res.json({ success: true, message: 'Request updated and student notified.' });
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});


app.get('/faculty/view-requests', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'faculty') {
    return res.redirect('/login');
  }

  const fid = req.session.user.id;

  db.query(
    `SELECT r.*, s.name as student_name, s.sid as student_id 
     FROM Requests r 
     JOIN Student s ON r.sid = s.sid 
     ORDER BY r.req_date DESC`,
    (err, result) => {
      if (err) {
        console.error("Error fetching all requests:", err);
        return res.render('faculty-view-requests', { faculty: {}, requests: [] });
      }

      // You may want to fetch faculty info as well
      db.query('SELECT * FROM faculty WHERE fid = $1', [fid], (err2, facultyResult) => {
        const faculty = (facultyResult && facultyResult.rows[0]) || {};
        res.render('faculty-view-requests', { 
          faculty,
          requests: result.rows
        });
      });
    }
  );
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/forgot-password', async (req, res) => {
  const { email, role } = req.body;
  const table = role === 'faculty' ? 'faculty' : 'student';

  // Generate a secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Check if user exists
  const userQuery = `SELECT * FROM ${table} WHERE email = $1`;
  const userResult = await db.query(userQuery, [email]);
  if (userResult.rows.length === 0) {
    return res.render('forgot-password', { message: 'If this email is registered, a reset link will be sent.' });
  }

  // Save token and expiry in DB
  await db.query(
    `UPDATE ${table} SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3`,
    [token, expiry, email]
  );

  // Send email with reset link
  const resetLink = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password/${token}?role=${role}`;
  // Configure your SMTP settings here
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER, // your email
      pass: process.env.SMTP_PASS  // your email password or app password
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`
  });

  res.render('forgot-password', { message: 'If this email is registered, a reset link will be sent.' });
});

// Show reset password form
app.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { role } = req.query;
  const table = role === 'faculty' ? 'faculty' : 'student';

  // Find user with this token and check expiry
  const userQuery = `SELECT * FROM ${table} WHERE reset_token = $1 AND reset_token_expiry > NOW()`;
  const userResult = await db.query(userQuery, [token]);
  if (userResult.rows.length === 0) {
    return res.send('Invalid or expired reset link.');
  }
  res.render('reset-password', { token, role });
});

// Handle new password submission
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { role } = req.query;
  const { password } = req.body;
  const table = role === 'faculty' ? 'faculty' : 'student';

  // Find user with this token and check expiry
  const userQuery = `SELECT * FROM ${table} WHERE reset_token = $1 AND reset_token_expiry > NOW()`;
  const userResult = await db.query(userQuery, [token]);
  if (userResult.rows.length === 0) {
    return res.send('Invalid or expired reset link.');
  }

  // Update password and clear token
  await db.query(
    `UPDATE ${table} SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = $2`,
    [password, token]
  );

  res.render('reset-password', { message: 'Password reset successful! You can now log in.', token: '', role });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
