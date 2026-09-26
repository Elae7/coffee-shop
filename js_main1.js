(() => {
  "use strict";

  const products = window.KROSHKA_PRODUCTS;
  const productById = new Map(products.map((product) => [product.id, product]));
  const cartStorageKey = "kroshka-cart";
  const themeStorageKey = "kroshka-theme";
  const favoritesStorageKey = "kroshka-favorites";
  const recentStorageKey = "kroshka-recently-viewed";
  const categoryNames = { bakery: "Выпечка", drinks: "Напитки", breakfast: "Завтраки" };
  const cart = new Map();
  const favorites = new Set();
  let recentlyViewed = [];
  const formatPrice = (amount) => `${amount.toLocaleString("ru-RU")} ₽`;

  function showToast(message, suggestionId = null) {
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
    const text = document.createElement("span");
    text.textContent = message;
    toast.append(text);
    const suggestion = suggestionId ? productById.get(suggestionId) : null;
    if (suggestion) {
      const pair = document.createElement("button");
      pair.className = "toast-pairing";
      pair.type = "button";
      pair.dataset.productId = suggestion.id;
      pair.textContent = `С чем взять? ${suggestion.name} +`;
      toast.append(pair);
    }
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

  function restoreIds(key, label) {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return [];
      const values = JSON.parse(stored);
      if (!Array.isArray(values)) throw new TypeError(`${label} должны храниться списком.`);
      return values.filter((id) => typeof id === "string" && productById.has(id));
    } catch (error) {
      showToast(`Не удалось восстановить ${label}.`);
      console.error(`Не удалось прочитать ${label}.`, error);
      return [];
    }
  }

  function saveIds(key, values, label) {
    try {
      localStorage.setItem(key, JSON.stringify(values));
    } catch (error) {
      showToast(`Не удалось сохранить ${label}.`);
      console.error(`Не удалось сохранить ${label}.`, error);
    }
  }

  function loadUserLists() {
    restoreIds(favoritesStorageKey, "избранное").forEach((id) => favorites.add(id));
    recentlyViewed = restoreIds(recentStorageKey, "историю просмотров").slice(0, 6);
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
      <section class="cart-recommendations" aria-label="Рекомендации к заказу" hidden></section>
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

    let lastTrigger = null;
    const triggers = document.querySelectorAll(".cart-toggle");
    const close = drawer.querySelector(".cart-close");
    function setOpen(open) {
      backdrop.hidden = !open;
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      drawer.inert = !open;
      document.body.classList.toggle("cart-open", open);
      if (open) close.focus();
      else (lastTrigger ?? floatingTrigger)?.focus();
    }
    triggers.forEach((trigger) => trigger.addEventListener("click", () => {
      lastTrigger = trigger;
      setOpen(true);
    }));
    floatingTrigger?.addEventListener("click", () => {
      lastTrigger = floatingTrigger;
      setOpen(true);
    });
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
      renderCartRecommendations();
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
    renderCartRecommendations();
  }

  function renderCartRecommendations() {
    const section = cartUI.drawer.querySelector(".cart-recommendations");
    const pairings = window.KROSHKA_PAIRINGS;
    const candidates = pairings
      .filter(({ source, suggestion }) => cart.has(source) && !cart.has(suggestion))
      .map(({ suggestion }) => suggestion);
    const fallback = pairings.map(({ suggestion }) => suggestion).filter((id) => !cart.has(id));
    const unique = [...new Set(candidates.length ? candidates : fallback)].slice(0, 2);
    if (!unique.length) {
      section.hidden = true;
      section.replaceChildren();
      return;
    }

    section.hidden = false;
    const heading = document.createElement("h3");
    heading.textContent = "С чем взять?";
    const cards = document.createElement("div");
    cards.className = "cart-recommendation-list";
    unique.forEach((id) => {
      const product = productById.get(id);
      const button = document.createElement("button");
      button.className = "cart-recommendation";
      button.type = "button";
      button.dataset.productId = id;
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = product.icon;
      const name = document.createElement("span");
      name.textContent = product.name;
      const price = document.createElement("strong");
      price.textContent = formatPrice(product.price);
      button.append(icon, name, price);
      cards.append(button);
    });
    section.replaceChildren(heading, cards);
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

  function createProductCard(product, options = {}) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.category = product.category;
    card.dataset.productId = product.id;

    const art = document.createElement("div");
    art.className = "product-art";
    if (product.image) {
      const image = document.createElement("img");
      image.className = "product-photo";
      image.src = product.image;
      image.alt = product.imageAlt ?? product.name;
      image.loading = "lazy";
      image.decoding = "async";
      art.append(image);
    } else {
      const icon = document.createElement("span");
      icon.className = "product-art-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = product.icon;
      art.append(icon);
    }
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
    const actions = document.createElement("div");
    actions.className = "product-actions";
    actions.append(add, createFavoriteButton(product));
    const pairing = window.KROSHKA_PAIRINGS.find((item) => item.source === product.id);
    if (pairing) {
      const companion = productById.get(pairing.suggestion);
      const note = document.createElement("span");
      note.className = "pairing-note";
      note.textContent = `С чем взять: ${companion.name}`;
      footer.append(note);
    }
    if (options.quickView) {
      const quickView = document.createElement("button");
      quickView.type = "button";
      quickView.className = "quick-view-button";
      quickView.dataset.quickView = product.id;
      quickView.textContent = "Быстрый просмотр";
      actions.append(quickView);
    }
    footer.append(description, actions);
    card.append(art, details, footer);
    return card;
  }

  function createFavoriteButton(product) {
    const favorite = document.createElement("button");
    const selected = favorites.has(product.id);
    favorite.type = "button";
    favorite.className = "favorite-button";
    favorite.dataset.favoriteId = product.id;
    favorite.setAttribute("aria-label", selected ? `Убрать ${product.name} из избранного` : `Добавить ${product.name} в избранное`);
    favorite.setAttribute("aria-pressed", String(selected));
    favorite.textContent = selected ? "♥" : "♡";
    return favorite;
  }

  function updateFavoriteButtons() {
    document.querySelectorAll("[data-favorite-id]").forEach((button) => {
      const product = productById.get(button.dataset.favoriteId);
      if (!product) return;
      const selected = favorites.has(product.id);
      button.setAttribute("aria-label", selected ? `Убрать ${product.name} из избранного` : `Добавить ${product.name} в избранное`);
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = selected ? "♥" : "♡";
    });
  }

  function addRecentlyViewed(id) {
    recentlyViewed = [id, ...recentlyViewed.filter((item) => item !== id)].slice(0, 6);
    saveIds(recentStorageKey, recentlyViewed, "историю просмотров");
    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    document.querySelectorAll("[data-recent-list]").forEach((list) => {
      const productsToShow = recentlyViewed.map((id) => productById.get(id)).filter(Boolean);
      const quickView = Boolean(document.querySelector(".product-dialog"));
      list.replaceChildren(...productsToShow.map((product) => createProductCard(product, { quickView })));
      const section = list.closest(".recently-viewed-section");
      if (section) section.hidden = productsToShow.length === 0;
    });
  }

  function renderFavorites() {
    const grids = document.querySelectorAll("[data-favorites-grid]");
    const selected = Array.from(favorites).map((id) => productById.get(id)).filter(Boolean);
    document.querySelectorAll(".favorites-count").forEach((element) => {
      element.textContent = String(selected.length);
      element.setAttribute("aria-label", `Избранных товаров: ${selected.length}`);
    });
    if (!grids.length) return;
    grids.forEach((grid) => grid.replaceChildren(...selected.map((product) => createProductCard(product, { quickView: true }))));
    document.querySelectorAll(".favorites-empty").forEach((empty) => { empty.hidden = selected.length > 0; });
  }

  function renderProductLists() {
    document.querySelectorAll("[data-product-list]").forEach((list) => {
      const ids = list.dataset.productIds?.split(",").map((id) => id.trim());
      const featured = ids ? ids.map((id) => productById.get(id)).filter(Boolean) : products;
      list.replaceChildren(...featured.map((product) => createProductCard(product)));
    });
    renderFavorites();
    renderRecentlyViewed();
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

      grid.replaceChildren(...visible.map((product) => createProductCard(product, { quickView: true })));
      empty.hidden = visible.length > 0;
      renderFavorites();
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
    let theme = "light";
    try {
      const saved = localStorage.getItem(themeStorageKey);
      if (saved === "light" || saved === "dark") theme = saved;
    } catch (error) {
      showToast("Не удалось восстановить тему; включена светлая.");
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

  function setupProductDialog() {
    const dialog = document.querySelector(".product-dialog");
    if (!dialog) return;
    const close = dialog.querySelector(".product-dialog-close");
    const title = dialog.querySelector(".quick-view-title");
    const description = dialog.querySelector(".quick-view-description");
    const category = dialog.querySelector(".quick-view-category");
    const price = dialog.querySelector(".quick-view-price");
    const visual = dialog.querySelector(".quick-view-art");
    const add = dialog.querySelector(".quick-view-add");
    const favoriteSlot = dialog.querySelector(".quick-view-favorite-slot");
    const share = dialog.querySelector(".quick-view-share");
    let activeProduct = null;
    let previousFocus = null;

    function fill(product) {
      activeProduct = product;
      title.textContent = product.name;
      description.textContent = product.description;
      category.textContent = categoryNames[product.category];
      price.textContent = formatPrice(product.price);
      visual.replaceChildren();
      if (product.image) {
        visual.removeAttribute("aria-hidden");
        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.imageAlt ?? product.name;
        image.decoding = "async";
        visual.append(image);
      } else {
        visual.setAttribute("aria-hidden", "true");
        visual.textContent = product.icon;
      }
      favoriteSlot.replaceChildren(createFavoriteButton(product));
    }

    function openProduct(product, focusTarget = null) {
      fill(product);
      addRecentlyViewed(product.id);
      previousFocus = document.querySelector(`[data-quick-view="${product.id}"]`) ?? focusTarget;
      dialog.showModal();
      close.focus();
    }

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("[data-quick-view]");
      const product = button ? productById.get(button.dataset.quickView) : null;
      if (product) openProduct(product, button);
    });

    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => previousFocus?.focus());
    add.addEventListener("click", () => {
      if (!activeProduct) return;
      updateCart({ id: activeProduct.id, amount: 1 });
      showToast(`${activeProduct.name} добавлен в корзину.`);
      dialog.close();
    });
    share.addEventListener("click", async () => {
      if (!activeProduct) return;
      await shareProduct(activeProduct);
    });

    const sharedId = new URLSearchParams(window.location.search).get("product");
    const sharedProduct = sharedId ? productById.get(sharedId) : null;
    if (sharedProduct) openProduct(sharedProduct);
  }

  async function shareProduct(product) {
    const url = new URL("menu.html", window.location.href);
    url.searchParams.set("product", product.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.description, url: url.href });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.href);
      } else {
        const input = document.createElement("textarea");
        input.value = url.href;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Копирование ссылки не удалось.");
      }
      showToast("Ссылка на товар скопирована.");
    } catch (error) {
      if (error.name === "AbortError") return;
      showToast("Не удалось поделиться ссылкой.");
      console.error("Не удалось поделиться товаром.", error);
    }
  }

  function setupTodaySection() {
    const container = document.querySelector("[data-today-product]");
    if (!container) return;
    const product = products.find((item) => item.badge === "Новинка");
    if (!product) {
      container.hidden = true;
      return;
    }
    const card = createProductCard(product);
    container.replaceChildren(card);
  }

  function setupCombos() {
    const list = document.querySelector("[data-combo-list]");
    if (!list) return;
    const cards = window.KROSHKA_COMBOS.map((combo) => {
      const productsInCombo = combo.items.map((id) => productById.get(id)).filter(Boolean);
      const card = document.createElement("article");
      card.className = "combo-card";
      card.dataset.combo = combo.items.join(",");
      const icon = document.createElement("span");
      icon.className = "combo-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = combo.icon;
      const title = document.createElement("p");
      title.className = "eyebrow";
      title.textContent = combo.name;
      const description = document.createElement("h3");
      description.textContent = combo.description;
      const items = document.createElement("p");
      items.className = "combo-items";
      items.textContent = productsInCombo.map((product) => `${product.name} ${formatPrice(product.price)}`).join(" + ");
      const total = productsInCombo.reduce((sum, product) => sum + product.price, 0);
      const note = document.createElement("span");
      note.className = "combo-price-note";
      note.textContent = "Сумма обычных цен · без скидки";
      const price = document.createElement("strong");
      price.className = "combo-price";
      price.textContent = formatPrice(total);
      const button = document.createElement("button");
      button.className = "button button-secondary";
      button.type = "button";
      button.dataset.combo = combo.items.join(",");
      button.textContent = "Добавить набор";
      card.append(icon, title, description, items, note, price, button);
      return card;
    });
    list.replaceChildren(...cards);
  }

  function setupInstallPrompt() {
    const button = document.querySelector(".install-app");
    if (!button) return;
    let promptEvent;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      promptEvent = event;
      button.hidden = false;
    });
    button.addEventListener("click", async () => {
      if (!promptEvent) return;
      await promptEvent.prompt();
      promptEvent = null;
      button.hidden = true;
    });
  }

  function setupOfflineIndicator() {
    let banner = document.querySelector(".offline-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "offline-banner";
      banner.setAttribute("role", "status");
      banner.textContent = "Вы офлайн. Уже загруженное меню и корзина останутся доступны.";
      banner.hidden = true;
      document.body.prepend(banner);
    }
    const update = () => { banner.hidden = navigator.onLine; };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.error("Не удалось установить offline-кэш.", error);
    });
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const addButton = event.target.closest(".add-button");
    if (addButton) {
      updateCart({ id: addButton.dataset.productId, amount: 1 });
      const suggestion = window.KROSHKA_PAIRINGS.find((pair) => pair.source === addButton.dataset.productId)?.suggestion;
      showToast(`${productById.get(addButton.dataset.productId)?.name ?? "Товар"} добавлен в корзину.`, suggestion);
      return;
    }
    const combo = event.target.closest("[data-combo]");
    if (combo) {
      const ids = combo.dataset.combo.split(",").filter((id) => productById.has(id));
      if (ids.length !== combo.dataset.combo.split(",").length) {
        showToast("Не удалось добавить этот набор.");
        return;
      }
      ids.forEach((id) => updateCart({ id, amount: 1 }));
      showToast("Набор добавлен в корзину.");
      return;
    }
    const favorite = event.target.closest("[data-favorite-id]");
    if (favorite) {
      const id = favorite.dataset.favoriteId;
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      saveIds(favoritesStorageKey, Array.from(favorites), "избранное");
      updateFavoriteButtons();
      renderFavorites();
      showToast(favorites.has(id) ? "Добавлено в избранное." : "Удалено из избранного.");
      return;
    }
    const cartSuggestion = event.target.closest(".cart-recommendation");
    if (cartSuggestion) {
      updateCart({ id: cartSuggestion.dataset.productId, amount: 1 });
      showToast("Рекомендация добавлена в корзину.");
      return;
    }
    const toastPair = event.target.closest(".toast-pairing");
    if (toastPair) {
      updateCart({ id: toastPair.dataset.productId, amount: 1 });
      showToast(`${productById.get(toastPair.dataset.productId).name} добавлен в корзину.`);
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
  loadUserLists();
  setupNavigation();
  setupTheme();
  setupOpenStatus();
  renderProductLists();
  setupMenuControls();
  setupProductDialog();
  setupTodaySection();
  setupCombos();
  setupInstallPrompt();
  setupOfflineIndicator();
  registerServiceWorker();
  renderCart();
  document.querySelectorAll(".current-year").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
