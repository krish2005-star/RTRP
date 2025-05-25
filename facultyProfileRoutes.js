import express from 'express';
import bcrypt from 'bcrypt';

const router = express.Router();
const saltRounds = 10;

// Faculty profile page route
router.get('/', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'faculty') {
        return res.redirect('/login');
    }

    const fid = req.session.user.id;

    req.app.locals.db.query(
        `SELECT *, dob::text as dob FROM faculty WHERE fid = $1`,
        [fid],
        (err, result) => {
            if (err) {
                console.error('Error fetching faculty profile:', err);
                return res.status(500).send('Server error');
            }

            if (result.rows.length === 0) {
                return res.status(404).send('Faculty not found');
            }

            const user = result.rows[0];
            res.render('facultyProfile', { user, error: null, success: null });
        }
    );
});

// API endpoint for password update
router.post('/update-password', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'faculty') {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const fid = req.session.user.id;
    const db = req.app.locals.db;

    db.query(
        'SELECT fid, password FROM faculty WHERE fid = $1',
        [fid],
        (err, result) => {
            if (err) {
                console.error('Error fetching faculty:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Faculty not found' });
            }

            const faculty = result.rows[0];
            const dbPassword = faculty.password;

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
                        db.query(
                            'UPDATE faculty SET password = $1 WHERE fid = $2',
                            [hashedPassword, fid],
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
                // Fallback to FID check for first-time password change
                if (String(currentPassword) !== String(faculty.fid)) {
                    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
                }
                bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                    if (err) {
                        console.error('Error hashing password:', err);
                        return res.status(500).json({ success: false, message: 'Server error' });
                    }
                    db.query(
                        'UPDATE faculty SET password = $1 WHERE fid = $2',
                        [hashedPassword, fid],
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