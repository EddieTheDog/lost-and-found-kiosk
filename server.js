import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let tickets = [];

// Nodemailer config for email notifications
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Submit new ticket
app.post("/submit", async (req, res) => {
  const { name, contact, items } = req.body;
  if (!name || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Name and at least one item are required." });
  }

  const id = tickets.length + 1;
  const ticket = { id, name, contact, items, status: "open", time: new Date() };
  tickets.push(ticket);

  // Send email confirmation if contact provided
  if (contact) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: contact,
      subject: `Lost & Found Ticket #${id}`,
      text: `Hi ${name},\n\nYour ticket has been submitted.\nTicket ID: ${id}\nTrack status here: https://your-service.onrender.com/track/${id}\n\nThank you!`
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.log(err);
      else console.log("Email sent: " + info.response);
    });
  }

  res.json({ success: true, ticket });
});

// Get all tickets
app.get("/tickets", (req, res) => {
  res.json(tickets);
});

// Update ticket status
app.post("/update/:id", (req, res) => {
  const { status, note } = req.body;
  const ticket = tickets.find(t => t.id == req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
  if (status) ticket.status = status;
  if (note) ticket.items.push({ name: "Admin note", description: note });
  res.json({ success: true, ticket });
});

// Serve kiosk, dashboard, and tracking pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "kiosk.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));
app.get("/track/:id?", (req, res) => res.sendFile(path.join(__dirname, "track.html")));

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
