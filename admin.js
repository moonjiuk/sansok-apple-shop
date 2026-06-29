const baseProducts = [
  { name:"5kg 22과",desc:"크고 고른 사과",price:80000,size:"5kg · 22과",category:"gift" },
  { name:"5kg 25과",desc:"고른 크기의 선물 구성",price:70000,size:"5kg · 25과",category:"gift" },
  { name:"10kg 44과 이내",desc:"넉넉한 프리미엄 구성",price:80000,size:"10kg · 44과 이내",category:"gift" },
  { name:"10kg 44과 이내 가정용",desc:"맛은 그대로인 실속 구성",price:60000,size:"10kg · 44과 이내",category:"bgrade" },
  { name:"10kg 50과 이내",desc:"부담 없이 선물하기 좋은 구성",price:60000,size:"10kg · 50과 이내",category:"gift" },
  { name:"10kg 50과 이내 가정용",desc:"모양만 달라도 맛은 그대로",price:50000,size:"10kg · 50과 이내",category:"bgrade" },
  { name:"10kg 60과 이내",desc:"알찬 크기의 선물 구성",price:50000,size:"10kg · 60과 이내",category:"gift" },
  { name:"10kg 60과 이내 가정용",desc:"가정에서 즐기기 좋은 실속 구성",price:40000,size:"10kg · 60과 이내",category:"bgrade" }
];
const varietySeeds = [
  { name:"썸머킹",code:100,harvest:"7월 25일~8월 10일" },
  { name:"홍로",code:200,harvest:"9월 22일~26일" },
  { name:"부사",code:300,harvest:"11월 17일부터" }
];
const fallbackProducts = varietySeeds.flatMap(variety => baseProducts.map((product,index) => ({
  ...product,id:variety.code+index+1,name:`${variety.name} ${product.name}`,variety:variety.name,harvest:variety.harvest,
  badge:product.category==="gift"?"선물용":"가정용",status:"예약판매"
})));
const fallbackSettings = {
  orderPhone: "", sellerPhone: "", shipping: "일반 주문은 주문 확인 후 평균 1주일 이내 배송됩니다. 예약 주문은 수확 일정과 작황에 따라 최대 6주 이내 배송될 수 있습니다.",
  refund: "상품 이상·파손·오배송은 수령 후 24시간 이내 사진과 함께 연락해 주세요. 확인 후 교환 또는 환불해 드립니다. 신선식품 특성상 단순 변심, 주소 오기재, 연락 두절, 보관 부주의로 인한 변질은 교환·환불이 어렵습니다. 반품 전 반드시 판매자와 협의해 주세요.",
  representative: "", businessNumber: "", mailOrderNumber: ""
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
  localStorage.setItem("sansok-products", JSON.stringify(migratedProducts.length ? migratedProducts : fallbackProducts));
  localStorage.setItem("sansok-catalog-version", catalogVersion);
} else if (storedCatalogVersion !== catalogVersion) {
  localStorage.setItem("sansok-products", JSON.stringify(fallbackProducts));
  localStorage.setItem("sansok-catalog-version", catalogVersion);
  localStorage.removeItem("sansok-cart");
}
let products = JSON.parse(localStorage.getItem("sansok-products") || "null") || fallbackProducts;
let orders = JSON.parse(localStorage.getItem("sansok-orders") || "[]");
let settings = JSON.parse(localStorage.getItem("sansok-settings") || "null") || fallbackSettings;
if (!settings.orderPhone && settings.phone) settings.orderPhone = settings.phone;
if (!Object.hasOwn(settings, "sellerPhone")) settings.sellerPhone = "";
delete settings.phone;
if (!settings.shipping || settings.shipping === "배송비와 출고 요일을 준비 중입니다. 주문 확인 후 안내드립니다.") settings.shipping = fallbackSettings.shipping;
if (!settings.refund || settings.refund === "파손이나 상품 이상 시 수령 직후 사진과 함께 연락해 주세요.") settings.refund = fallbackSettings.refund;
localStorage.setItem("sansok-settings", JSON.stringify(settings));
const won = value => `${Number(value).toLocaleString("ko-KR")}원`;
const dateText = value => new Date(value).toLocaleString("ko-KR", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });

