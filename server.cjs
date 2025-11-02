const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

const DATA_FILE = path.join(__dirname, 'tickets.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure tickets.json exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Helper: read tickets
function readTickets() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Helper: write tickets
function writeTickets(tickets) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));
}

// Submit a ticket
app.post('/submit', (req, res) => {
    const tickets = readTickets();
    const trackingId = uuidv4().slice(0, 8);
    const ticket = {
        id: trackingId,
        name: req.body.name,
        item: req.body.item,
        description: req.body.description || '',
        status: 'submitted',
        comments: [],
        createdAt: new Date()
    };
    tickets.push(ticket);
    writeTickets(tickets);
    res.json({ trackingId });
});

// Get a ticket by ID
app.get('/ticket/:id', (req, res) => {
    const tickets = readTickets();
    const ticket = tickets.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
});

// Admin dashboard data
app.get('/admin/tickets', (req, res) => {
    const tickets = readTickets();
    res.json(tickets);
});

// Update ticket (status or add comment)
app.post('/admin/ticket/:id', (req, res) => {
    const tickets = readTickets();
    const ticket = tickets.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (req.body.status) ticket.status = req.body.status;
    if (req.body.comment) ticket.comments.push({ text: req.body.comment, date: new Date() });

    writeTickets(tickets);
    res.json({ success: true });
});

// Delete ticket
app.delete('/admin/ticket/:id', (req, res) => {
    let tickets = readTickets();
    tickets = tickets.filter(t => t.id !== req.params.id);
    writeTickets(tickets);
    res.json({ success: true });
});

// Tracking page
app.get('/track.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
