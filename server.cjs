// Required modules
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ------------------
// Routes
// ------------------

// Serve kiosk.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "kiosk.html"));
});

// Serve admin dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Serve track page
app.get("/track", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "track.html"));
});

// Handle ticket submission
app.post("/submit-ticket", (req, res) => {
  const ticketsPath = path.join(__dirname, "tickets.json");
  let tickets = [];

  // Load existing tickets if file exists
  if (fs.existsSync(ticketsPath)) {
    tickets = JSON.parse(fs.readFileSync(ticketsPath, "utf-8"));
  }

  // Add new ticket
  const newTicket = {
    id: tickets.length + 1,
    ...req.body,
    status: "Submitted",
    comments: []
  };
  tickets.push(newTicket);

  // Save updated tickets
  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));

  res.send({ success: true, ticketId: newTicket.id });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
