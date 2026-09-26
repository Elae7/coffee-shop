window.KROSHKA_PRODUCTS = Object.freeze([
  { id: "croissant", name: "Круассан классический", category: "bakery", price: 190, description: "Хрустящий снаружи, нежный внутри", icon: "🥐", badge: "Хит", popular: 1, image: "assets/images/croissant-coffee.webp", imageAlt: "Круассан и кофе на завтрак" },
  { id: "cinnamon", name: "Улитка с корицей", category: "bakery", price: 220, description: "Корица, сахар и много любви", icon: "🍥", badge: "Новинка", popular: 2, image: "assets/images/cinnamon-roll.webp", imageAlt: "Свежие улитки с корицей и глазурью" },
  { id: "cookie", name: "Печенье с шоколадом", category: "bakery", price: 160, description: "Большое, мягкое и шоколадное", icon: "🍪", badge: "", popular: 5, image: "assets/images/chocolate-cookie.webp", imageAlt: "Шоколадное печенье" },
  { id: "tart", name: "Тарт с ягодами", category: "bakery", price: 290, description: "Песочная основа и свежие ягоды", icon: "🍓", badge: "", popular: 7 },
  { id: "latte", name: "Латте", category: "drinks", price: 240, description: "Двойной эспрессо и нежное молоко", icon: "☕", badge: "Хит", popular: 3, keywords: ["кофе", "эспрессо"], image: "assets/images/latte.webp", imageAlt: "Чашка кофе латте с рисунком на молочной пене" },
  { id: "matcha", name: "Матча-тоник", category: "drinks", price: 310, description: "Матча, тоник и лёд", icon: "🍵", badge: "Новинка", popular: 6 },
  { id: "cocoa", name: "Какао с маршмеллоу", category: "drinks", price: 260, description: "Настоящее какао и зефирки", icon: "🍫", badge: "", popular: 4, keywords: ["кофе", "горячий шоколад"] },
  { id: "toast", name: "Тост с авокадо", category: "breakfast", price: 390, description: "Хлеб на закваске, авокадо и яйцо", icon: "🥑", badge: "Завтрак", popular: 8, image: "assets/images/breakfast.webp", imageAlt: "Тост с авокадо и свежей зеленью" }
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
