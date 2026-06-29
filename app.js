const baseProducts = [
  { name: "5kg 22과", desc: "크고 고른 사과", price: 80000, size: "5kg · 22과", category: "gift" },
  { name: "5kg 25과", desc: "고른 크기의 선물 구성", price: 70000, size: "5kg · 25과", category: "gift" },
  { name: "10kg 44과 이내", desc: "넉넉한 프리미엄 구성", price: 80000, size: "10kg · 44과 이내", category: "gift" },
  { name: "10kg 44과 이내 가정용", desc: "맛은 그대로인 실속 구성", price: 60000, size: "10kg · 44과 이내", category: "bgrade" },
  { name: "10kg 50과 이내", desc: "부담 없이 선물하기 좋은 구성", price: 60000, size: "10kg · 50과 이내", category: "gift" },
  { name: "10kg 50과 이내 가정용", desc: "모양만 달라도 맛은 그대로", price: 50000, size: "10kg · 50과 이내", category: "bgrade" },
  { name: "10kg 60과 이내", desc: "알찬 크기의 선물 구성", price: 50000, size: "10kg · 60과 이내", category: "gift" },
  { name: "10kg 60과 이내 가정용", desc: "가정에서 즐기기 좋은 실속 구성", price: 40000, size: "10kg · 60과 이내", category: "bgrade" }
];
const varieties = [
  { name: "썸머킹", code: 100, harvest: "7월 25일~8월 10일", start: [7, 25], end: [8, 10] },
  { name: "홍로", code: 200, harvest: "9월 22일~26일", start: [9, 22], end: [9, 26] },
  { name: "부사", code: 300, harvest: "11월 17일~12월 31일", start: [11, 17], end: [12, 31] }
];
const defaultProducts = varieties.flatMap(variety => baseProducts.map((product, index) => ({
  ...product, id: variety.code + index + 1, name: `${variety.name} ${product.name}`,
  variety: variety.name, harvest: variety.harvest,
  badge: product.category === "gift" ? "선물용" : "가정용", status: "예약판매"
})));

const defaultSettings = {
  orderPhone: "",
  sellerPhone: "",
  shipping: "일반 주문은 주문 확인 후 평균 1주일 이내 배송됩니다. 예약 주문은 수확 일정과 작황에 따라 최대 6주 이내 배송될 수 있습니다.",
  refund: "상품 이상·파손·오배송은 수령 후 24시간 이내 사진과 함께 연락해 주세요. 확인 후 교환 또는 환불해 드립니다. 신선식품 특성상 단순 변심, 주소 오기재, 연락 두절, 보관 부주의로 인한 변질은 교환·환불이 어렵습니다. 반품 전 반드시 판매자와 협의해 주세요.",
  representative: "",
  businessNumber: "",
  mailOrderNumber: ""
};

const catalogVersion = "4";
const storedCatalogVersion = localStorage.getItem("sansok-catalog-version");
if (storedCatalogVersion === "3") {
  const storedProducts = JSON.parse(localStorage.getItem("sansok-products") || "[]");
  const migratedProducts = storedProducts.map(product => ({
    ...product,
    name: product.name?.replace(/B품/g, "가정용"),
    desc: product.desc?.replace(/B품/g, "가정용"),
    badge: product.category === "bgrade" ? "가정용" : product.badge
  }));
  localStorage.setItem("sansok-products", JSON.stringify(migratedProducts.length ? migratedProducts : defaultProducts));
  localStorage.setItem("sansok-catalog-version", catalogVersion);
} else if (storedCatalogVersion !== catalogVersion) {
  localStorage.setItem("sansok-products", JSON.stringify(defaultProducts));
  localStorage.setItem("sansok-catalog-version", catalogVersion);
  localStorage.removeItem("sansok-cart");
}
let products = JSON.parse(localStorage.getItem("sansok-products") || "null") || defaultProducts;
let settings = JSON.parse(localStorage.getItem("sansok-settings") || "null") || defaultSettings;
if (!settings.orderPhone && settings.phone) settings.orderPhone = settings.phone;
if (!Object.hasOwn(settings, "sellerPhone")) settings.sellerPhone = "";
delete settings.phone;
if (!settings.shipping || settings.shipping === "배송비와 출고 요일을 준비 중입니다. 주문 확인 후 안내드립니다.") settings.shipping = defaultSettings.shipping;
if (!settings.refund || settings.refund === "파손이나 상품 이상 시 수령 직후 사진과 함께 연락해 주세요.") settings.refund = defaultSettings.refund;
localStorage.setItem("sansok-settings", JSON.stringify(settings));
let cart = JSON.parse(localStorage.getItem("sansok-cart") || "{}");
let pendingOrder = null;
let myOrderIds = JSON.parse(localStorage.getItem("sansok-my-order-ids") || "null");
if (!myOrderIds) {
  myOrderIds = JSON.parse(localStorage.getItem("sansok-orders") || "[]").map(order => order.id);
  localStorage.setItem("sansok-my-order-ids", JSON.stringify(myOrderIds));
}
let activeFilter = "all";
const varietyOpenState = {};

