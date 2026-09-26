(() => {
  "use strict";

  const form = document.querySelector("#order-form");
  if (!form) return;

  const products = new Map(window.KROSHKA_PRODUCTS.map((product) => [product.id, product]));
  const cartKey = "kroshka-cart";
  const historyKey = "kroshka-last-order";
  const nameInput = form.elements.namedItem("customerName");
  const phoneInput = form.elements.namedItem("phone");
  const submitButton = form.querySelector('[type="submit"]');
  const summary = document.querySelector(".order-summary-list");
  const totalElement = document.querySelector(".order-total strong");
  const messageElement = document.querySelector(".form-message");
  const success = document.querySelector(".order-success");
  const successTitle = document.querySelector("#success-title");
  let completedOrder = null;

  function readCart() {
    try {
      const value = localStorage.getItem(cartKey);
      if (!value) return [];
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new TypeError("Корзина должна быть списком.");
      return parsed.filter((entry) =>
        Array.isArray(entry) && typeof entry[0] === "string" &&
        products.has(entry[0]) && Number.isSafeInteger(entry[1]) && entry[1] > 0
      );
    } catch (error) {
      console.error("Не удалось загрузить корзину для оформления заказа.", error);
      return [];
    }
  }

  function formatPrice(value) {
    return `${value.toLocaleString("ru-RU")} ₽`;
  }

  function getOrderItems() {
    return readCart().map(([id, quantity]) => {
      const product = products.get(id);
      return { id, name: product.name, quantity, price: product.price, lineTotal: product.price * quantity };
    });
  }

  function renderSummary() {
    const items = getOrderItems();
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const row = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = `${item.name} ×${item.quantity}`;
      const price = document.createElement("strong");
      price.textContent = formatPrice(item.lineTotal);
      row.append(name, price);
      fragment.append(row);
    }
    summary.replaceChildren(fragment);
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    totalElement.textContent = formatPrice(total);
    const empty = items.length === 0;
    submitButton.disabled = empty || !form.checkValidity();
    document.querySelector(".order-empty")?.toggleAttribute("hidden", !empty);
  }

  function validatePhone() {
    const digits = phoneInput.value.replace(/\D/g, "");
    const valid = digits.length >= 10 && digits.length <= 15;
    phoneInput.setCustomValidity(phoneInput.value.trim() && !valid ? "Введите телефон, содержащий от 10 до 15 цифр." : "");
    return valid;
  }

  function updateSubmitState() {
    nameInput.setCustomValidity(nameInput.value.trim() ? "" : "Введите имя.");
    validatePhone();
    submitButton.disabled = !form.checkValidity() || getOrderItems().length === 0;
  }

  function makeOrder() {
    const items = getOrderItems();
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const number = `KR-${Math.floor(1000 + Math.random() * 9000)}`;
    const time = form.elements.namedItem("pickupTime").value;
    const comment = form.elements.namedItem("comment").value.trim();
    const customerName = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const lines = [
      "НОВЫЙ ЗАКАЗ — КРОШКА",
      `Номер заказа: ${number}`,
      `Имя: ${customerName}`,
      `Телефон: ${phone}`,
      "Получение: Самовывоз — Москва, ул. Пекарская, 12",
      `Время: ${time}`,
      "",
      "Товары:",
      ...items.map((item) => `${item.name} ×${item.quantity} — ${formatPrice(item.lineTotal)}`),
      "",
      `ИТОГО: ${formatPrice(total)}`,
      `Комментарий: ${comment || "—"}`
    ];
    return {
      number,
      date: new Date().toISOString(),
      customerName,
      phone,
      pickupTime: time,
      comment,
      items,
      total,
      message: lines.join("\n")
    };
  }

  function showMessage(message, isError = true) {
    messageElement.textContent = message;
    messageElement.hidden = !message;
    messageElement.classList.toggle("is-error", isError);
    messageElement.classList.toggle("is-success", !isError);
  }

  function saveCompletedOrder(order) {
    try {
      localStorage.setItem(historyKey, JSON.stringify(order));
      localStorage.removeItem(cartKey);
      document.dispatchEvent(new CustomEvent("kroshka:cart-cleared"));
    } catch (error) {
      console.error("Не удалось сохранить локальную историю заказа.", error);
      showMessage("Заказ принят, но сохранить историю на этом устройстве не удалось.");
    }
  }

  function renderSuccess(order, demo) {
    completedOrder = order;
    document.querySelector(".order-layout").hidden = true;
    form.hidden = true;
    success.hidden = false;
    successTitle.textContent = demo ? "Заказ сформирован в демо-режиме" : "Заказ собран!";
    document.querySelector(".success-order-number").textContent = order.number;
    document.querySelector(".success-total").textContent = formatPrice(order.total);
    document.querySelector(".success-caption").textContent = demo
      ? "Для реальной отправки заказа владельцу позже подключите endpoint в order-config.js."
      : "Ваш заказ отправлен. До встречи в «Крошке»!";
    saveCompletedOrder(order);
    renderSummary();
    renderHistory();
  }

  async function copyOrder() {
    if (!completedOrder) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(completedOrder.message);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = completedOrder.message;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Браузер не разрешил копирование.");
      }
      showMessage("Текст заказа скопирован.", false);
    } catch (error) {
      showMessage("Не удалось скопировать заказ. Выделите текст заказа вручную.");
      console.error("Не удалось скопировать заказ.", error);
    }
  }

  function renderHistory() {
    const container = document.querySelector(".last-order");
    let order;
    try {
      order = JSON.parse(localStorage.getItem(historyKey) || "null");
    } catch (error) {
      console.error("Не удалось прочитать последний заказ.", error);
      return;
    }
    if (!order || typeof order.number !== "string" || !Array.isArray(order.items)) return;
    const date = new Date(order.date);
    const items = order.items.slice(0, 3).map((item) => `${item.name} ×${item.quantity}`).join(", ");
    container.hidden = false;
    container.querySelector(".last-order-number").textContent = order.number;
    container.querySelector(".last-order-date").textContent = Number.isNaN(date.valueOf())
      ? "Дата не указана"
      : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
    container.querySelector(".last-order-items").textContent = items;
    container.querySelector(".last-order-total").textContent = formatPrice(order.total);
  }

  form.addEventListener("input", updateSubmitState);
  form.addEventListener("change", updateSubmitState);
  document.addEventListener("kroshka:cart-change", renderSummary);
  document.querySelector(".copy-order").addEventListener("click", copyOrder);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    validatePhone();
    if (!form.reportValidity() || getOrderItems().length === 0) {
      showMessage("Проверьте имя, телефон и состав корзины.");
      return;
    }
    const order = makeOrder();
    const endpoint = window.KROSHKA_ORDER_ENDPOINT.trim();
    if (!endpoint) {
      renderSuccess(order, true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Отправляем…";
    showMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ ...order, subject: `Новый заказ ${order.number}`, message: order.message })
      });
      if (!response.ok) throw new Error(`Сервис ответил статусом ${response.status}.`);
      renderSuccess(order, false);
    } catch (error) {
      showMessage("Не удалось отправить заказ. Корзина сохранена — попробуйте ещё раз позже.");
      console.error("Ошибка отправки заказа.", error);
    } finally {
      submitButton.textContent = "Оформить заказ";
      updateSubmitState();
    }
  });

  renderSummary();
  renderHistory();
  updateSubmitState();
})();
