const express = require("express");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(process.cwd(), "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const TICKETS_FILE = path.join(process.cwd(), "tickets.json");

// Helper: load tickets
function loadTickets() {
  if (!fs.existsSync(TICKETS_FILE)) return [];
  const data = fs.readFileSync(TICKETS_FILE);
  return JSON.parse(data || "[]");
}

// Helper: save tickets
function saveTickets(tickets) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

// --- Kiosk submit route ---
app.post("/submit", async (req, res) => {
  const { items, name, email } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "You must enter at least one item." });
  }

  const tickets = loadTickets();

  const ticketId = nanoid(6);
  const ticketNumber = tickets.length + 1;

  const ticket = {
    id: ticketId,
    number: ticketNumber,
    name: name || "Anonymous",
    email: email || "",
    items,
    status: "submitted",
    comments: [],
    createdAt: new Date().toISOString()
  };

  tickets.push(ticket);
  saveTickets(tickets);

  // Generate QR code
  const qrUrl = `https://${req.headers.host}/track/${ticketId}`;
  const qrData = await QRCode.toDataURL(qrUrl);

  res.json({ ticket, qr: qrData, url: qrUrl });
});

// --- Track ticket route ---
app.get("/track/:id", (req, res) => {
  const tickets = loadTickets();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).send("Ticket not found");

  res.sendFile(path.join(__dirname, "public", "track.html"));
});

// --- Admin dashboard ---
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// --- API to get tickets ---
app.get("/api/tickets", (req, res) => {
  const tickets = loadTickets();
  res.json(tickets);
});

// --- API to update ticket ---
app.post("/api/tickets/:id", (req, res) => {
  const tickets = loadTickets();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { status, comments } = req.body;
  if (status) ticket.status = status;
  if (comments) ticket.comments.push(comments);

  saveTickets(tickets);
  res.json(ticket);
});

// --- API to delete ticket ---
app.delete("/api/tickets/:id", (req, res) => {
  let tickets = loadTickets();
  tickets = tickets.filter(t => t.id !== req.params.id);
  saveTickets(tickets);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
