import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs-extra";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Persistent ticket storage
const TICKETS_FILE = path.join(__dirname, "tickets.json");
const loadTickets = async () => fs.pathExists(TICKETS_FILE) ? fs.readJson(TICKETS_FILE) : [];
const saveTickets = tickets => fs.writeJson(TICKETS_FILE, tickets, { spaces: 2 });

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Create a new ticket
app.post("/submit", async (req, res) => {
  const { name, contact, items } = req.body;
  if (!name || !contact || !items || items.length === 0) return res.status(400).json({ success: false, message: "Required fields missing" });

  let tickets = await loadTickets();
  const id = tickets.length ? tickets[tickets.length - 1].id + 1 : 1;
  const ticket = { id, name, contact, items, status: "Open", comments: [], time: new Date() };
  tickets.push(ticket);
  await saveTickets(tickets);

  // Generate QR code URL
  const trackUrl = `${process.env.SERVICE_URL || "http://localhost:10000"}/track/${id}`;
  const qrDataURL = await QRCode.toDataURL(trackUrl);

  // Send confirmation email
  if (contact) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: contact,
      subject: `Lost & Found Ticket #${id}`,
      html: `<p>Hi ${name},</p>
             <p>Your ticket has been submitted. Ticket ID: ${id}</p>
             <p>Scan this QR code to track your ticket:</p>
             <img src="${qrDataURL}" alt="QR Code"><br>
             <a href="${trackUrl}">Track your ticket</a>`
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.log(err);
      else console.log("Email sent: " + info.response);
    });
  }

  res.json({ success: true, ticket, qr: qrDataURL });
});

// Get all tickets
app.get("/tickets", async (req, res) => res.json(await loadTickets()));

// Update ticket status or add comment
app.post("/update/:id", async (req, res) => {
  const { status, comment, itemIndex } = req.body;
  let tickets = await loadTickets();
  const ticket = tickets.find(t => t.id == req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

  if (status) ticket.status = status;
  if (comment) {
    if (typeof itemIndex === "number" && ticket.items[itemIndex]) ticket.items[itemIndex].comments = (ticket.items[itemIndex].comments || "") + " | " + comment;
    else ticket.comments.push(comment);
  }

  await saveTickets(tickets);
  res.json({ success: true, ticket });
});

// Delete ticket
app.delete("/delete/:id", async (req, res) => {
  let tickets = await loadTickets();
  tickets = tickets.filter(t => t.id != req.params.id);
  await saveTickets(tickets);
  res.json({ success: true });
});

// Pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "kiosk.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));
app.get("/track/:id?", (req, res) => res.sendFile(path.join(__dirname, "track.html")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
