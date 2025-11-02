const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

// Path to tickets storage
const ticketsFile = path.join(__dirname, 'tickets.json');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to read tickets
function readTickets() {
  try {
    return JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
  } catch (err) {
    return [];
  }
}

// Helper function to save tickets
function saveTickets(tickets) {
  fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2));
}

// Submit a new ticket
app.post('/submit', (req, res) => {
  const tickets = readTickets();

  const newTicket = {
    id: uuidv4(),
    name: req.body.name || 'Anonymous',
    email: req.body.email || '',
    items: req.body.items || [],
    comments: [],
    status: 'submitted',
    createdAt: new Date().toISOString()
  };

  tickets.push(newTicket);
  saveTickets(tickets);

  // Redirect to tracking page with ticket ID in query
  res.redirect(`/track.html?id=${newTicket.id}`);
});

// Admin dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API: Get all tickets (for admin)
app.get('/api/tickets', (req, res) => {
  const tickets = readTickets();
  res.json(tickets);
});

// API: Get single ticket by ID
app.get('/api/tickets/:id', (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// API: Add comment to ticket
app.post('/api/tickets/:id/comments', (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const comment = {
    text: req.body.text || '',
    createdAt: new Date().toISOString()
  };

  ticket.comments.push(comment);
  saveTickets(tickets);
  res.json(ticket);
});

// API: Update ticket status
app.post('/api/tickets/:id/status', (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  ticket.status = req.body.status || ticket.status;
  saveTickets(tickets);
  res.json(ticket);
});

// API: Delete ticket
app.delete('/api/tickets/:id', (req, res) => {
  let tickets = readTickets();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  tickets = tickets.filter(t => t.id !== req.params.id);
  saveTickets(tickets);
  res.json({ message: 'Ticket deleted' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
