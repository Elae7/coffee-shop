(() => {
  "use strict";

  const form = document.querySelector("#order-form");
  if (!form) return;

  const products = new Map(window.KROSHKA_PRODUCTS.map((product) => [product.id, product]));
  const cartKey = "kroshka-cart";
  const historyKey = "kroshka-last-order";
  const orderStatusLabels = { created: "Создан", sent: "Отправлен", ready: "Готов" };
  const consentField = form.elements.namedItem("dataConsent");
  const consentLabel = form.querySelector(".form-consent");
  const endpointNote = form.querySelector(".endpoint-note");
  const nameInput = form.elements.namedItem("customerName");
  const phoneInput = form.elements.namedItem("phone");
  const submitButton = form.querySelector('[type="submit"]');
  const summary = document.querySelector(".order-summary-list");
  const totalElement = document.querySelector(".order-total strong");
  const messageElement = document.querySelector(".form-message");
  const success = document.querySelector(".order-success");
  const successTitle = document.querySelector("#success-title");
  const advanceStatusButton = document.querySelector(".advance-order-status");
  let orderEndpoint = "";
  let endpointConfigurationError = null;
  let submitting = false;
  let completedOrder = null;

  try {
    const configuredEndpoint = window.KROSHKA_ORDER_ENDPOINT?.trim() ?? "";
    if (configuredEndpoint) {
      const endpoint = new URL(configuredEndpoint);
      if (endpoint.protocol !== "https:" || endpoint.hostname !== "formspree.io" ||
          !/^\/f\/[A-Za-z0-9]+\/?$/.test(endpoint.pathname)) {
        throw new TypeError("Укажите HTTPS URL формы Formspree в формате https://formspree.io/f/идентификатор.");
      }
      orderEndpoint = endpoint.href;
    }
  } catch (error) {
    endpointConfigurationError = error;
    console.error("Некорректная настройка формы заказа.", error);
  }

  if (orderEndpoint) {
    consentLabel.hidden = false;
    consentField.required = true;
    endpointNote.textContent = "После согласия контактные данные и заказ будут переданы Formspree. Платёж на сайте не выполняется.";
  } else if (endpointConfigurationError) {
    endpointNote.textContent = "Настройка отправки некорректна. Заказ не отправляется; проверьте order-config.js.";
  }

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
    submitButton.disabled = submitting || Boolean(endpointConfigurationError) || empty || !form.checkValidity();
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
    submitButton.disabled = submitting || Boolean(endpointConfigurationError) ||
      !form.checkValidity() || getOrderItems().length === 0;
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
    const target = success.hidden ? messageElement : document.querySelector(".success-action-message");
    target.textContent = message;
    target.hidden = !message;
    target.classList.toggle("is-error", isError);
    target.classList.toggle("is-success", !isError);
  }

  async function saveCompletedOrder(order) {
    let historySaved = false;
    let profileHistorySaved = false;
    try {
      localStorage.setItem(historyKey, JSON.stringify(order));
      historySaved = true;
    } catch (error) {
      console.error("Не удалось сохранить историю заказа.", error);
    }
    try {
      await window.KROSHKA_DB.saveOrder(order);
      profileHistorySaved = true;
    } catch (error) {
      console.error("Не удалось сохранить заказ в локальной базе профиля.", error);
    }
    let cartCleared = false;
    try {
      localStorage.removeItem(cartKey);
      cartCleared = true;
      document.dispatchEvent(new CustomEvent("kroshka:cart-cleared"));
    } catch (error) {
      console.error("Не удалось очистить корзину после завершения заказа.", error);
    }
    return { historySaved, profileHistorySaved, cartCleared };
  }

  function renderOrderStatus(order) {
    const steps = ["created", "sent", "ready"];
    const currentIndex = Math.max(0, steps.indexOf(order.deliveryStatus));
    document.querySelectorAll("[data-order-status]").forEach((step) => {
      const index = steps.indexOf(step.dataset.orderStatus);
      step.classList.toggle("is-complete", index < currentIndex);
      step.classList.toggle("is-current", index === currentIndex);
      if (index === currentIndex) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
    document.querySelector(".order-status-note").textContent = order.demo
      ? "Демо-статус хранится только на этом устройстве."
      : order.deliveryStatus === "ready"
        ? "Заказ отмечен готовым на этом устройстве."
        : "Заказ отправлен. Отметку о готовности можно добавить вручную.";
    advanceStatusButton.hidden = order.deliveryStatus === "ready";
    const nextStatus = steps[currentIndex + 1];
    advanceStatusButton.textContent = order.demo
      ? `Демо: отметить «${orderStatusLabels[nextStatus]}»`
      : `Отметить «${orderStatusLabels[nextStatus]}»`;
  }

  async function renderSuccess(order, demo) {
    completedOrder = order;
    order.demo = demo;
    order.deliveryStatus = demo ? "created" : "sent";
    document.querySelector(".order-layout").hidden = true;
    form.hidden = true;
    success.hidden = false;
    successTitle.textContent = demo ? "Заказ создан в демо-режиме" : "Заказ отправлен";
    document.querySelector(".success-order-number").textContent = order.number;
    document.querySelector(".success-total").textContent = formatPrice(order.total);
    const result = await saveCompletedOrder(order);
    document.querySelector(".success-caption").textContent = demo
      ? "Демонстрация: заказ не отправлен в кофейню, а данные остались только в этом браузере."
      : "Заказ принят сервисом Formspree. Оплата на сайте не выполнялась.";
    if (!result.historySaved) {
      document.querySelector(".success-caption").textContent += " Историю не удалось сохранить на этом устройстве.";
    }
    if (!result.profileHistorySaved) {
      document.querySelector(".success-caption").textContent += " Не удалось сохранить запись в истории профиля.";
    }
    if (!result.cartCleared) {
      document.querySelector(".success-caption").textContent += " Не удалось очистить локальную корзину.";
    }
    renderOrderStatus(order);
    renderSummary();
    renderHistory();
  }

  async function advanceOrderStatus() {
    if (!completedOrder) return;
    const steps = ["created", "sent", "ready"];
    const nextStatus = steps[steps.indexOf(completedOrder.deliveryStatus) + 1];
    if (!nextStatus) return;
    completedOrder.deliveryStatus = nextStatus;
    renderOrderStatus(completedOrder);
    try {
      localStorage.setItem(historyKey, JSON.stringify(completedOrder));
    } catch (error) {
      showMessage("Статус обновлён только до закрытия этой страницы.", true);
      console.error("Не удалось сохранить статус заказа.", error);
      return;
    }
    try {
      await window.KROSHKA_DB.saveOrder(completedOrder);
    } catch (error) {
      showMessage("Статус обновлён, но история профиля не синхронизировалась.", true);
      console.error("Не удалось обновить статус заказа в локальной базе профиля.", error);
    }
    renderHistory();
    showMessage(`Статус заказа: ${orderStatusLabels[nextStatus].toLocaleLowerCase("ru")}.`, false);
  }

  async function copyOrder() {
    if (!completedOrder) return;
    try {
      await copyText(completedOrder.message);
      showMessage("Текст заказа скопирован.", false);
    } catch (error) {
      showMessage("Не удалось скопировать заказ. Выделите текст заказа вручную.");
      console.error("Не удалось скопировать заказ.", error);
    }
  }

  async function shareOrder() {
    if (!completedOrder) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Заказ ${completedOrder.number} — Крошка`, text: completedOrder.message });
        showMessage("Заказ передан в меню «Поделиться».", false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Web Share недоступен; копируем текст заказа.", error);
      }
    }
    try {
      await copyText(completedOrder.message);
      showMessage("Текст заказа скопирован — его можно отправить.", false);
    } catch (error) {
      showMessage("Не удалось поделиться заказом. Скопируйте его вручную.");
      console.error("Не удалось поделиться заказом.", error);
    }
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (error) {
        console.warn("Буфер обмена недоступен; пробуем запасной способ.", error);
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    let copied = false;
    try {
      textarea.select();
      copied = document.execCommand("copy");
    } finally {
      textarea.remove();
    }
    if (!copied) throw new Error("Браузер не разрешил копирование.");
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
    const status = orderStatusLabels[order.deliveryStatus] ?? orderStatusLabels.created;
    container.querySelector(".last-order-status").textContent =
      `${order.demo ? "Демо · " : ""}${status}`;
  }

  form.addEventListener("input", updateSubmitState);
  form.addEventListener("change", updateSubmitState);
  document.addEventListener("kroshka:cart-change", renderSummary);
  document.querySelector(".copy-order").addEventListener("click", copyOrder);
  document.querySelector(".share-order").addEventListener("click", shareOrder);
  advanceStatusButton.addEventListener("click", advanceOrderStatus);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    validatePhone();
    if (!form.reportValidity() || getOrderItems().length === 0) {
      showMessage("Проверьте имя, телефон и состав корзины.");
      return;
    }
    const order = makeOrder();
    if (endpointConfigurationError) {
      showMessage("Настройка реальной отправки некорректна. Заказ не отправлен.");
      return;
    }
    if (!orderEndpoint) {
      await renderSuccess(order, true);
      return;
    }

    const payload = new URLSearchParams();
    payload.set("_subject", `Заказ ${order.number} — Крошка`);
    payload.set("name", order.customerName);
    payload.set("phone", order.phone);
    payload.set("orderNumber", order.number);
    payload.set("pickupTime", order.pickupTime);
    payload.set("comment", order.comment);
    payload.set("items", order.items.map((item) =>
      `${item.name} ×${item.quantity} — ${formatPrice(item.lineTotal)}`
    ).join("\n"));
    payload.set("total", formatPrice(order.total));
    payload.set("message", order.message);

    submitting = true;
    submitButton.textContent = "Отправляем…";
    showMessage("");
    updateSubmitState();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(orderEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Formspree ответил статусом ${response.status}.`);
      await renderSuccess(order, false);
    } catch (error) {
      showMessage(error instanceof DOMException && error.name === "AbortError"
        ? "Не удалось дождаться ответа. Корзина сохранена — попробуйте ещё раз позже."
        : "Не удалось отправить заказ. Корзина сохранена — попробуйте ещё раз позже.");
      console.error("Ошибка отправки заказа в Formspree.", error);
    } finally {
      window.clearTimeout(timeout);
      submitting = false;
      submitButton.textContent = "Оформить заказ";
      updateSubmitState();
    }
  });

  renderSummary();
  renderHistory();
  updateSubmitState();
  if (window.KROSHKA_DB) {
    window.KROSHKA_DB.getProfile().then((profile) => {
      if (!profile) return;
      let prefilled = false;
      if (!nameInput.value && profile.name) {
        nameInput.value = profile.name;
        prefilled = true;
      }
      if (!phoneInput.value && profile.phone) {
        phoneInput.value = profile.phone;
        prefilled = true;
      }
      if (prefilled) {
        document.querySelector(".profile-prefill-note").hidden = false;
        updateSubmitState();
      }
    }).catch((error) => {
      console.error("Не удалось прочитать профиль для автозаполнения заказа.", error);
    });
  }
  if (endpointConfigurationError) {
    showMessage("Настройка реальной отправки некорректна. Заказ не отправляется.", true);
  }
})();
