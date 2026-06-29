const baseProducts = [
  { name: "5kg 22과", desc: "크고 고른 사과", price: 80000, size: "5kg · 22과", category: "gift" },
  { name: "5kg 25과", desc: "고른 크기의 선물 구성", price: 70000, size: "5kg · 25과", category: "gift" },
  { name: "10kg 44과 이내", desc: "넉넉한 프리미엄 구성", price: 80000, size: "10kg · 44과 이내", category: "gift" },
  { name: "10kg 44과 이내 B품", desc: "맛은 그대로인 실속 구성", price: 60000, size: "10kg · 44과 이내", category: "bgrade" },
  { name: "10kg 50과 이내", desc: "부담 없이 선물하기 좋은 구성", price: 60000, size: "10kg · 50과 이내", category: "gift" },
  { name: "10kg 50과 이내 B품", desc: "모양만 달라도 맛은 그대로", price: 50000, size: "10kg · 50과 이내", category: "bgrade" },
  { name: "10kg 60과 이내", desc: "알찬 크기의 선물 구성", price: 50000, size: "10kg · 60과 이내", category: "gift" },
  { name: "10kg 60과 이내 B품", desc: "가정에서 즐기기 좋은 실속 구성", price: 40000, size: "10kg · 60과 이내", category: "bgrade" }
];
const varieties = [
  { name: "썸머킹", code: 100, harvest: "수확 일정 준비 중" },
  { name: "홍로", code: 200, harvest: "9월 22일~26일" },
  { name: "부사", code: 300, harvest: "11월 17일부터" }
];
const defaultProducts = varieties.flatMap(variety => baseProducts.map((product, index) => ({
  ...product, id: variety.code + index + 1, name: `${variety.name} ${product.name}`,
  variety: variety.name, harvest: variety.harvest,
  badge: product.category === "gift" ? "선물용" : "B품", status: "예약판매"
})));

const defaultSettings = {
  phone: "",
  shipping: "배송비와 출고 요일을 준비 중입니다. 주문 확인 후 안내드립니다.",
  refund: "파손이나 상품 이상 시 수령 직후 사진과 함께 연락해 주세요.",
  representative: "",
  businessNumber: "",
  mailOrderNumber: ""
};

const catalogVersion = "3";
if (localStorage.getItem("sansok-catalog-version") !== catalogVersion) {
  localStorage.setItem("sansok-products", JSON.stringify(defaultProducts));
  localStorage.setItem("sansok-catalog-version", catalogVersion);
  localStorage.removeItem("sansok-cart");
}
let products = JSON.parse(localStorage.getItem("sansok-products") || "null") || defaultProducts;
let settings = JSON.parse(localStorage.getItem("sansok-settings") || "null") || defaultSettings;
let cart = JSON.parse(localStorage.getItem("sansok-cart") || "{}");
let activeFilter = "all";

const won = value => `${Number(value).toLocaleString("ko-KR")}원`;
const productGrid = document.querySelector("#productGrid");
const cartItems = document.querySelector("#cartItems");
const toast = document.querySelector("#toast");

function renderProducts(filter = activeFilter) {
  activeFilter = filter;
  const visible = products.filter(product => filter === "all" || product.category === filter || product.variety === filter);
  productGrid.innerHTML = visible.map(product => {
    const disabled = product.status === "품절" || product.status === "판매종료";
    return `<article class="product-card">
      <div class="product-image"><span class="badge">${product.variety} · ${product.badge}</span><span class="sale-status status-${product.status}">${product.status}</span></div>
      <div class="product-info">
        <div class="product-title-row">
          <div><h3>${product.name}</h3><p>${product.desc} · ${product.size}</p></div>
          <div class="product-price">${won(product.price)}</div>
        </div>
        <p class="harvest-note">수확 · ${product.harvest || "일정 준비 중"}</p>
        <button class="add-button" data-add="${product.id}" ${disabled ? "disabled" : ""}>${disabled ? product.status : "장바구니 담기"}</button>
      </div>
    </article>`;
  }).join("") || `<p class="no-products">해당 상품을 준비 중입니다.</p>`;
}

