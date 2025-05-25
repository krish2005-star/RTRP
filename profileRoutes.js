// profileRoutes.js
import express from 'express';
import bcrypt from 'bcrypt';


const router = express.Router();
const saltRounds = 10;


// Profile page route
router.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const sid = req.session.user.id;
    
    // Get user details from database
    req.app.locals.db.query(
        `SELECT *, dob::text as dob FROM student WHERE sid = $1`,
        [sid],
        (err, result) => {
            if (err) {
                console.error('Error fetching user profile:', err);
                return res.status(500).send('Server error');
            }
            
            if (result.rows.length === 0) {
                return res.status(404).send('User not found');
            }
            
            const user = result.rows[0];
            
            // Format date of birth for display in date input if it exists
            if (user.dob) {
                console.log('DOB from DB:', user.dob);
            }
            
            res.render('profile', { user, error: null, success: null });
        }
    );
});

// API endpoint for password update
router.post('/update-password', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const sid = req.session.user.id;

    req.app.locals.db.query(
        'SELECT password FROM student WHERE sid = $1',
        [sid],
        (err, result) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const dbPassword = result.rows[0].password;

            // If password is set, use bcrypt.compare
            if (dbPassword) {
                bcrypt.compare(currentPassword, dbPassword, (err, match) => {
                    if (err) {
                        console.error('Error comparing password:', err);
                        return res.status(500).json({ success: false, message: 'Server error' });
                    }
                    if (!match) {
                        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
                    }
                    // Hash and update new password
                    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                        if (err) {
                            console.error('Error hashing password:', err);
                            return res.status(500).json({ success: false, message: 'Server error' });
                        }
                        req.app.locals.db.query(
                            'UPDATE student SET password = $1 WHERE sid = $2',
                            [hashedPassword, sid],
                            (err) => {
                                if (err) {
                                    console.error('Error updating password:', err);
                                    return res.status(500).json({ success: false, message: 'Server error' });
                                }
                                res.json({ success: true, message: 'Password updated successfully' });
                            }
                        );
                    });
                });
            } else {
                // Fallback to SID check for first-time password change
                if (currentPassword !== sid) {
                    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
                }
                bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                    if (err) {
                        console.error('Error hashing password:', err);
                        return res.status(500).json({ success: false, message: 'Server error' });
                    }
                    req.app.locals.db.query(
                        'UPDATE student SET password = $1 WHERE sid = $2',
                        [hashedPassword, sid],
                        (err) => {
                            if (err) {
                                console.error('Error updating password:', err);
                                return res.status(500).json({ success: false, message: 'Server error' });
                            }
                            res.json({ success: true, message: 'Password updated successfully' });
                        }
                    );
                });
            }
        }
    );
});

export default router;