document.getElementById("addItem").addEventListener("click", () => {
  const container = document.getElementById("itemsContainer");
  const index = container.children.length / 2;
  const nameInput = document.createElement("input");
  nameInput.name = `items[${index}][name]`;
  nameInput.placeholder = "Item Name";
  nameInput.required = true;

  const descInput = document.createElement("input");
  descInput.name = `items[${index}][description]`;
  descInput.placeholder = "Item Description";

  container.appendChild(nameInput);
  container.appendChild(descInput);
});

document.getElementById("kioskForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const obj = { name: data.get("name"), email: data.get("email"), items: [] };

  for (let pair of data.entries()) {
    if (pair[0].startsWith("items")) {
      const match = pair[0].match(/items\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const i = parseInt(match[1]);
        const key = match[2];
        if (!obj.items[i]) obj.items[i] = {};
        obj.items[i][key] = pair[1];
      }
    }
  }

  const res = await fetch("/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  });

  const result = await res.json();
  if (result.success) {
    document.getElementById("qrResult").innerHTML = `<h3>Ticket Submitted!</h3><img src="${result.qrCode}">`;
    form.reset();
  }
});
