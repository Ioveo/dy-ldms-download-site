const tabs = [...document.querySelectorAll("[data-extension-tab]")];
const cards = [...document.querySelectorAll("[data-extension-card]")];
const row = document.querySelector("[data-extension-row]");

if (tabs.length && cards.length && row) {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => focusExtension(tab.dataset.extensionTab));
  });
}

function focusExtension(key) {
  const card = cards.find(item => item.dataset.extensionCard === key);
  if (!card) return;

  tabs.forEach(tab => tab.classList.toggle("is-active", tab.dataset.extensionTab === key));
  cards.forEach(item => item.classList.toggle("is-focused", item === card));

  row.scrollTo({
    left: card.offsetLeft - row.offsetLeft,
    behavior: "smooth"
  });
}
