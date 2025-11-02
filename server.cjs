import express from "express";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(process.cwd(), "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const TICKETS_FILE = path.join(process.cwd(), "tickets.json");

// Utility to read tickets
function readTickets() {
  if (!fs.existsSync(TICKETS_FILE)) return [];
  const data = fs.readFileSync(TICKETS_FILE, "utf8");
  return JSON.parse(data);
}

// Utility to write tickets
function writeTickets(tickets) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

// Generate ticket number sequentially
function generateTicketNumber(tickets) {
  const lastTicket = tickets[tickets.length - 1];
  const lastNumber = lastTicket ? parseInt(lastTicket.ticketNumber) : 0;
  return String(lastNumber + 1).padStart(4, "0");
}

// Submit ticket
app.post("/submit", (req, res) => {
  const tickets = readTickets();
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No items submitted" });
  }

  const ticket = {
    ticketId: nanoid(),
    ticketNumber: generateTicketNumber(tickets),
    items: items.map(i => ({
      name: i.name,
      description: i.description,
      comments: []
    })),
    status: "Searching",
    createdAt: new Date().toISOString()
  };

  tickets.push(ticket);
  writeTickets(tickets);

  res.json({ ticketId: ticket.ticketId, ticketNumber: ticket.ticketNumber });
});

// Get ticket by ID for tracking
app.get("/track/:ticketId", (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.ticketId === req.params.ticketId);
  if (!ticket) return res.status(404).send("Ticket not found");
  res.sendFile(path.join(process.cwd(), "public/track.html"));
});

// Admin dashboard JSON
app.get("/api/tickets", (req, res) => {
  const tickets = readTickets();
  res.json(tickets);
});

// Update ticket status or add comments
app.post("/api/tickets/:ticketId", (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.ticketId === req.params.ticketId);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { status, comment, itemIndex } = req.body;

  if (status) ticket.status = status;
  if (comment && itemIndex != null && ticket.items[itemIndex]) {
    ticket.items[itemIndex].comments.push(comment);
  } else if (comment) {
    ticket.comments = ticket.comments || [];
    ticket.comments.push(comment);
  }

  writeTickets(tickets);
  res.json({ success: true });
});

// Delete ticket
app.delete("/api/tickets/:ticketId", (req, res) => {
  let tickets = readTickets();
  tickets = tickets.filter(t => t.ticketId !== req.params.ticketId);
  writeTickets(tickets);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
