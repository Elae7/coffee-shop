(() => {
  "use strict";

  const products = window.KROSHKA_PRODUCTS;
  const productById = new Map(products.map((product) => [product.id, product]));
  const cartStorageKey = "kroshka-cart";
  const themeStorageKey = "kroshka-theme";
  const categoryNames = { bakery: "Выпечка", drinks: "Напитки", breakfast: "Завтраки" };
  const cart = new Map();
  const formatPrice = (amount) => `${amount.toLocaleString("ru-RU")} ₽`;

  function showToast(message) {
    let region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      document.body.append(region);
    }
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function restoreCart() {
    let saved;
    try {
      saved = localStorage.getItem(cartStorageKey);
      if (saved === null) return;
      const entries = JSON.parse(saved);
      if (!Array.isArray(entries)) throw new TypeError("Корзина должна быть списком.");
      let invalidEntry = false;
      for (const entry of entries) {
        if (!Array.isArray(entry) || typeof entry[0] !== "string" ||
            !productById.has(entry[0]) || !Number.isSafeInteger(entry[1]) || entry[1] < 1) {
          invalidEntry = true;
          continue;
        }
        cart.set(entry[0], entry[1]);
      }
      if (invalidEntry) showToast("Часть старой корзины не удалось восстановить.");
    } catch (error) {
      showToast("Не удалось восстановить корзину из памяти браузера.");
      console.error("Не удалось прочитать сохранённую корзину.", error);
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(Array.from(cart.entries())));
    } catch (error) {
      showToast("Не удалось сохранить корзину в памяти браузера.");
      console.error("Не удалось сохранить корзину.", error);
    }
  }

  function createCartUI() {
    const backdrop = document.createElement("button");
    backdrop.className = "cart-backdrop";
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Закрыть корзину");
    backdrop.hidden = true;

    const drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.id = "cart-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "cart-drawer-title");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    drawer.innerHTML = `
      <div class="cart-drawer-heading">
        <div><p class="eyebrow">ВАШ ВЫБОР</p><h2 id="cart-drawer-title">Корзина <span class="cart-count">0</span></h2></div>
        <button class="icon-button cart-close" type="button" aria-label="Закрыть корзину">×</button>
      </div>
      <div class="cart-drawer-items" aria-live="polite"></div>
      <div class="cart-drawer-footer"><div class="cart-drawer-total"><span>Итого</span><strong>0 ₽</strong></div>
        <a class="button button-primary cart-checkout" href="order.html">Оформить заказ <span aria-hidden="true">↗</span></a>
        <p>Самовывоз из кофейни · оплата на месте</p>
      </div>`;
    document.body.append(backdrop, drawer);

    let floatingTrigger = null;
    if (!document.querySelector("[data-menu-grid]")) {
      floatingTrigger = document.createElement("button");
      floatingTrigger.className = "floating-cart-toggle";
      floatingTrigger.type = "button";
      floatingTrigger.setAttribute("aria-label", "Открыть корзину");
      floatingTrigger.innerHTML = '<span aria-hidden="true">🛒</span><span>Корзина</span><span class="floating-cart-count">0</span>';
      document.body.append(floatingTrigger);
    }

    const trigger = document.querySelector(".cart-toggle");
    const close = drawer.querySelector(".cart-close");
    function setOpen(open) {
      backdrop.hidden = !open;
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      drawer.inert = !open;
      document.body.classList.toggle("cart-open", open);
      if (open) close.focus();
      else (trigger ?? floatingTrigger)?.focus();
    }
    trigger?.addEventListener("click", () => setOpen(true));
    floatingTrigger?.addEventListener("click", () => setOpen(true));
    close.addEventListener("click", () => setOpen(false));
    backdrop.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) setOpen(false);
    });
    drawer.querySelector(".cart-checkout").addEventListener("click", (event) => {
      if (cart.size === 0) {
        event.preventDefault();
        showToast("Сначала добавьте что-нибудь в корзину.");
        return;
      }
      setOpen(false);
    });
    return { drawer, setOpen };
  }

  const cartUI = createCartUI();

  function makeButton(label, action, productId, className = "quantity-button") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.cartAction = action;
    button.dataset.productId = productId;
    button.setAttribute("aria-label", `${action === "increase" ? "Добавить ещё" : "Уменьшить количество"}: ${label}`);
    button.textContent = action === "increase" ? "+" : "−";
    return button;
  }

  function renderCart() {
    const count = Array.from(cart.values()).reduce((sum, quantity) => sum + quantity, 0);
    const total = Array.from(cart.entries()).reduce((sum, [id, quantity]) => sum + productById.get(id).price * quantity, 0);
    document.querySelectorAll(".header-cart-count, .cart-count, .floating-cart-count").forEach((element) => {
      element.textContent = String(count);
      element.setAttribute("aria-label", `Товаров в корзине: ${count}`);
    });

    const container = cartUI.drawer.querySelector(".cart-drawer-items");
    cartUI.drawer.querySelector(".cart-drawer-total strong").textContent = formatPrice(total);
    if (cart.size === 0) {
      const empty = document.createElement("p");
      empty.className = "cart-empty";
      empty.textContent = "Корзина пока пуста. Загляните в меню за чем-нибудь вкусным.";
      container.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const [id, quantity] of cart) {
      const product = productById.get(id);
      const row = document.createElement("div");
      row.className = "cart-row";
      const icon = document.createElement("span");
      icon.className = "cart-row-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = product.icon;
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = product.name;
      const price = document.createElement("span");
      price.textContent = `${formatPrice(product.price)} · ${quantity} шт.`;
      details.append(name, price);
      const controls = document.createElement("div");
      controls.className = "quantity-control";
      controls.append(makeButton(product.name, "decrease", id));
      const value = document.createElement("span");
      value.textContent = String(quantity);
      controls.append(value, makeButton(product.name, "increase", id));
      row.append(icon, details, controls);
      fragment.append(row);
    }
    container.replaceChildren(fragment);
  }

  function updateCart(change) {
    const { id, amount } = change;
    if (!productById.has(id)) return;
    const next = (cart.get(id) ?? 0) + amount;
    if (next <= 0) cart.delete(id);
    else cart.set(id, next);
    saveCart();
    renderCart();
    document.dispatchEvent(new CustomEvent("kroshka:cart-change"));
  }

  function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.category = product.category;

    const art = document.createElement("div");
    art.className = "product-art";
    const icon = document.createElement("span");
    icon.className = "product-art-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = product.icon;
    art.append(icon);
    if (product.badge) {
      const badge = document.createElement("span");
      badge.className = "product-badge";
      badge.textContent = product.badge;
      art.append(badge);
    }

    const details = document.createElement("div");
    details.className = "product-details";
    const category = document.createElement("span");
    category.className = "product-kind";
    category.textContent = categoryNames[product.category];
    const title = document.createElement("h3");
    title.textContent = product.name;
    const price = document.createElement("strong");
    price.className = "product-price";
    price.textContent = formatPrice(product.price);
    details.append(category, title, price);

    const footer = document.createElement("div");
    footer.className = "product-footer";
    const description = document.createElement("p");
    description.textContent = product.description;
    const add = document.createElement("button");
    add.type = "button";
    add.className = "add-button";
    add.dataset.productId = product.id;
    add.setAttribute("aria-label", `Добавить ${product.name} в корзину`);
    add.textContent = "Добавить";
    footer.append(description, add);
    card.append(art, details, footer);
    return card;
  }

  function renderProductLists() {
    document.querySelectorAll("[data-product-list]").forEach((list) => {
      const ids = list.dataset.productIds?.split(",").map((id) => id.trim());
      const featured = ids ? ids.map((id) => productById.get(id)).filter(Boolean) : products;
      list.replaceChildren(...featured.map(createProductCard));
    });
  }

  function setupMenuControls() {
    const grid = document.querySelector("[data-menu-grid]");
    if (!grid) return;
    const search = document.querySelector("#menu-search");
    const sort = document.querySelector("#menu-sort");
    const tabs = Array.from(document.querySelectorAll(".category-tab"));
    const empty = document.querySelector(".no-results");
    let activeCategory = "all";

    function applyFilters() {
      const query = search.value.trim().toLocaleLowerCase("ru");
      let visible = products.filter((product) =>
        (activeCategory === "all" || product.category === activeCategory) &&
        [product.name, product.description, categoryNames[product.category], ...(product.keywords ?? [])]
          .some((value) => value.toLocaleLowerCase("ru").includes(query))
      );
      if (sort.value === "price-asc") visible.sort((a, b) => a.price - b.price);
      else if (sort.value === "price-desc") visible.sort((a, b) => b.price - a.price);
      else if (sort.value === "name") visible.sort((a, b) => a.name.localeCompare(b.name, "ru"));
      else visible.sort((a, b) => a.popular - b.popular);

      grid.replaceChildren(...visible.map(createProductCard));
      empty.hidden = visible.length > 0;
    }

    tabs.forEach((tab) => tab.addEventListener("click", () => {
      activeCategory = tab.dataset.category;
      tabs.forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      applyFilters();
    }));
    search.addEventListener("input", applyFilters);
    sort.addEventListener("change", applyFilters);
    applyFilters();
  }

  function setupNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;
    function close() {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть навигацию");
      nav.classList.remove("is-open");
    }
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть навигацию" : "Открыть навигацию");
      nav.classList.toggle("is-open", open);
    });
    nav.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  function setupTheme() {
    const toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;
    let theme = "dark";
    try {
      const saved = localStorage.getItem(themeStorageKey);
      if (saved === "light" || saved === "dark") theme = saved;
    } catch (error) {
      showToast("Не удалось восстановить тему; включена тёмная.");
      console.error("Не удалось прочитать сохранённую тему.", error);
    }

    function apply(value) {
      document.documentElement.dataset.theme = value;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", value === "dark" ? "#211b16" : "#f5eee3");
      toggle.setAttribute("aria-label", value === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
      toggle.querySelector("span").textContent = value === "dark" ? "☼" : "☾";
    }
    apply(theme);
    toggle.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      apply(theme);
      try {
        localStorage.setItem(themeStorageKey, theme);
      } catch (error) {
        showToast("Тема сменена, но не сохранена в браузере.");
        console.error("Не удалось сохранить тему.", error);
      }
    });
  }

  function setupOpenStatus() {
    const status = document.querySelector("[data-open-status]");
    if (!status) return;
    const hour = new Date().getHours();
    const open = hour >= 8 && hour < 21;
    status.textContent = open ? "Открыты сейчас · до 21:00" : "Сейчас закрыто · ждём вас с 8:00";
    status.classList.toggle("is-open", open);
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const addButton = event.target.closest(".add-button");
    if (addButton) {
      updateCart({ id: addButton.dataset.productId, amount: 1 });
      showToast(`${productById.get(addButton.dataset.productId)?.name ?? "Товар"} добавлен в корзину.`);
      return;
    }
    const combo = event.target.closest("[data-combo]");
    if (combo) {
      combo.dataset.combo.split(",").forEach((id) => updateCart({ id, amount: 1 }));
      showToast("Сочетание добавлено в корзину.");
      return;
    }
    const quantity = event.target.closest("[data-cart-action]");
    if (quantity) updateCart({ id: quantity.dataset.productId, amount: quantity.dataset.cartAction === "increase" ? 1 : -1 });
  });

  document.addEventListener("kroshka:cart-cleared", () => {
    cart.clear();
    renderCart();
  });

  restoreCart();
  setupNavigation();
  setupTheme();
  setupOpenStatus();
  renderProductLists();
  setupMenuControls();
  renderCart();
  document.querySelectorAll(".current-year").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