const won = value => `${Number(value).toLocaleString("ko-KR")}원`;
const productGrid = document.querySelector("#productGrid");
const cartItems = document.querySelector("#cartItems");
const toast = document.querySelector("#toast");

function getSeasonStatus(variety) {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, variety.start[0] - 1, variety.start[1]);
  const end = new Date(year, variety.end[0] - 1, variety.end[1], 23, 59, 59);
  const reservationStart = new Date(start);
  reservationStart.setMonth(reservationStart.getMonth() - 1);
  if (now >= start && now <= end) return "판매중";
  if (now >= reservationStart && now < start) return "예약판매";
  return "판매종료";
}

function getEffectiveStatus(product, seasonStatus) {
  if (seasonStatus === "판매종료") return "판매종료";
  if (product.status === "품절" || product.status === "판매종료") return product.status;
  return seasonStatus;
}

function renderProducts(filter = activeFilter) {
  productGrid.querySelectorAll(".variety-group").forEach(group => {
    varietyOpenState[group.dataset.variety] = group.open;
  });
  activeFilter = filter;
  productGrid.innerHTML = varieties.map(variety => {
    const items = products.filter(product =>
      product.variety === variety.name && (filter === "all" || product.category === filter)
    );
    if (!items.length) return "";
    const seasonStatus = getSeasonStatus(variety);
    const itemsWithStatus = items.map(product => ({
      product,
      effectiveStatus: getEffectiveStatus(product, seasonStatus)
    }));
    const available = itemsWithStatus.filter(item => !["품절", "판매종료"].includes(item.effectiveStatus));
    const selling = itemsWithStatus.filter(item => item.effectiveStatus === "판매중").length;
    const reserved = itemsWithStatus.filter(item => item.effectiveStatus === "예약판매").length;
    const isOpen = Object.hasOwn(varietyOpenState, variety.name)
      ? varietyOpenState[variety.name]
      : available.length > 0;
    const stateText = selling
      ? `판매중 ${selling}개`
      : reserved
        ? `예약판매 ${reserved}개`
        : "판매 종료";
    const cards = itemsWithStatus.map(({ product, effectiveStatus }) => {
      const disabled = effectiveStatus === "품절" || effectiveStatus === "판매종료";
      return `<article class="product-card">
        <button class="product-image" type="button" data-detail="${product.id}" aria-label="${product.name} 상세보기"><span class="badge">${product.badge}</span><span class="sale-status status-${effectiveStatus}">${effectiveStatus}</span></button>
        <div class="product-info">
          <div class="product-title-row">
            <div><h3><button class="product-detail-link" type="button" data-detail="${product.id}">${product.name}</button></h3><p>${product.desc} · ${product.size}</p></div>
            <div class="product-price">${won(product.price)}</div>
          </div>
          <button class="add-button" data-add="${product.id}" ${disabled ? "disabled" : ""}>${disabled ? effectiveStatus : "장바구니 담기"}</button>
        </div>
      </article>`;
    }).join("");
    return `<details class="variety-group" data-variety="${variety.name}" ${isOpen ? "open" : ""}>
      <summary>
        <div class="variety-title"><span class="variety-mark">${variety.name.slice(0, 1)}</span><div><small>APPLE VARIETY</small><h3>${variety.name}</h3></div></div>
        <div class="variety-meta"><span>출하 · ${variety.harvest}</span><strong class="${available.length ? "" : "closed"}">${stateText}</strong><i aria-hidden="true"></i></div>
      </summary>
      <div class="product-grid">${cards}</div>
    </details>`;
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
  const contact = settings.orderPhone || "주문 문의 전화번호를 준비 중입니다.";
  document.querySelector("#contactInfo").innerHTML = `${contact}<br>전화 또는 문자로 문의해 주세요.`;
  document.querySelector("#shippingInfo").textContent = settings.shipping;
  document.querySelector("#refundInfo").textContent = settings.refund;
  const seller = [
    settings.sellerPhone && `전화 ${settings.sellerPhone}`,
    settings.representative && `대표자 ${settings.representative}`,
    settings.businessNumber && `사업자등록번호 ${settings.businessNumber}`,
    settings.mailOrderNumber && `통신판매업 ${settings.mailOrderNumber}`
  ].filter(Boolean);
  document.querySelector("#businessInfo").textContent = seller.length ? seller.join(" · ") : "판매자 전화번호·대표자·사업자 정보를 준비 중입니다.";
  if (settings.orderPhone) {
    const number = settings.orderPhone.replace(/[^0-9+]/g, "");
    document.querySelector("#phoneLink").href = `tel:${number}`;
    document.querySelector("#messageLink").href = `sms:${number}`;
  }
}

function setCartOpen(open) {
  document.body.classList.toggle("cart-open", open);
  document.querySelector("#cartDrawer").setAttribute("aria-hidden", String(!open));
}

function openProductDetail(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  const variety = varieties.find(item => item.name === product.variety);
  const status = getEffectiveStatus(product, getSeasonStatus(variety));
  const disabled = status === "품절" || status === "판매종료";
  document.querySelector("#productDetailContent").innerHTML = `
    <button class="dialog-close" id="productDetailClose" type="button" aria-label="상품 상세 닫기">×</button>
    <section class="detail-layout">
      <div class="detail-visual"><span class="badge">${product.badge}</span><span class="sale-status status-${status}">${status}</span></div>
      <div class="detail-copy">
        <span class="eyebrow">${product.variety} · SANSOK APPLE FARM</span>
        <h2>${product.name}</h2>
        <p class="detail-lead">${product.desc}. 제천 산속농원에서 제철에 수확해 보내드립니다.</p>
        <strong class="detail-price">${won(product.price)}</strong>
        <dl class="detail-specs">
          <div><dt>품종</dt><dd>${product.variety}</dd></div>
          <div><dt>구성</dt><dd>${product.size}</dd></div>
          <div><dt>용도</dt><dd>${product.category === "gift" ? "선물용" : "가정용"}</dd></div>
          <div><dt>출하 기간</dt><dd>${product.harvest}</dd></div>
          <div><dt>판매 상태</dt><dd>${status}</dd></div>
        </dl>
        <button class="detail-order-button" data-add="${product.id}" ${disabled ? "disabled" : ""}>${disabled ? status : "장바구니 담기"}</button>
      </div>
    </section>
    <section class="detail-guides">
      <article><h2>배송 안내</h2><p>${settings.shipping}</p></article>
      <article><h2>교환·환불 기준</h2><p>${settings.refund}</p></article>
    </section>`;
  document.querySelector("#productDetailDialog").showModal();
}

function maskName(name = "") {
  if (name.length < 2) return name;
  return `${name.slice(0, 1)}${"*".repeat(Math.max(1, name.length - 1))}`;
}

function maskPhone(phone = "") {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `${digits.slice(0, 3)}-****-${digits.slice(-4)}` : "****";
}

function renderMyOrders() {
  const orders = JSON.parse(localStorage.getItem("sansok-orders") || "[]")
    .filter(order => myOrderIds.includes(order.id));
  const list = document.querySelector("#myOrderList");
  if (!orders.length) {
    list.innerHTML = `<div class="my-orders-empty"><span>🍎</span><p>이 기기에서 주문한 내역이 없습니다.</p></div>`;
    return;
  }
  list.innerHTML = orders.map(order => {
    const items = order.items.map(item => `<li><span>${item.name.startsWith(item.variety) ? item.name : `${item.variety} ${item.name}`}</span><strong>${item.quantity}개</strong></li>`).join("");
    const date = new Date(order.createdAt).toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return `<article class="my-order-card">
      <div class="my-order-head"><div><small>${date}</small><h3>${order.id}</h3></div><strong>${order.status}</strong></div>
      <ul>${items}</ul>
      <div class="my-order-payment">${order.payment ? `${order.payment.method} · ${order.payment.status}` : "결제 확인 전"}</div>
      <div class="my-order-meta"><span>${maskName(order.customer.name)} · ${maskPhone(order.customer.phone)}</span><strong>${won(order.total)}</strong></div>
    </article>`;
  }).join("");
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  const detail = event.target.closest("[data-detail]");
  const change = event.target.closest("[data-change]");
  const remove = event.target.closest("[data-remove]");
  if (add) addToCart(Number(add.dataset.add));
  if (detail) openProductDetail(Number(detail.dataset.detail));
  if (event.target.closest("#productDetailClose")) document.querySelector("#productDetailDialog").close();
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
document.querySelector("#orderHistoryOpen").addEventListener("click", () => {
  renderMyOrders();
  document.querySelector("#orderHistoryDialog").showModal();
});
document.querySelector("#orderHistoryClose").addEventListener("click", () => document.querySelector("#orderHistoryDialog").close());
document.querySelector("#cartClose").addEventListener("click", () => setCartOpen(false));
document.querySelector("#cartOverlay").addEventListener("click", () => setCartOpen(false));
document.querySelector("#checkoutButton").addEventListener("click", () => {
  setCartOpen(false);
  document.querySelector("#checkoutDialog").showModal();
});
function updateAddressPreview() {
  const postcode = document.querySelector("#postcode").value;
  const base = document.querySelector("#addressBase").value;
  const detail = document.querySelector("#addressDetail").value.trim();
  document.querySelector("#addressPreview").textContent = base
    ? `최종 배송지 · (${postcode}) ${base}${detail ? ` ${detail}` : ""}`
    : "배송 주소를 검색해 주세요.";
}
const isLocalFilePreview = location.protocol === "file:";
if (isLocalFilePreview) {
  const postcode = document.querySelector("#postcode");
  const addressBase = document.querySelector("#addressBase");
  postcode.required = false;
  postcode.placeholder = "로컬 미리보기";
  addressBase.readOnly = false;
  addressBase.placeholder = "로컬에서는 기본주소를 직접 입력해 주세요";
  document.querySelector("#addressSearch").textContent = "직접 입력";
  document.querySelector("#addressHelp").textContent = "로컬 파일에서는 주소 선택 결과를 받을 수 없어 직접 입력 모드로 표시됩니다. 배포 후에는 주소검색이 정상 작동합니다.";
  addressBase.addEventListener("input", updateAddressPreview);
}
document.querySelector("#addressSearch").addEventListener("click", () => {
  if (isLocalFilePreview) {
    document.querySelector("#addressBase").focus();
    showToast("로컬 미리보기에서는 기본주소를 직접 입력해 주세요.");
    return;
  }
  if (!window.kakao?.Postcode) {
    showToast("주소 검색 서비스를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
    return;
  }
  const layer = document.querySelector("#addressSearchLayer");
  const frame = document.querySelector("#addressSearchFrame");
  frame.replaceChildren();
  layer.hidden = false;
  new window.kakao.Postcode({
    oncomplete(data) {
      document.querySelector("#postcode").value = data.zonecode;
      document.querySelector("#addressBase").value = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
      layer.hidden = true;
      document.querySelector("#addressDetail").focus();
      updateAddressPreview();
    },
    onresize(size) {
      frame.style.height = `${size.height}px`;
    },
    width: "100%",
    height: "100%"
  }).embed(frame);
});
document.querySelector("#addressSearchClose").addEventListener("click", () => {
  document.querySelector("#addressSearchLayer").hidden = true;
});
document.querySelector("#addressDetail").addEventListener("input", updateAddressPreview);
document.querySelector("#checkoutDialogClose").addEventListener("click", () => {
  document.querySelector("#checkoutDialog").close();
});
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
});
document.querySelector("#checkoutForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const formData = new FormData(event.currentTarget);
  const customer = Object.fromEntries(formData.entries());
  delete customer.paymentAgreement;
  customer.address = `${customer.postcode ? `(${customer.postcode}) ` : ""}${customer.addressBase} ${customer.addressDetail}`.trim();
  const entries = cartDetails();
  pendingOrder = {
    id: `SO-${Date.now().toString().slice(-8)}`,
    createdAt: new Date().toISOString(),
    customer,
    items: entries.map(({ product, variety, quantity }) => ({ name: product.name, variety, quantity, price: product.price })),
    total: entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    status: "신규주문"
  };
  document.querySelector("#mockOrderId").textContent = pendingOrder.id;
  document.querySelector("#mockPaymentMethod").textContent = customer.paymentMethod;
  document.querySelector("#mockPaymentAmount").textContent = won(pendingOrder.total);
  document.querySelector("#checkoutDialog").close();
  document.querySelector("#paymentMockDialog").showModal();
});
document.querySelector("#paymentMockBack").addEventListener("click", () => {
  document.querySelector("#paymentMockDialog").close();
  document.querySelector("#checkoutDialog").showModal();
});
document.querySelector("#paymentMockClose").addEventListener("click", () => {
  document.querySelector("#paymentMockDialog").close();
});
document.querySelector("#mockPayComplete").addEventListener("click", () => {
  if (!pendingOrder) return;
  const button = document.querySelector("#mockPayComplete");
  button.disabled = true;
  button.textContent = "결제 승인 중…";
  pendingOrder.payment = {
    method: pendingOrder.customer.paymentMethod,
    status: "결제완료",
    paymentKey: `mock_${Date.now()}`
  };
  const orders = JSON.parse(localStorage.getItem("sansok-orders") || "[]");
  orders.unshift(pendingOrder);
  localStorage.setItem("sansok-orders", JSON.stringify(orders));
  myOrderIds.unshift(pendingOrder.id);
  localStorage.setItem("sansok-my-order-ids", JSON.stringify(myOrderIds));
  const completedOrderId = pendingOrder.id;
  pendingOrder = null;
  document.querySelector("#paymentMockDialog").close();
  cart = {};
  saveCart();
  document.querySelector("#checkoutForm").reset();
  updateAddressPreview();
  button.disabled = false;
  button.textContent = "테스트 결제 완료";
  showToast(`결제가 완료되었습니다. 주문번호는 ${completedOrderId}입니다.`);
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
