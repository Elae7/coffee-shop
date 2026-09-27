(() => {
  "use strict";

  const database = window.KROSHKA_DB;
  const form = document.querySelector("#profile-form");
  const profilePanel = document.querySelector(".profile-card");
  const editor = document.querySelector(".profile-editor");
  const historyList = document.querySelector(".account-order-list");
  const status = document.querySelector(".account-message");
  const categoryNames = { bakery: "Выпечка", drinks: "Напитки", breakfast: "Завтраки" };
  const orderStatusNames = { created: "Создан", sent: "Отправлен", ready: "Готов" };
  const formatPrice = (amount) => `${amount.toLocaleString("ru-RU")} ₽`;
  let profile = null;
  let orders = [];
  let editing = false;

  function announce(message, isError = false) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("is-error", isError);
    status.classList.toggle("is-success", !isError);
  }

  function displayProfile() {
    const registered = Boolean(profile);
    profilePanel.hidden = !registered;
    editor.hidden = registered && !editing;
    document.querySelector(".profile-empty").hidden = registered;
    document.querySelector("#profile-title").textContent = registered ? "Ваш профиль" : "Создайте профиль";
    document.querySelector(".profile-save").textContent = registered ? "Сохранить изменения" : "Создать профиль";
    document.querySelector(".profile-edit").hidden = !registered || editing;
    document.querySelector(".profile-cancel").hidden = !editing;
    document.querySelector(".profile-delete").hidden = !registered;
    if (!registered) return;
    document.querySelector(".profile-name").textContent = profile.name;
    document.querySelector(".profile-email").textContent = profile.email;
    document.querySelector(".profile-phone").textContent = profile.phone || "Не указан";
    document.querySelector(".profile-preference").textContent = categoryNames[profile.preference] || "Не выбрано";
    const preferenceLink = document.querySelector(".profile-preference-link");
    preferenceLink.hidden = !categoryNames[profile.preference];
    preferenceLink.href = categoryNames[profile.preference]
      ? `menu.html?category=${encodeURIComponent(profile.preference)}`
      : "menu.html";
    document.querySelector(".profile-birthday").textContent = profile.birthday
      ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${profile.birthday}T00:00:00Z`))
      : "Не указана";
    document.querySelector(".profile-editor-heading").textContent = registered ? "Изменить данные" : "Профиль";
    form.elements.namedItem("name").value = profile.name;
    form.elements.namedItem("email").value = profile.email;
    form.elements.namedItem("phone").value = profile.phone || "";
    form.elements.namedItem("birthday").value = profile.birthday || "";
    form.elements.namedItem("preference").value = profile.preference || "";
  }

  function displayOrders() {
    historyList.replaceChildren();
    document.querySelector(".account-orders-empty").hidden = orders.length > 0;
    document.querySelector(".clear-order-history").hidden = orders.length === 0;
    const fragment = document.createDocumentFragment();
    for (const order of orders) {
      const item = document.createElement("li");
      item.className = "account-order";
      const heading = document.createElement("div");
      heading.className = "account-order-heading";
      const number = document.createElement("strong");
      number.textContent = order.number;
      const state = document.createElement("span");
      state.textContent = `${order.demo ? "Демо · " : ""}${orderStatusNames[order.deliveryStatus] || "Создан"}`;
      heading.append(number, state);
      const details = document.createElement("p");
      const date = new Date(order.date);
      const dateLabel = Number.isNaN(date.valueOf())
        ? "Дата не указана"
        : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
      const itemNames = Array.isArray(order.items)
        ? order.items.map((orderedItem) => `${orderedItem.name} ×${orderedItem.quantity}`).join(", ")
        : "Состав недоступен";
      details.textContent = `${dateLabel} · ${itemNames}`;
      const total = document.createElement("b");
      total.textContent = formatPrice(Number.isFinite(order.total) ? order.total : 0);
      item.append(heading, details, total);
      fragment.append(item);
    }
    historyList.append(fragment);
  }

  async function loadData() {
    try {
      [profile, orders] = await Promise.all([database.getProfile(), database.getOrders()]);
      try {
        const legacyOrder = JSON.parse(localStorage.getItem("kroshka-last-order") || "null");
        if (legacyOrder && typeof legacyOrder.number === "string" &&
            Array.isArray(legacyOrder.items) && !orders.some((order) => order.number === legacyOrder.number)) {
          await database.saveOrder(legacyOrder);
          orders = [legacyOrder, ...orders].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 20);
        }
      } catch (error) {
        console.error("Не удалось перенести последнюю демо-запись в историю профиля.", error);
      }
      displayProfile();
      displayOrders();
    } catch (error) {
      console.error("Не удалось загрузить локальный профиль и историю заказов.", error);
      announce("Не получилось открыть локальное хранилище. Проверьте настройки браузера и перезагрузите страницу.", true);
      form.querySelector(".profile-save").disabled = true;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const nextProfile = {
      name: String(data.get("name")).trim(),
      email: String(data.get("email")).trim(),
      phone: String(data.get("phone")).trim(),
      birthday: String(data.get("birthday")),
      preference: String(data.get("preference"))
    };
    try {
      await database.saveProfile(nextProfile);
      profile = { ...nextProfile, id: "local", updatedAt: new Date().toISOString() };
      editing = false;
      displayProfile();
      announce("Профиль сохранён только в этом браузере.");
    } catch (error) {
      console.error("Не удалось сохранить локальный профиль.", error);
      announce("Не удалось сохранить профиль. Проверьте свободное место и разрешения браузера.", true);
    }
  });

  document.querySelector(".profile-edit").addEventListener("click", () => {
    editing = true;
    displayProfile();
    editor.querySelector("input").focus();
  });
  document.querySelector(".profile-cancel").addEventListener("click", () => {
    editing = false;
    displayProfile();
    announce("");
  });
  document.querySelector(".profile-delete").addEventListener("click", async () => {
    if (!window.confirm("Удалить локальный профиль? История заказов останется.")) return;
    try {
      await database.deleteProfile();
      profile = null;
      editing = false;
      displayProfile();
      announce("Профиль удалён с этого устройства.");
    } catch (error) {
      console.error("Не удалось удалить локальный профиль.", error);
      announce("Не удалось удалить профиль. Попробуйте ещё раз.", true);
    }
  });
  document.querySelector(".clear-order-history").addEventListener("click", async () => {
    if (!window.confirm("Удалить историю заказов с этого устройства?")) return;
    try {
      await database.clearOrders();
      localStorage.removeItem("kroshka-last-order");
      orders = [];
      document.querySelector(".account-latest-order").hidden = true;
      displayOrders();
      announce("История заказов удалена с этого устройства.");
    } catch (error) {
      console.error("Не удалось удалить историю заказов.", error);
      announce("Не удалось удалить историю заказов. Попробуйте ещё раз.", true);
    }
  });
  loadData();
})();
