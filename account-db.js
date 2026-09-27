(() => {
  "use strict";

  const databaseName = "kroshka-local";
  const databaseVersion = 1;
  let databasePromise;

  function openDatabase() {
    if (!("indexedDB" in window)) {
      return Promise.reject(new Error("Этот браузер не поддерживает локальную базу IndexedDB."));
    }
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("profiles")) {
          database.createObjectStore("profiles", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("orders")) {
          database.createObjectStore("orders", { keyPath: "number" });
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error("Не удалось открыть локальную базу."));
      request.onblocked = () => reject(new Error("Локальная база занята другой вкладкой. Закройте её и повторите."));
    });
    databasePromise.catch(() => { databasePromise = null; });
    return databasePromise;
  }

  function requestValue(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Не удалось прочитать локальную базу."));
    });
  }

  async function transact(storeNames, mode, operation) {
    const database = await openDatabase();
    const transaction = database.transaction(storeNames, mode);
    const completed = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error ?? new Error("Операция локальной базы завершилась с ошибкой."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Операция локальной базы была отменена."));
    });
    const result = operation(transaction);
    await completed;
    return result;
  }

  window.KROSHKA_DB = Object.freeze({
    getProfile: async () => {
      let result;
      await transact(["profiles"], "readonly", (transaction) => {
        result = requestValue(transaction.objectStore("profiles").get("local"));
      });
      return result;
    },
    saveProfile: (profile) => transact(["profiles"], "readwrite", (transaction) =>
      transaction.objectStore("profiles").put({ ...profile, id: "local", updatedAt: new Date().toISOString() })
    ),
    deleteProfile: () => transact(["profiles"], "readwrite", (transaction) =>
      transaction.objectStore("profiles").delete("local")
    ),
    getOrders: async () => {
      let result;
      await transact(["orders"], "readonly", (transaction) => {
        result = requestValue(transaction.objectStore("orders").getAll());
      });
      return (await result).sort((first, second) => second.date.localeCompare(first.date));
    },
    saveOrder: (order) => transact(["orders"], "readwrite", (transaction) => {
      const store = transaction.objectStore("orders");
      store.put(order);
      const request = store.getAll();
      request.onsuccess = () => {
        const oldOrders = request.result
          .sort((first, second) => second.date.localeCompare(first.date))
          .slice(20);
        oldOrders.forEach((oldOrder) => store.delete(oldOrder.number));
      };
    }),
    clearOrders: () => transact(["orders"], "readwrite", (transaction) =>
      transaction.objectStore("orders").clear()
    )
  });
})();
