// Kiosk
const ticketForm = document.getElementById("ticketForm");
const addItemBtn = document.getElementById("addItemBtn");
const itemsContainer = document.getElementById("itemsContainer");

if (addItemBtn) {
  addItemBtn.addEventListener("click", () => {
    const div = document.createElement("div");
    div.classList.add("item-entry");
    div.innerHTML = `
      <input type="text" name="itemName" placeholder="Item Name" required>
      <input type="text" name="itemDescription" placeholder="Item Description" required>
    `;
    itemsContainer.appendChild(div);
  });
}

if (ticketForm) {
  ticketForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(ticketForm);
    const items = [];
    const itemNames = formData.getAll("itemName");
    const itemDescriptions = formData.getAll("itemDescription");
    itemNames.forEach((name, i) => items.push({ name, description: itemDescriptions[i] }));

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        items
      })
    });

    const data = await res.json();
    alert(`Ticket created! Track it here: https://lost-and-found-kiosk.onrender.com/track/${data.id}`);
    ticketForm.reset();
    itemsContainer.innerHTML = `<div class="item-entry">
      <input type="text" name="itemName" placeholder="Item Name" required>
      <input type="text" name="itemDescription" placeholder="Item Description" required>
    </div>`;
  });
}

// Admin dashboard
async function loadTickets() {
  const ticketsList = document.getElementById("ticketsList");
  if (!ticketsList) return;
  const res = await fetch("/api/tickets");
  const tickets = await res.json();
  ticketsList.innerHTML = tickets.map(t => `
    <div class="ticket">
      <h3>ID: ${t.id} - ${t.name} (${t.status})</h3>
      <p>Email: ${t.email}</p>
      <p>Items: ${t.items.map(i => `${i.name}: ${i.description}`).join(", ")}</p>
      <p>Comments: ${t.comments.join(", ")}</p>
      <button onclick="updateStatus(${t.id}, 'Located')">Set Located</button>
      <button onclick="deleteTicket(${t.id})">Delete</button>
    </div>
  `).join("");
}

async function updateStatus(id, status) {
  await fetch("/api/tickets/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status })
  });
  loadTickets();
}

async function deleteTicket(id) {
  await fetch("/api/tickets/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  loadTickets();
}

loadTickets();