function saveProducts() { localStorage.setItem("sansok-products", JSON.stringify(products)); renderAll(); }
function saveOrders() { localStorage.setItem("sansok-orders", JSON.stringify(orders)); renderAll(); }
function toast(message) {
  const el = document.querySelector("#adminToast");
  el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2000);
}
function renderDashboard() {
  document.querySelector("#statOrders").textContent = orders.length;
  document.querySelector("#statNew").textContent = orders.filter(order => order.status === "신규주문").length;
  document.querySelector("#statProducts").textContent = products.filter(product => ["판매중","예약판매"].includes(product.status)).length;
  document.querySelector("#statRevenue").textContent = won(orders.reduce((sum, order) => sum + order.total, 0));
  document.querySelector("#newOrderCount").textContent = orders.filter(order => order.status === "신규주문").length;
  document.querySelector("#recentOrders").innerHTML = orders.length ? `<div class="table-wrap"><table><tbody>${orders.slice(0,5).map(order => orderRow(order, false)).join("")}</tbody></table></div>` : `<div class="table-empty">아직 접수된 주문이 없습니다.</div>`;
}
function orderRow(order, selectable = true) {
  const itemText = order.items.map(item => `${item.name.startsWith(item.variety) ? item.name : `${item.variety} ${item.name}`} × ${item.quantity}`).join(", ");
  return `<tr>${selectable?`<td class="check-cell"><input class="order-select" type="checkbox" value="${order.id}" aria-label="${order.id} 선택"></td>`:""}<td><strong>${order.id}</strong><small>${dateText(order.createdAt)}</small></td><td><strong>${order.customer.name}</strong><small>${order.customer.phone}</small></td><td><strong>${itemText}</strong><small>${order.customer.address}</small></td><td><strong>${won(order.total)}</strong><small>${order.payment ? `${order.payment.method} · ${order.payment.status}` : "결제 정보 없음"}</small></td><td><select class="status-select" data-order-status="${order.id}">${["신규주문","입금확인","배송준비","배송완료","취소"].map(status => `<option ${status===order.status?"selected":""}>${status}</option>`).join("")}</select></td><td class="row-actions"><button data-delete-order="${order.id}">삭제</button></td></tr>`;
}
function renderOrders() {
  const query = document.querySelector("#orderSearch").value.trim().toLowerCase();
  const status = document.querySelector("#orderStatusFilter").value;
  const filtered = orders.filter(order => {
    const text = `${order.id} ${order.customer.name} ${order.customer.phone} ${order.customer.address}`.toLowerCase();
    return (!query || text.includes(query)) && (status === "all" || order.status === status);
  });
  document.querySelector("#orderRows").innerHTML = filtered.length ? filtered.map(order => orderRow(order, true)).join("") : `<tr><td colspan="7" class="table-empty">조건에 맞는 주문이 없습니다.</td></tr>`;
  document.querySelector("#selectAllOrders").checked = false;
  updateSelectedCount();
}
function renderProducts() {
  document.querySelector("#productRows").innerHTML = products.map(product => `<tr>
    <td><strong>${product.name}</strong><small>${product.desc}</small></td><td>${product.variety}</td><td>${product.category==="gift"?"선물용":"가정용"}</td>
    <td><strong>${won(product.price)}</strong></td><td><select class="status-select" data-product-status="${product.id}">${["판매중","예약판매","품절","판매종료"].map(status => `<option ${status===product.status?"selected":""}>${status}</option>`).join("")}</select></td>
    <td class="row-actions"><button data-edit-product="${product.id}">수정</button><button data-delete-product="${product.id}">삭제</button></td></tr>`).join("");
}
function renderSettings() {
  Object.entries(settings).forEach(([key,value]) => {
    const field = document.querySelector(`#settingsForm [name="${key}"]`);
    if (field) field.value = value;
  });
}
function renderAll() { renderDashboard(); renderProducts(); renderOrders(); }
function openProduct(product = {}) {
  const form = document.querySelector("#productForm");
  form.reset();
  form.elements.id.value = product.id || "";
  form.elements.name.value = product.name || "";
  form.elements.desc.value = product.desc || "";
  form.elements.size.value = product.size || "";
  form.elements.price.value = product.price || "";
  form.elements.category.value = product.category || "gift";
  form.elements.status.value = product.status || "예약판매";
  form.elements.variety.value = product.variety || "썸머킹";
  document.querySelector("#productDialog").showModal();
}
function showPage(page) {
  document.querySelectorAll(".admin-page").forEach(section => section.classList.remove("active"));
  document.querySelectorAll(".admin-sidebar nav button").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  document.querySelector(`#${page}Page`).classList.add("active");
  const names = { dashboard:["OVERVIEW","판매 현황"], products:["CATALOG","상품 관리"], orders:["ORDERS","주문 관리"], settings:["STORE SETTINGS","판매 정보"] };
  document.querySelector("#pageEyebrow").textContent = names[page][0];
  document.querySelector("#pageTitle").textContent = names[page][1];
}
function updateSelectedCount() {
  document.querySelector("#selectedOrderCount").textContent = document.querySelectorAll(".order-select:checked").length;
}

