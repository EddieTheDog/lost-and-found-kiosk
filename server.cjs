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

// Helper to read/write tickets
function readTickets() {
  if (!fs.existsSync(TICKETS_FILE)) return [];
  return JSON.parse(fs.readFileSync(TICKETS_FILE));
}

function writeTickets(tickets) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

// Kiosk form submission
app.post("/submit", async (req, res) => {
  const { name, email, items } = req.body;
  const tickets = readTickets();
  const ticketId = Date.now();
  const ticket = { id: ticketId, name, email, items, status: "Submitted", comments: [] };
  tickets.push(ticket);
  writeTickets(tickets);

  // Generate QR code for tracking
  const qrUrl = `https://${req.headers.host}/track.html?id=${ticketId}`;
  const qrCode = await QRCode.toDataURL(qrUrl);

  // Send email
  if (email) {
    const transporter = nodemailer.createTransport({
      // Add your email config here (Gmail, etc.)
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Lost & Found Ticket Submitted",
      html: `Your ticket ID: ${ticketId}<br>Track here: <a href="${qrUrl}">${qrUrl}</a><br><img src="${qrCode}">`
    });
  }

  res.send({ success: true, qrCode });
});

// Admin dashboard data
app.get("/dashboard-data", (req, res) => {
  const tickets = readTickets();
  res.json(tickets);
});

// Update ticket
app.post("/update-ticket", (req, res) => {
  const { id, status, comment } = req.body;
  const tickets = readTickets();
  const ticket = tickets.find(t => t.id == id);
  if (ticket) {
    if (status) ticket.status = status;
    if (comment) ticket.comments.push(comment);
    writeTickets(tickets);
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Ticket not found" });
  }
});

// Delete ticket
app.post("/delete-ticket", (req, res) => {
  const { id } = req.body;
  let tickets = readTickets();
  tickets = tickets.filter(t => t.id != id);
  writeTickets(tickets);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
