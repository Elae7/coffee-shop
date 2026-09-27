window.KROSHKA_PRODUCTS = Object.freeze([
  { id: "croissant", name: "Круассан классический", category: "bakery", price: 190, description: "Воздушная середина и тонкие хрустящие слои — к кофе или как самостоятельная маленькая радость.", icon: "🥐", badge: "Хит", popular: 1, image: "assets/images/croissant-coffee.webp", imageAlt: "Круассан и кофе на завтрак" },
  { id: "cinnamon", name: "Улитка с корицей", category: "bakery", price: 220, description: "Спираль мягкого теста с корицей и сладкой глазурью — тёплая пара к чашке какао.", icon: "🍥", badge: "Новинка", popular: 2, image: "assets/images/cinnamon-roll.webp", imageAlt: "Свежие улитки с корицей и глазурью" },
  { id: "cookie", name: "Печенье с шоколадом", category: "bakery", price: 160, description: "Крупное мягкое печенье с шоколадом для короткого перерыва и долгого разговора.", icon: "🍪", badge: "", popular: 5, image: "assets/images/chocolate-cookie.webp", imageAlt: "Шоколадное печенье" },
  { id: "tart", name: "Тарт с ягодами", category: "bakery", price: 290, description: "Хрустящая песочная основа и ягодная начинка — нежный десерт с ярким акцентом.", icon: "🍓", badge: "", popular: 7 },
  { id: "latte", name: "Латте", category: "drinks", price: 240, description: "Двойной эспрессо и нежное молоко в мягком сбалансированном вкусе.", icon: "☕", badge: "Хит", popular: 3, keywords: ["кофе", "эспрессо"], image: "assets/images/latte.webp", imageAlt: "Чашка кофе латте с рисунком на молочной пене" },
  { id: "matcha", name: "Матча-тоник", category: "drinks", price: 310, description: "Освежающее сочетание матчи, тоника и льда для бодрой паузы.", icon: "🍵", badge: "Новинка", popular: 6 },
  { id: "cocoa", name: "Какао с маршмеллоу", category: "drinks", price: 260, description: "Густое какао и воздушные маршмеллоу — знакомый уют в одной чашке.", icon: "🍫", badge: "", popular: 4, keywords: ["кофе", "горячий шоколад"] },
  { id: "toast", name: "Тост с авокадо", category: "breakfast", price: 390, description: "Хлеб на закваске с авокадо и яйцом — сытный завтрак, который не торопит.", icon: "🥑", badge: "Завтрак", popular: 8, image: "assets/images/breakfast.webp", imageAlt: "Тост с авокадо и свежей зеленью" }
]);

window.KROSHKA_COMBOS = Object.freeze([
  { id: "coffee-break", name: "Кофейный", description: "Круассан + латте", items: ["croissant", "latte"], icon: "🥐" },
  { id: "breakfast", name: "Завтрак", description: "Тост с авокадо + латте", items: ["toast", "latte"], icon: "🥑" },
  { id: "sweet-pause", name: "Сладкая пауза", description: "Улитка с корицей + какао", items: ["cinnamon", "cocoa"], icon: "🍥" }
]);

window.KROSHKA_PAIRINGS = Object.freeze([
  { source: "latte", suggestion: "croissant" },
  { source: "cocoa", suggestion: "cookie" },
  { source: "toast", suggestion: "latte" }
]);