document.addEventListener("click", event => {
  const page = event.target.closest("[data-page]")?.dataset.page || event.target.closest("[data-go]")?.dataset.go;
  if (page) showPage(page);
  const editId = Number(event.target.dataset.editProduct);
  if (editId) openProduct(products.find(product => product.id === editId));
  const deleteId = Number(event.target.dataset.deleteProduct);
  if (deleteId && confirm("이 상품을 삭제할까요?")) { products = products.filter(product => product.id !== deleteId); saveProducts(); toast("상품을 삭제했습니다."); }
  const deleteOrder = event.target.dataset.deleteOrder;
  if (deleteOrder && confirm("이 주문 기록을 삭제할까요?")) { orders = orders.filter(order => order.id !== deleteOrder); saveOrders(); toast("주문을 삭제했습니다."); }
});
document.addEventListener("change", event => {
  if (event.target.dataset.productStatus) {
    const product = products.find(item => item.id === Number(event.target.dataset.productStatus));
    product.status = event.target.value; saveProducts(); toast("판매 상태를 변경했습니다.");
  }
  if (event.target.dataset.orderStatus) {
    const order = orders.find(item => item.id === event.target.dataset.orderStatus);
    order.status = event.target.value; saveOrders(); toast("주문 상태를 변경했습니다.");
  }
  if (event.target.classList.contains("order-select")) updateSelectedCount();
});
document.querySelector("#addProduct").addEventListener("click", () => openProduct());
document.querySelector("#productDialogClose").addEventListener("click", () => document.querySelector("#productDialog").close());
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
});
document.querySelector("#productForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const product = {
    id: data.id ? Number(data.id) : Math.max(0,...products.map(item => item.id))+1,
    name:data.name, desc:data.desc, size:data.size, price:Number(data.price), category:data.category,
    badge:data.category==="gift"?"선물용":"가정용", variety:data.variety,
    harvest:data.variety==="홍로"?"9월 22일~26일":data.variety==="부사"?"11월 17일~12월 31일":"7월 25일~8월 10일", status:data.status
  };
  const index = products.findIndex(item => item.id === product.id);
  if (index >= 0) products[index] = product; else products.push(product);
  saveProducts(); document.querySelector("#productDialog").close(); toast("상품 정보를 저장했습니다.");
});
document.querySelector("#settingsForm").addEventListener("submit", event => {
  event.preventDefault(); settings = Object.fromEntries(new FormData(event.currentTarget).entries());
  localStorage.setItem("sansok-settings", JSON.stringify(settings)); toast("판매 정보를 저장했습니다.");
});
document.querySelector("#sampleOrder").addEventListener("click", () => {
  orders.unshift({id:`SO-${Date.now().toString().slice(-8)}`,createdAt:new Date().toISOString(),customer:{name:"홍길동",phone:"010-0000-0000",address:"충북 제천시 예시 주소",memo:"배송 전 연락주세요"},items:[{name:"5kg 22과",variety:"홍로",quantity:1,price:80000}],total:80000,status:"신규주문"});
  saveOrders(); toast("기능 확인용 예시 주문을 만들었습니다.");
});
document.querySelector("#orderSearch").addEventListener("input", renderOrders);
document.querySelector("#orderStatusFilter").addEventListener("change", renderOrders);
document.querySelector("#selectAllOrders").addEventListener("change", event => {
  document.querySelectorAll(".order-select").forEach(checkbox => { checkbox.checked = event.target.checked; });
  updateSelectedCount();
});
document.querySelector("#applyBulkStatus").addEventListener("click", () => {
  const selected = [...document.querySelectorAll(".order-select:checked")].map(checkbox => checkbox.value);
  const status = document.querySelector("#bulkOrderStatus").value;
  if (!selected.length) { toast("변경할 주문을 선택해 주세요."); return; }
  if (!status) { toast("변경할 상태를 선택해 주세요."); return; }
  orders.forEach(order => { if (selected.includes(order.id)) order.status = status; });
  saveOrders();
  document.querySelector("#bulkOrderStatus").value = "";
  toast(`${selected.length}건의 주문 상태를 변경했습니다.`);
});

renderAll();
renderSettings();
