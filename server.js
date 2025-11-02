import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve kiosk.html and dashboard.html

// In-memory ticket storage
let tickets = [];

// API: submit a new ticket
app.post("/submit", (req, res) => {
  const { name, item, contact } = req.body;
  const id = tickets.length + 1;
  const ticket = { id, name, item, contact, status: "open", time: new Date() };
  tickets.push(ticket);
  res.json({ success: true, ticket });
});

// API: get all tickets (for dashboard)
app.get("/tickets", (req, res) => {
  res.json(tickets);
});

// API: update ticket status
app.post("/update/:id", (req, res) => {
  const { status } = req.body;
  const ticket = tickets.find(t => t.id == req.params.id);
  if (ticket) {
    ticket.status = status;
    res.json({ success: true, ticket });
  } else {
    res.status(404).json({ success: false, message: "Ticket not found" });
  }
});

// Serve kiosk.html by default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "kiosk.html"));
});

// Serve dashboard.html at /dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
