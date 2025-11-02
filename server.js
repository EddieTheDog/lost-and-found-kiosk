const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 10000;
const TICKETS_FILE = path.join(__dirname, "tickets.json");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Ensure tickets.json exists
if (!fs.existsSync(TICKETS_FILE)) {
  fs.writeFileSync(TICKETS_FILE, "[]", "utf8");
}

// Helper to read tickets
const readTickets = () => JSON.parse(fs.readFileSync(TICKETS_FILE, "utf8"));

// Helper to write tickets
const writeTickets = (tickets) =>
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));

// --- Routes ---

// Root route serves the kiosk
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "kiosk.html"));
});

// Track ticket by ID
app.get("/track/:id", (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find((t) => t.id == req.params.id);

  if (!ticket) {
    return res.send("Ticket not found.");
  }

  res.send(`
    <h2>Ticket ID: ${ticket.id}</h2>
    <p>Status: ${ticket.status}</p>
    <p>Email: ${ticket.email}</p>
    <p>Items:</p>
    <ul>
      ${ticket.items.map((item) => `<li>${item.name}: ${item.description}</li>`).join("")}
    </ul>
    <p>Comments:</p>
    <ul>
      ${ticket.comments.map((c) => `<li>${c}</li>`).join("")}
    </ul>
  `);
});

// Admin dashboard route
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Submit a new ticket
app.post("/submit", async (req, res) => {
  const { name, email, items } = req.body;
  const tickets = readTickets();
  const newTicket = {
    id: tickets.length + 1,
    name,
    email,
    items: items || [],
    comments: [],
    status: "Submitted",
  };
  tickets.push(newTicket);
  writeTickets(tickets);

  // Generate QR code for tracking
  const url = `https://${req.headers.host}/track/${newTicket.id}`;
  const qr = await QRCode.toDataURL(url);

  // Send email (configure your SMTP)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Lost & Found Ticket Created",
    html: `<p>Hi ${name},</p>
           <p>Your ticket ID is ${newTicket.id}</p>
           <p>Track your ticket here: <a href="${url}">${url}</a></p>
           <img src="${qr}" alt="QR Code">`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error(err);
    else console.log("Email sent: " + info.response);
  });

  res.json({ success: true, ticketId: newTicket.id, qr });
});

// Update ticket (admin)
app.post("/update/:id", (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find((t) => t.id == req.params.id);
  if (!ticket) return res.status(404).send("Ticket not found");

  const { status, comment } = req.body;
  if (status) ticket.status = status;
  if (comment) ticket.comments.push(comment);

  writeTickets(tickets);
  res.send("Ticket updated successfully");
});

// Delete ticket (admin)
app.post("/delete/:id", (req, res) => {
  let tickets = readTickets();
  tickets = tickets.filter((t) => t.id != req.params.id);
  writeTickets(tickets);
  res.send("Ticket deleted successfully");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