function saveCart() {
  localStorage.setItem("sansok-cart", JSON.stringify(cart));
  renderCart();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function addToCart(id) {
  const product = products.find(item => item.id === id);
  const key = String(id);
  cart[key] = (cart[key] || 0) + 1;
  saveCart();
  showToast(`${product.variety} 상품을 장바구니에 담았어요.`);
}

function cartDetails() {
  return Object.entries(cart).map(([key, quantity]) => {
    const product = products.find(item => item.id === Number(key));
    return product ? { key, product, variety: product.variety, quantity } : null;
  }).filter(Boolean);
}

function renderCart() {
  const entries = cartDetails();
  const count = entries.reduce((sum, item) => sum + item.quantity, 0);
  const total = entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  document.querySelector("#cartCount").textContent = count;
  document.querySelector("#cartTotal").textContent = won(total);
  document.querySelector("#dialogTotal").textContent = won(total);
  document.querySelector("#shippingBar").style.width = count ? "100%" : "0%";
  document.querySelector("#shippingMessage").textContent = count ? settings.shipping : "상품을 선택해 주세요.";
  document.querySelector("#checkoutButton").disabled = count === 0;

  if (!entries.length) {
    cartItems.innerHTML = `<div class="empty-cart"><span>🍎</span><p>장바구니가 비어 있어요.<br>품종과 규격을 골라보세요.</p></div>`;
    return;
  }

  cartItems.innerHTML = entries.map(({ key, product, variety, quantity }) => `<div class="cart-item">
    <div class="cart-thumb">🍎</div>
    <div><h4>${product.name} · ${variety}</h4><strong>${won(product.price)}</strong>
      <div class="quantity"><button data-change="${key}" data-delta="-1" aria-label="수량 줄이기">−</button><span>${quantity}</span><button data-change="${key}" data-delta="1" aria-label="수량 늘리기">+</button></div>
    </div>
    <button class="remove-item" data-remove="${key}" aria-label="${product.name} 삭제">×</button>
  </div>`).join("");
}

function renderSettings() {
  const contact = settings.phone || "연락처를 준비 중입니다.";
  document.querySelector("#contactInfo").innerHTML = `${contact}<br>전화 또는 문자로 문의해 주세요.`;
  document.querySelector("#shippingInfo").textContent = settings.shipping;
  document.querySelector("#refundInfo").textContent = settings.refund;
  const seller = [
    settings.representative && `대표자 ${settings.representative}`,
    settings.businessNumber && `사업자등록번호 ${settings.businessNumber}`,
    settings.mailOrderNumber && `통신판매업 ${settings.mailOrderNumber}`
  ].filter(Boolean);
  document.querySelector("#businessInfo").textContent = seller.length ? seller.join(" · ") : "대표자·사업자등록번호·통신판매업 신고번호를 준비 중입니다.";
  if (settings.phone) {
    const number = settings.phone.replace(/[^0-9+]/g, "");
    document.querySelector("#phoneLink").href = `tel:${number}`;
    document.querySelector("#messageLink").href = `sms:${number}`;
  }
}

function setCartOpen(open) {
  document.body.classList.toggle("cart-open", open);
  document.querySelector("#cartDrawer").setAttribute("aria-hidden", String(!open));
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  const change = event.target.closest("[data-change]");
  const remove = event.target.closest("[data-remove]");
  if (add) addToCart(Number(add.dataset.add));
  if (change) {
    const key = change.dataset.change;
    cart[key] = Math.max(0, (cart[key] || 0) + Number(change.dataset.delta));
    if (!cart[key]) delete cart[key];
    saveCart();
  }
  if (remove) {
    delete cart[remove.dataset.remove];
    saveCart();
  }
});

document.querySelectorAll(".filter-tabs button").forEach(button => button.addEventListener("click", () => {
  document.querySelector(".filter-tabs .active").classList.remove("active");
  button.classList.add("active");
  renderProducts(button.dataset.filter);
}));

document.querySelector("#cartOpen").addEventListener("click", () => setCartOpen(true));
document.querySelector("#cartClose").addEventListener("click", () => setCartOpen(false));
document.querySelector("#cartOverlay").addEventListener("click", () => setCartOpen(false));
document.querySelector("#checkoutButton").addEventListener("click", () => {
  setCartOpen(false);
  document.querySelector("#checkoutDialog").showModal();
});
document.querySelector("#checkoutDialogClose").addEventListener("click", () => {
  document.querySelector("#checkoutDialog").close();
});
document.querySelector("#checkoutForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const formData = new FormData(event.currentTarget);
  const entries = cartDetails();
  const orders = JSON.parse(localStorage.getItem("sansok-orders") || "[]");
  orders.unshift({
    id: `SO-${Date.now().toString().slice(-8)}`,
    createdAt: new Date().toISOString(),
    customer: Object.fromEntries(formData.entries()),
    items: entries.map(({ product, variety, quantity }) => ({ name: product.name, variety, quantity, price: product.price })),
    total: entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    status: "신규주문"
  });
  localStorage.setItem("sansok-orders", JSON.stringify(orders));
  document.querySelector("#checkoutDialog").close();
  cart = {};
  saveCart();
  event.currentTarget.reset();
  showToast("주문이 접수되었어요. 판매자가 확인 후 연락드릴게요.");
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") setCartOpen(false);
});
window.addEventListener("storage", event => {
  if (event.key === "sansok-products" || event.key === "sansok-settings") location.reload();
});

renderProducts();
renderSettings();
renderCart();
