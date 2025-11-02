import express from "express";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

const app = express();
const PORT = 10000;

const ticketsFile = path.join(process.cwd(), "tickets.json");

// Middleware
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.json());

// Helper to read/write tickets
function readTickets() {
  try {
    const data = fs.readFileSync(ticketsFile);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveTickets(tickets) {
  fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2));
}

// Submit a new ticket
app.post("/api/tickets", async (req, res) => {
  const tickets = readTickets();
  const newTicket = {
    id: Date.now(),
    name: req.body.name,
    email: req.body.email,
    items: req.body.items,
    status: "Searching",
    comments: [],
  };

  // Generate QR code
  newTicket.qr = await QRCode.toDataURL(`https://lost-and-found-kiosk.onrender.com/track/${newTicket.id}`);

  tickets.push(newTicket);
  saveTickets(tickets);

  // Send email notification
  try {
    const transporter = nodemailer.createTransport({
      // configure your email service
      service: "gmail",
      auth: {
        user: "YOUR_EMAIL@gmail.com",
        pass: "YOUR_EMAIL_PASSWORD",
      },
    });

    await transporter.sendMail({
      from: '"Lost & Found" <YOUR_EMAIL@gmail.com>',
      to: newTicket.email,
      subject: "Lost & Found Ticket Created",
      html: `Your ticket ID: ${newTicket.id}<br>
             Track your ticket: <a href="https://lost-and-found-kiosk.onrender.com/track/${newTicket.id}">Track Here</a>
             <br><img src="${newTicket.qr}" />`,
    });
  } catch (e) {
    console.log("Email error:", e);
  }

  res.json(newTicket);
});

// Get all tickets (admin)
app.get("/api/tickets", (req, res) => {
  const tickets = readTickets();
  res.json(tickets);
});

// Update ticket (status, comments)
app.post("/api/tickets/update", (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.id === req.body.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  if (req.body.status) ticket.status = req.body.status;
  if (req.body.comment) ticket.comments.push(req.body.comment);

  saveTickets(tickets);
  res.json(ticket);
});

// Delete ticket
app.post("/api/tickets/delete", (req, res) => {
  let tickets = readTickets();
  tickets = tickets.filter(t => t.id !== req.body.id);
  saveTickets(tickets);
  res.json({ success: true });
});

// Track ticket by ID
app.get("/track/:id", (req, res) => {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.id === Number(req.params.id));
  if (!ticket) return res.send("Ticket not found");
  res.send(`
    <h1>Ticket ID: ${ticket.id}</h1>
    <p>Name: ${ticket.name}</p>
    <p>Status: ${ticket.status}</p>
    <p>Items: ${JSON.stringify(ticket.items)}</p>
    <p>Comments: ${ticket.comments.join(", ")}</p>
  `);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
