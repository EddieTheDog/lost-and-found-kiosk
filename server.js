import express from "express";
import fs from "fs-extra";
import path from "path";
import bodyParser from "body-parser";
import QRCode from "qrcode";
import nodemailer from "nodemailer";

const app = express();
const PORT = process.env.PORT || 10000;
const TICKETS_FILE = path.join("./tickets.json");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Ensure tickets.json exists
const loadTickets = async () => {
  if (!(await fs.pathExists(TICKETS_FILE))) {
    await fs.writeJson(TICKETS_FILE, []);
  }
  return fs.readJson(TICKETS_FILE);
};

const saveTickets = async (tickets) => {
  await fs.writeJson(TICKETS_FILE, tickets, { spaces: 2 });
};

// Nodemailer setup (example with Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------- ROUTES ----------------

// Kiosk form submission
app.post("/submit", async (req, res) => {
  const { name, email, items } = req.body;
  if (!name || !email || !items || items.length === 0) {
    return res.status(400).send("Missing required fields.");
  }

  const tickets = await loadTickets();
  const id = Date.now();
  const ticket = {
    id,
    name,
    email,
    items,
    comments: [],
    status: "Submitted",
    createdAt: new Date().toISOString(),
  };
  tickets.push(ticket);
  await saveTickets(tickets);

  // Generate QR code
  const url = `${req.protocol}://${req.get("host")}/track/${id}`;
  const qrDataURL = await QRCode.toDataURL(url);

  // Send email
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Lost & Found Ticket #${id}`,
      html: `<p>Your ticket has been submitted.</p>
             <p>Track it here: <a href="${url}">${url}</a></p>
             <img src="${qrDataURL}" alt="QR Code" />`,
    });
  } catch (err) {
    console.error("Email send error:", err);
  }

  res.json({ ticketId: id, qr: qrDataURL });
});

// Admin dashboard data
app.get("/api/tickets", async (req, res) => {
  const tickets = await loadTickets();
  res.json(tickets);
});

// Update ticket
app.post("/api/tickets/:id", async (req, res) => {
  const tickets = await loadTickets();
  const ticket = tickets.find((t) => t.id === parseInt(req.params.id));
  if (!ticket) return res.status(404).send("Ticket not found");

  const { status, comments } = req.body;
  if (status) ticket.status = status;
  if (comments) ticket.comments.push(...comments);

  await saveTickets(tickets);
  res.json(ticket);
});

// Delete ticket
app.delete("/api/tickets/:id", async (req, res) => {
  let tickets = await loadTickets();
  tickets = tickets.filter((t) => t.id !== parseInt(req.params.id));
  await saveTickets(tickets);
  res.sendStatus(200);
});

// Ticket tracking page
app.get("/track/:id", async (req, res) => {
  const tickets = await loadTickets();
  const ticket = tickets.find((t) => t.id === parseInt(req.params.id));
  if (!ticket) return res.status(404).send("Ticket not found");
  res.json(ticket);
});

// Serve dashboard and kiosk HTML
app.get("/dashboard", (req, res) =>
  res.sendFile(path.join("./public/dashboard.html"))
);
app.get("/", (req, res) =>
  res.sendFile(path.join("./public/kiosk.html"))
);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
