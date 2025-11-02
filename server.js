import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let tickets = [];

app.post("/submit", (req, res) => {
  const { name, item, contact } = req.body;
  const id = tickets.length + 1;
  const ticket = { id, name, item, contact, status: "open", time: new Date() };
  tickets.push(ticket);
  res.json({ success: true, ticket });
});

app.get("/tickets", (req, res) => {
  res.json(tickets);
});

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
