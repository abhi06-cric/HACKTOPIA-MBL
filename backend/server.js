const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const JWT_SECRET = 'supersecret_demo_key';

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Join a room specific to user ID to receive targeted updates
    socket.on('join', (userId) => {
        socket.join(userId.toString());
        console.log(`User ${userId} joined their room.`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes

// 1. Register
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate UPI ID from email prefix or name (simple approach)
        const namePrefix = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        let upiId = `${namePrefix}@projectupi`;
        
        // Ensure uniqueness
        const checkUpi = (upi) => {
            return new Promise((resolve, reject) => {
                db.get('SELECT id FROM users WHERE upi_id = ?', [upi], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });
        };

        let unique = false;
        let counter = 1;
        let currentUpi = upiId;
        while (!unique) {
            const exists = await checkUpi(currentUpi);
            if (exists) {
                currentUpi = `${namePrefix}${counter}@projectupi`;
                counter++;
            } else {
                unique = true;
            }
        }
        upiId = currentUpi;

        db.run(
            'INSERT INTO users (name, email, password_hash, upi_id) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, upiId],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: users.email')) {
                        return res.status(400).json({ error: 'Email already exists.' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                const userId = this.lastID;
                const token = jwt.sign({ id: userId, upi_id: upiId }, JWT_SECRET, { expiresIn: '24h' });
                res.status(201).json({ message: 'User created successfully', token, user: { id: userId, name, email, upi_id: upiId, balance: 1000000.00 } });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, upi_id: user.upi_id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, upi_id: user.upi_id, balance: user.balance } });
    });
});

// 3. Get User Profile & Balance
app.get('/api/user', authenticateToken, (req, res) => {
    db.get('SELECT id, name, email, upi_id, balance FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });
});

// 4. Send Money
app.post('/api/transfer', authenticateToken, (req, res) => {
    const { receiverUpiId, amount, note } = req.body;
    const senderId = req.user.id;
    const transferAmount = parseFloat(amount);

    if (!receiverUpiId || !transferAmount || transferAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid amount greater than ₹0.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get('SELECT * FROM users WHERE id = ?', [senderId], (err, sender) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Server error' }); }
            if (sender.upi_id === receiverUpiId) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: 'You cannot send money to your own UPI ID.' });
            }
            if (sender.balance < transferAmount) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: "You don't have enough balance to complete this transaction." });
            }

            db.get('SELECT * FROM users WHERE upi_id = ?', [receiverUpiId], (err, receiver) => {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Server error' }); }
                if (!receiver) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: "The receiver's UPI ID was not found." });
                }

                // Deduct from sender
                db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [transferAmount, senderId], (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Server error' }); }

                    // Add to receiver
                    db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [transferAmount, receiver.id], (err) => {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Server error' }); }

                        const txnId = 'TXN' + Math.floor(100000 + Math.random() * 900000);
                        
                        db.run(
                            'INSERT INTO transactions (transaction_id, sender_user_id, receiver_user_id, sender_upi_id, receiver_upi_id, amount, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [txnId, senderId, receiver.id, sender.upi_id, receiver.upi_id, transferAmount, note],
                            (err) => {
                                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Server error' }); }
                                
                                db.run('COMMIT', () => {
                                    // Real-time updates via Socket.io
                                    io.to(senderId.toString()).emit('balance_update', { newBalance: sender.balance - transferAmount });
                                    io.to(receiver.id.toString()).emit('balance_update', { newBalance: receiver.balance + transferAmount });
                                    
                                    const txnDetails = {
                                        transaction_id: txnId,
                                        sender_upi_id: sender.upi_id,
                                        receiver_upi_id: receiver.upi_id,
                                        amount: transferAmount,
                                        note: note,
                                        status: 'Successful',
                                        created_at: new Date().toISOString()
                                    };

                                    io.to(senderId.toString()).emit('new_transaction', txnDetails);
                                    io.to(receiver.id.toString()).emit('new_transaction', txnDetails);

                                    res.json({ message: `₹${transferAmount.toFixed(2)} sent successfully to ${receiver.upi_id}.`, transaction: txnDetails, receiverName: receiver.name });
                                });
                            }
                        );
                    });
                });
            });
        });
    });
});

// 5. Get Transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM transactions WHERE sender_user_id = ? OR receiver_user_id = ? ORDER BY created_at DESC',
        [req.user.id, req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        }
    );
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
