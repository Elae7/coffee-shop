const products = {
  croissant: { name: "Круассан классический", price: 190 },
  cinnamon: { name: "Улитка с корицей", price: 220 },
  cookie: { name: "Печенье с шоколадом", price: 160 },
  tart: { name: "Тарт с ягодами", price: 290 },
  latte: { name: "Латте", price: 240 },
  matcha: { name: "Матча-тоник", price: 310 },
  cocoa: { name: "Какао с маршмеллоу", price: 260 },
  toast: { name: "Тост с авокадо", price: 390 }
};

const cart = new Map();
const cartItems = document.querySelector(".cart-items");
const cartCount = document.querySelector(".cart-count");
const cartTotal = document.querySelector(".cart-subtotal strong");
const checkoutButton = document.querySelector(".checkout-button");
const toastRegion = document.querySelector(".toast-region");
const categoryTabs = document.querySelectorAll(".category-tab");
const productCards = document.querySelectorAll(".product-card");
const noResults = document.querySelector(".no-results");
const themeToggle = document.querySelector(".theme-toggle");
const cartStorageKey = "kroshka-cart";
const themeStorageKey = "kroshka-theme";

function formatPrice(amount) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastRegion.append(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 2600);
}

function restoreCart() {
  let savedCart;
  try {
    savedCart = localStorage.getItem(cartStorageKey);
  } catch {
    showToast("Не удалось прочитать корзину из памяти браузера.");
    return;
  }

  if (savedCart === null) return;

  let entries;
  try {
    entries = JSON.parse(savedCart);
  } catch {
    showToast("Не удалось восстановить сохранённую корзину.");
    return;
  }

  if (!Array.isArray(entries)) {
    showToast("Не удалось восстановить сохранённую корзину.");
    return;
  }

  let skippedEntries = false;
  entries.forEach((entry) => {
    if (
      !Array.isArray(entry) ||
      typeof entry[0] !== "string" ||
      !Object.hasOwn(products, entry[0]) ||
      !Number.isSafeInteger(entry[1]) ||
      entry[1] < 1
    ) {
      skippedEntries = true;
      return;
    }

    cart.set(entry[0], entry[1]);
  });

  if (skippedEntries) showToast("Некоторые товары из сохранённой корзины не удалось восстановить.");
}

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(Array.from(cart.entries())));
  } catch {
    showToast("Не удалось сохранить корзину в памяти браузера.");
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"
  );
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#191511" : "#f2e7cf";
}

function restoreTheme() {
  let theme = "dark";
  try {
    const savedTheme = localStorage.getItem(themeStorageKey);
    if (savedTheme === "dark" || savedTheme === "light") theme = savedTheme;
  } catch {
    showToast("Не удалось прочитать сохранённую тему; включена тёмная.");
  }
  applyTheme(theme);
}

function saveTheme(theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    showToast("Тема сменена, но сохранить её в браузере не удалось.");
  }
}

function animatePickup(button) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const item = button.closest(".product-card")?.querySelector(".product-art-emoji");
  const inventory = document.querySelector(".cart-count");
  if (!item || !inventory) return;

  const origin = button.getBoundingClientRect();
  const destination = inventory.getBoundingClientRect();
  const pickup = document.createElement("span");
  pickup.className = "pickup-ghost";
  pickup.setAttribute("aria-hidden", "true");
  pickup.textContent = item.textContent;
  pickup.style.left = `${origin.left + origin.width / 2}px`;
  pickup.style.top = `${origin.top + origin.height / 2}px`;
  document.body.append(pickup);

  const offsetX = destination.left + destination.width / 2 - origin.left - origin.width / 2;
  const offsetY = destination.top + destination.height / 2 - origin.top - origin.height / 2;
  const animation = pickup.animate(
    [
      { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1 },
      {
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(.25) rotate(180deg)`,
        opacity: 0.2
      }
    ],
    { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
  animation.addEventListener("finish", () => pickup.remove(), { once: true });
}

function renderCart() {
  const items = Array.from(cart.entries());
  const totalItems = items.reduce((sum, [, quantity]) => sum + quantity, 0);
  const totalPrice = items.reduce((sum, [id, quantity]) => sum + products[id].price * quantity, 0);

  cartCount.textContent = String(totalItems);
  cartCount.setAttribute("aria-label", `Товаров в корзине: ${totalItems}`);
  cartTotal.textContent = formatPrice(totalPrice);
  checkoutButton.disabled = items.length === 0;

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cart-empty";
    empty.innerHTML = '<span class="empty-icon" aria-hidden="true">🥐</span><p>Пока тут крошки.</p><span>Добавь что-нибудь вкусное!</span>';
    cartItems.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const [id, quantity] of items) {
    const product = products[id];
    const row = document.createElement("div");
    row.className = "cart-row";

    const info = document.createElement("div");
    info.className = "cart-row-info";
    const name = document.createElement("div");
    name.className = "cart-row-name";
    name.textContent = product.name;
    const price = document.createElement("div");
    price.className = "cart-row-price";
    price.textContent = `${formatPrice(product.price)} / шт.`;
    info.append(name, price);

    const itemTotal = document.createElement("span");
    itemTotal.className = "cart-row-total";
    itemTotal.textContent = formatPrice(product.price * quantity);

    const controls = document.createElement("div");
    controls.className = "quantity-control";
    controls.setAttribute("aria-label", `Количество: ${product.name}`);
    controls.append(
      createQuantityButton("decrease", id, "−", `Уменьшить количество: ${product.name}`),
      Object.assign(document.createElement("span"), { textContent: String(quantity) }),
      createQuantityButton("increase", id, "+", `Увеличить количество: ${product.name}`)
    );
    row.append(info, itemTotal, controls);
    fragment.append(row);
  }

  cartItems.replaceChildren(fragment);
}

function createQuantityButton(action, id, label, accessibleName) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.cartAction = action;
  button.dataset.productId = id;
  button.setAttribute("aria-label", accessibleName);
  button.textContent = label;
  return button;
}

function addToCart(id, button) {
  if (!Object.hasOwn(products, id)) {
    showToast("Не удалось добавить этот товар.");
    return;
  }

  animatePickup(button);
  cart.set(id, (cart.get(id) ?? 0) + 1);
  saveCart();
  renderCart();
  showToast(`${products[id].name} — в корзине`);
}

function changeQuantity(id, change) {
  const currentQuantity = cart.get(id);
  if (currentQuantity === undefined) return;

  const nextQuantity = currentQuantity + change;
  if (nextQuantity <= 0) {
    cart.delete(id);
  } else {
    cart.set(id, nextQuantity);
  }
  saveCart();
  renderCart();
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const addButton = event.target.closest(".add-button");
  if (addButton) {
    addToCart(addButton.dataset.productId, addButton);
    return;
  }

  const quantityButton = event.target.closest("[data-cart-action]");
  if (quantityButton) {
    const change = quantityButton.dataset.cartAction === "increase" ? 1 : -1;
    changeQuantity(quantityButton.dataset.productId, change);
  }
});

categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.category;
    let visibleCount = 0;

    categoryTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    productCards.forEach((card) => {
      const isVisible = category === "all" || card.dataset.category === category;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    noResults.hidden = visibleCount > 0;
  });
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  saveTheme(nextTheme);
  applyTheme(nextTheme);
});

restoreCart();
restoreTheme();

checkoutButton.addEventListener("click", () => {
  if (cart.size === 0) return;
  cart.clear();
  saveCart();
  renderCart();
  showToast("Заказ принят! Будем ждать тебя в «Крошке».");
});

renderCart();