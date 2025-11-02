const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Submit ticket route
app.post("/submit-ticket", async (req, res) => {
  const ticketsPath = path.join(__dirname, "tickets.json");
  let tickets = [];

  if (fs.existsSync(ticketsPath)) {
    tickets = JSON.parse(fs.readFileSync(ticketsPath, "utf-8"));
  }

  const newTicket = {
    id: tickets.length + 1,
    ...req.body,
    status: "Submitted",
    comments: []
  };
  tickets.push(newTicket);
  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));

  // Generate QR code for the ticket
  const ticketURL = `${req.protocol}://${req.get('host')}/track?id=${newTicket.id}`;
  try {
    const qrCodeDataURL = await QRCode.toDataURL(ticketURL);
    newTicket.qrCode = qrCodeDataURL;
    res.send({ success: true, ticketId: newTicket.id, qrCode: qrCodeDataURL });
  } catch (err) {
    console.error("QR Code generation error:", err);
    res.status(500).send({ success: false, error: "Failed to generate QR code" });
  }
});

// Fetch a single ticket by ID
app.get("/get-ticket", (req, res) => {
  const ticketsPath = path.join(__dirname, "tickets.json");
  const tickets = fs.existsSync(ticketsPath)
    ? JSON.parse(fs.readFileSync(ticketsPath, "utf-8"))
    : [];

  const ticket = tickets.find(t => t.id == req.query.id);
  res.send(ticket || null);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
