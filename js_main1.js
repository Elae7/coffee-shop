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

function addToCart(id) {
  if (!Object.hasOwn(products, id)) {
    showToast("Не удалось добавить этот товар.");
    return;
  }

  cart.set(id, (cart.get(id) ?? 0) + 1);
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
  renderCart();
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const addButton = event.target.closest(".add-button");
  if (addButton) {
    addToCart(addButton.dataset.productId);
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
  document.documentElement.dataset.theme = nextTheme;
  themeToggle.setAttribute(
    "aria-label",
    nextTheme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"
  );
  document.querySelector('meta[name="theme-color"]').content = nextTheme === "dark" ? "#1e211d" : "#f5f2e9";
});

if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.dataset.theme = "dark";
  themeToggle.setAttribute("aria-label", "Включить светлую тему");
  document.querySelector('meta[name="theme-color"]').content = "#1e211d";
}

checkoutButton.addEventListener("click", () => {
  if (cart.size === 0) return;
  cart.clear();
  renderCart();
  showToast("Заказ принят! Будем ждать тебя в «Крошке».");
});

renderCart();