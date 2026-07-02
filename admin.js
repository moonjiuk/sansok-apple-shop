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
  { name:"부사",code:300,harvest:"11월 17일~30일" }
];
const fallbackProducts = varietySeeds.flatMap(variety => baseProducts.map((product,index) => ({
  ...product,id:variety.code+index+1,name:`${variety.name} ${product.name}`,variety:variety.name,harvest:variety.harvest,
  badge:product.category==="gift"?"선물용":"가정용",status:"예약판매"
})));
const fallbackSettings = {
  orderPhone: "", sellerPhone: "", businessName: "산속농원(산속 놀이터)", businessAddress: "충청북도 제천시 한수면 봉화재길 597", shipping: "일반 주문은 주문 확인 후 평균 1주일 이내 배송됩니다. 예약 주문은 수확 일정과 작황에 따라 최대 6주 이내 배송될 수 있습니다.",
  refund: "상품 이상·파손·오배송은 수령 후 24시간 이내 사진과 함께 연락해 주세요. 확인 후 교환 또는 환불해 드립니다. 신선식품 특성상 단순 변심, 주소 오기재, 연락 두절, 보관 부주의로 인한 변질은 교환·환불이 어렵습니다. 반품 전 반드시 판매자와 협의해 주세요.",
  representative: "", businessNumber: "", mailOrderNumber: ""
};
const catalogVersion = "5";
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
if (!Object.hasOwn(settings, "businessName")) settings.businessName = fallbackSettings.businessName;
if (!Object.hasOwn(settings, "businessAddress")) settings.businessAddress = fallbackSettings.businessAddress;
delete settings.phone;
if (!settings.shipping || settings.shipping === "배송비와 출고 요일을 준비 중입니다. 주문 확인 후 안내드립니다.") settings.shipping = fallbackSettings.shipping;
if (!settings.refund || settings.refund === "파손이나 상품 이상 시 수령 직후 사진과 함께 연락해 주세요.") settings.refund = fallbackSettings.refund;
localStorage.setItem("sansok-settings", JSON.stringify(settings));
const won = value => `${Number(value).toLocaleString("ko-KR")}원`;
const dateText = value => new Date(value).toLocaleString("ko-KR", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
const defaultOrderColumns = ["select", "order", "customer", "product", "amount", "status", "actions"];
let orderColumnOrder = JSON.parse(localStorage.getItem("sansok-order-column-order") || "null");
if (!Array.isArray(orderColumnOrder) || defaultOrderColumns.some(column => !orderColumnOrder.includes(column))) {
  orderColumnOrder = [...defaultOrderColumns];
}
orderColumnOrder = ["select", ...orderColumnOrder.filter(column => column !== "select")];
localStorage.setItem("sansok-order-column-order", JSON.stringify(orderColumnOrder));

function reportFirebaseError(error) {
  console.error(error);
  toast("Firebase 저장에 실패했습니다. 인터넷 연결을 확인해 주세요.");
}
function saveProducts() {
  localStorage.setItem("sansok-products", JSON.stringify(products));
  renderAll();
  window.sansokFirebase.saveProducts(products).catch(reportFirebaseError);
}
function saveOrders() {
  localStorage.setItem("sansok-orders", JSON.stringify(orders));
  renderAll();
  window.sansokFirebase.saveOrders(orders).catch(reportFirebaseError);
}
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
}
function orderRow(order, selectable = true) {
  const itemText = order.items.map(item => `${item.name.startsWith(item.variety) ? item.name : `${item.variety} ${item.name}`} × ${item.quantity}`).join(", ");
  const requestTag = order.returnRequest ? `<span class="return-request-tag">${order.returnRequest.type} · ${order.returnRequest.status}</span>` : "";
  const requestButton = order.returnRequest ? `<button data-manage-return="${order.id}">요청 처리</button>` : "";
  return `<tr>${selectable?`<td class="check-cell" data-order-column="select"><input class="order-select" type="checkbox" value="${order.id}" aria-label="${order.id} 선택"></td>`:""}<td data-order-column="order"><strong>${order.id}</strong><small>${dateText(order.createdAt)}</small>${requestTag}</td><td data-order-column="customer"><strong>${order.customer.name}</strong><small>${order.customer.phone}</small></td><td data-order-column="product"><strong>${itemText}</strong><small>${order.customer.address}</small></td><td data-order-column="amount"><strong>${won(order.total)}</strong><small>${order.payment ? `${order.payment.method} · ${order.payment.status}` : "결제 정보 없음"}</small></td><td data-order-column="status"><select class="status-select" data-order-status="${order.id}">${["신규주문","입금확인","배송준비","배송완료","취소"].map(status => `<option ${status===order.status?"selected":""}>${status}</option>`).join("")}</select></td><td class="row-actions" data-order-column="actions">${requestButton}<button data-delete-order="${order.id}">삭제</button></td></tr>`;
}
function applyOrderColumnOrder() {
  document.querySelectorAll("#ordersPage table tr").forEach(row => {
    const cells = [...row.children].filter(cell => cell.dataset.orderColumn);
    if (!cells.length) return;
    cells.sort((a, b) => orderColumnOrder.indexOf(a.dataset.orderColumn) - orderColumnOrder.indexOf(b.dataset.orderColumn));
    cells.forEach(cell => row.append(cell));
  });
}
function moveOrderColumns(nextOrder) {
  const cells = [...document.querySelectorAll("#ordersPage [data-order-column]")];
  cells.forEach(cell => cell.getAnimations().forEach(animation => animation.cancel()));
  const previousPositions = new Map(cells.map(cell => [cell, cell.getBoundingClientRect().left]));
  orderColumnOrder = nextOrder;
  applyOrderColumnOrder();
  cells.forEach(cell => {
    const offset = previousPositions.get(cell) - cell.getBoundingClientRect().left;
    if (!offset) return;
    cell.animate(
      [{ transform:`translateX(${offset}px)` }, { transform:"translateX(0)" }],
      { duration:180, easing:"cubic-bezier(.22,.8,.3,1)" }
    );
  });
}
function setupOrderColumnDrag() {
  const header = document.querySelector("#ordersPage thead");
  const dragImage = document.createElement("span");
  dragImage.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;";
  document.body.append(dragImage);
  let draggedColumn = null;
  let dragFollower = null;
  let grabOffsetX = 0;
  let orderChanged = false;
  header.querySelectorAll('th[data-order-column]:not([data-order-column="select"])').forEach(cell => { cell.draggable = true; });
  header.addEventListener("dragstart", event => {
    const cell = event.target.closest('th[data-order-column]:not([data-order-column="select"])');
    if (!cell) return;
    draggedColumn = cell.dataset.orderColumn;
    orderChanged = false;
    cell.classList.add("column-dragging");
    const rect = cell.getBoundingClientRect();
    grabOffsetX = event.clientX - rect.left;
    dragFollower = document.createElement("div");
    dragFollower.className = "column-drag-follower";
    dragFollower.textContent = cell.textContent.trim();
    dragFollower.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
    document.body.append(dragFollower);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedColumn);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
  });
  document.addEventListener("dragover", event => {
    if (!draggedColumn || !dragFollower) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    dragFollower.style.left = `${event.clientX - grabOffsetX}px`;
    const cells = [...header.querySelectorAll('th[data-order-column]:not([data-order-column="select"])')]
      .filter(cell => cell.dataset.orderColumn !== draggedColumn);
    if (!cells.length) return;
    const cell = cells.find(item => event.clientX < item.getBoundingClientRect().right) || cells[cells.length - 1];
    const rect = cell.getBoundingClientRect();
    const nextOrder = orderColumnOrder.filter(column => column !== draggedColumn);
    const targetIndex = nextOrder.indexOf(cell.dataset.orderColumn);
    const placeAfter = event.clientX > rect.left + rect.width / 2;
    nextOrder.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedColumn);
    if (nextOrder.some((column, index) => column !== orderColumnOrder[index])) {
      moveOrderColumns(nextOrder);
      localStorage.setItem("sansok-order-column-order", JSON.stringify(orderColumnOrder));
      orderChanged = true;
    }
  });
  document.addEventListener("drop", event => {
    if (draggedColumn) event.preventDefault();
  });
  header.addEventListener("dragend", () => {
    if (orderChanged) toast("주문 관리 열 순서를 변경했습니다.");
    dragFollower?.remove();
    dragFollower = null;
    draggedColumn = null;
    orderChanged = false;
    header.querySelectorAll(".column-dragging").forEach(item => item.classList.remove("column-dragging"));
  });
}
function renderOrders() {
  const query = document.querySelector("#orderSearch").value.trim().toLowerCase();
  const status = document.querySelector("#orderStatusFilter").value;
  const filtered = orders.filter(order => {
    const text = `${order.id} ${order.customer.name} ${order.customer.phone} ${order.customer.address}`.toLowerCase();
    const matchesStatus = status === "all" || (status === "return-request" ? Boolean(order.returnRequest) : order.status === status);
    return (!query || text.includes(query)) && matchesStatus;
  });
  document.querySelector("#orderRows").innerHTML = filtered.length ? filtered.map(order => orderRow(order, true)).join("") : `<tr><td colspan="7" class="table-empty">조건에 맞는 주문이 없습니다.</td></tr>`;
  applyOrderColumnOrder();
  document.querySelector("#selectAllOrders").checked = false;
  updateSelectedCount();
}
function renderProducts() {
  const query = document.querySelector("#productSearch").value.trim().toLowerCase();
  const variety = document.querySelector("#productVarietyFilter").value;
  const category = document.querySelector("#productCategoryFilter").value;
  const status = document.querySelector("#productStatusFilter").value;
  const filtered = products.filter(product =>
    (!query || `${product.name} ${product.desc}`.toLowerCase().includes(query)) &&
    (variety === "all" || product.variety === variety) &&
    (category === "all" || product.category === category) &&
    (status === "all" || product.status === status)
  );
  document.querySelector("#productRows").innerHTML = filtered.length ? filtered.map(product => `<tr>
    <td class="check-cell"><input class="product-select" type="checkbox" value="${product.id}" aria-label="${product.name} 선택"></td>
    <td><strong>${product.name}</strong><small>${product.desc}</small></td><td>${product.variety}</td><td>${product.category==="gift"?"선물용":"가정용"}</td>
    <td><strong>${won(product.price)}</strong></td><td><select class="status-select" data-product-status="${product.id}">${["판매중","예약판매","품절","판매종료"].map(status => `<option ${status===product.status?"selected":""}>${status}</option>`).join("")}</select></td>
    <td class="row-actions"><button data-edit-product="${product.id}">수정</button><button data-delete-product="${product.id}">삭제</button></td></tr>`).join("") : `<tr><td colspan="7" class="table-empty">조건에 맞는 상품이 없습니다.</td></tr>`;
  document.querySelector("#selectAllProducts").checked = false;
  updateSelectedProductCount();
}
function renderSettings() {
  Object.entries(settings).forEach(([key,value]) => {
    const field = document.querySelector(`#settingsForm [name="${key}"]`);
    if (field) field.value = value;
  });
}
function renderAll() { renderDashboard(); renderProducts(); renderOrders(); }
let pendingProductImage = null;
function showProductImagePreview(imageData) {
  document.querySelector("#productImagePreview").innerHTML = imageData
    ? `<img src="${imageData}" alt="등록할 실제 상품 사진 미리보기">`
    : "<span>등록된 사진 없음</span>";
}
async function openProduct(product = {}) {
  const form = document.querySelector("#productForm");
  form.reset();
  pendingProductImage = null;
  showProductImagePreview(null);
  form.elements.id.value = product.id || "";
  form.elements.name.value = product.name || "";
  form.elements.desc.value = product.desc || "";
  form.elements.size.value = product.size || "";
  form.elements.price.value = product.price || "";
  form.elements.category.value = product.category || "gift";
  form.elements.status.value = product.status || "예약판매";
  form.elements.variety.value = product.variety || "썸머킹";
  document.querySelector("#productDialog").showModal();
  if (product.id) {
    try {
      const imageData = await window.sansokFirebase.loadProductImage(product.id);
      if (form.elements.id.value === String(product.id)) showProductImagePreview(imageData);
    } catch (error) {
      console.error(error);
    }
  }
}
function resizeProductImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("지원하지 않는 사진 형식입니다."));
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg", .76);
        if (imageData.length > 850000) reject(new Error("사진 용량이 큽니다. 더 작은 사진을 선택해 주세요."));
        else resolve(imageData);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function showPage(page) {
  document.querySelectorAll(".admin-page").forEach(section => section.classList.remove("active"));
  document.querySelectorAll(".admin-sidebar nav button").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  document.querySelector(`#${page}Page`).classList.add("active");
  const names = { products:["CATALOG","상품 관리"], orders:["ORDERS","주문 관리"], settings:["STORE SETTINGS","판매 정보"] };
  document.querySelector("#pageEyebrow").textContent = names[page][0];
  document.querySelector("#pageTitle").textContent = names[page][1];
}
function updateSelectedCount() {
  document.querySelector("#selectedOrderCount").textContent = document.querySelectorAll(".order-select:checked").length;
}
function updateSelectedProductCount() {
  document.querySelector("#selectedProductCount").textContent = document.querySelectorAll(".product-select:checked").length;
}
function openReturnManage(order) {
  const request = order.returnRequest;
  if (!request) return;
  const form = document.querySelector("#returnManageForm");
  form.elements.orderId.value = order.id;
  form.elements.status.value = request.status;
  form.elements.sellerMemo.value = request.sellerMemo || "";
  document.querySelector("#returnRequestSummary").innerHTML = `
    <p><strong>${escapeHtml(request.type)} 요청 · ${escapeHtml(request.status)}</strong></p>
    <p>주문번호 ${escapeHtml(order.id)} · ${escapeHtml(order.customer.name)} · ${escapeHtml(order.customer.phone)}</p>
    <p>사유: ${escapeHtml(request.reason)}</p>
    <p>상세 내용: ${escapeHtml(request.detail)}</p>
    <p>신청일: ${dateText(request.requestedAt)}</p>`;
  document.querySelector("#returnManageDialog").showModal();
}

document.addEventListener("click", event => {
  const page = event.target.closest("[data-page]")?.dataset.page;
  if (page) showPage(page);
  const editId = Number(event.target.dataset.editProduct);
  if (editId) openProduct(products.find(product => product.id === editId));
  const deleteId = Number(event.target.dataset.deleteProduct);
  if (deleteId && confirm("이 상품을 삭제할까요?")) { products = products.filter(product => product.id !== deleteId); saveProducts(); toast("상품을 삭제했습니다."); }
  const deleteOrder = event.target.dataset.deleteOrder;
  if (deleteOrder && confirm("이 주문 기록을 삭제할까요?")) { orders = orders.filter(order => order.id !== deleteOrder); saveOrders(); toast("주문을 삭제했습니다."); }
  const manageReturn = event.target.dataset.manageReturn;
  if (manageReturn) openReturnManage(orders.find(order => order.id === manageReturn));
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
  if (event.target.classList.contains("product-select")) updateSelectedProductCount();
});
document.querySelector("#addProduct").addEventListener("click", () => openProduct());
document.querySelector("#productDialogClose").addEventListener("click", () => document.querySelector("#productDialog").close());
document.querySelector("#returnManageClose").addEventListener("click", () => document.querySelector("#returnManageDialog").close());
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
});
document.querySelector("#productImageInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    pendingProductImage = await resizeProductImage(file);
    showProductImagePreview(pendingProductImage);
  } catch (error) {
    event.target.value = "";
    toast(error.message);
  }
});
document.querySelector("#productForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const product = {
    id: data.id ? Number(data.id) : Math.max(0,...products.map(item => item.id))+1,
    name:data.name, desc:data.desc, size:data.size, price:Number(data.price), category:data.category,
    badge:data.category==="gift"?"선물용":"가정용", variety:data.variety,
    harvest:data.variety==="홍로"?"9월 22일~26일":data.variety==="부사"?"11월 17일~30일":"7월 25일~8월 10일", status:data.status
  };
  const index = products.findIndex(item => item.id === product.id);
  if (index >= 0) products[index] = product; else products.push(product);
  saveProducts();
  if (pendingProductImage) {
    try {
      await window.sansokFirebase.saveProductImage(product.id, pendingProductImage);
    } catch (error) {
      reportFirebaseError(error);
      return;
    }
  }
  document.querySelector("#productDialog").close();
  toast("상품 정보를 저장했습니다.");
});
document.querySelector("#settingsForm").addEventListener("submit", event => {
  event.preventDefault(); settings = Object.fromEntries(new FormData(event.currentTarget).entries());
  localStorage.setItem("sansok-settings", JSON.stringify(settings));
  window.sansokFirebase.saveSettings(settings).catch(reportFirebaseError);
  toast("판매 정보를 저장했습니다.");
});
document.querySelector("#returnManageForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const order = orders.find(item => item.id === data.orderId);
  if (!order?.returnRequest) {
    toast("처리할 요청을 찾지 못했습니다.");
    return;
  }
  order.returnRequest.status = data.status;
  order.returnRequest.sellerMemo = data.sellerMemo.trim();
  order.returnRequest.updatedAt = new Date().toISOString();
  if (data.status === "완료") order.status = order.returnRequest.type === "환불" ? "취소" : "배송완료";
  saveOrders();
  document.querySelector("#returnManageDialog").close();
  toast(`${order.returnRequest.type} 요청 처리 내용을 저장했습니다.`);
});
document.querySelector("#sampleOrder").addEventListener("click", () => {
  orders.unshift({id:`SO-${Date.now().toString().slice(-8)}`,createdAt:new Date().toISOString(),customer:{name:"홍길동",phone:"010-0000-0000",address:"충북 제천시 예시 주소",memo:"배송 전 연락주세요"},items:[{name:"5kg 22과",variety:"홍로",quantity:1,price:80000}],total:80000,status:"신규주문"});
  saveOrders(); toast("기능 확인용 예시 주문을 만들었습니다.");
});
document.querySelector("#productSearch").addEventListener("input", renderProducts);
document.querySelector("#productVarietyFilter").addEventListener("change", renderProducts);
document.querySelector("#productCategoryFilter").addEventListener("change", renderProducts);
document.querySelector("#productStatusFilter").addEventListener("change", renderProducts);
document.querySelector("#selectAllProducts").addEventListener("change", event => {
  document.querySelectorAll(".product-select").forEach(checkbox => { checkbox.checked = event.target.checked; });
  updateSelectedProductCount();
});
document.querySelector("#applyBulkProductStatus").addEventListener("click", () => {
  const selected = [...document.querySelectorAll(".product-select:checked")].map(checkbox => Number(checkbox.value));
  const status = document.querySelector("#bulkProductStatus").value;
  if (!selected.length) { toast("변경할 상품을 선택해 주세요."); return; }
  if (!status) { toast("변경할 판매 상태를 선택해 주세요."); return; }
  products.forEach(product => { if (selected.includes(product.id)) product.status = status; });
  saveProducts();
  document.querySelector("#bulkProductStatus").value = "";
  toast(`${selected.length}개 상품의 판매 상태를 변경했습니다.`);
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

setupOrderColumnDrag();
applyOrderColumnOrder();

let adminInitialized = false;
async function initializeAdmin() {
  if (adminInitialized) return;
  adminInitialized = true;
  try {
    const remote = await window.sansokFirebase.load();
    if (remote.products) {
      const needsFujiUpdate = remote.products.some(product => product.variety === "부사" && product.harvest !== "11월 17일~30일");
      products = remote.products.map(product => product.variety === "부사"
        ? { ...product, harvest: "11월 17일~30일" }
        : product);
      localStorage.setItem("sansok-products", JSON.stringify(products));
      if (needsFujiUpdate) await window.sansokFirebase.saveProducts(products);
    } else {
      await window.sansokFirebase.saveProducts(products);
    }
    if (remote.settings) {
      settings = { ...fallbackSettings, ...remote.settings };
      delete settings.updatedAt;
      localStorage.setItem("sansok-settings", JSON.stringify(settings));
    } else {
      await window.sansokFirebase.saveSettings(settings);
    }
    if (remote.orders) {
      orders = remote.orders;
      localStorage.setItem("sansok-orders", JSON.stringify(orders));
    } else {
      await window.sansokFirebase.saveOrders(orders);
    }
  } catch (error) {
    reportFirebaseError(error);
  }
  renderAll();
  renderSettings();
}

function unlockAdmin() {
  document.body.classList.remove("admin-locked");
  document.querySelector("#adminLock").hidden = true;
  initializeAdmin();
}

document.body.classList.add("admin-locked");
const adminLoginButton = document.querySelector("#adminGoogleLogin");
const adminLoginError = document.querySelector("#adminLoginError");
const isFilePreview = location.protocol === "file:";
const isLocalPreview = ["localhost", "127.0.0.1"].includes(location.hostname);

if (isFilePreview) {
  document.querySelector("#adminLock p").textContent = "Google 로그인은 로컬 서버 또는 배포된 사이트에서 사용할 수 있습니다.";
  adminLoginButton.textContent = "로컬 서버에서 관리자 페이지 열기";
  adminLoginError.textContent = "파일을 직접 연 상태에서는 Google 로그인을 사용할 수 없습니다.";
} else if (isLocalPreview) {
  document.querySelector("#adminLock p").textContent = "로컬에서는 인증 없이 판매 관리 화면을 확인할 수 있습니다.";
  adminLoginButton.textContent = "로컬 미리보기로 들어가기";
  adminLoginError.textContent = "이 모드의 변경사항은 Firebase 운영 데이터에 저장되지 않습니다.";
}

adminLoginButton.addEventListener("click", async () => {
  if (isFilePreview) {
    location.href = "http://localhost:4173/outputs/haetsal-apple-shop/admin.html";
    return;
  }
  if (isLocalPreview) {
    window.sansokFirebase.auth.enableLocalMock();
    unlockAdmin();
    return;
  }
  adminLoginButton.disabled = true;
  adminLoginButton.textContent = "Google 로그인 확인 중…";
  adminLoginError.textContent = "";
  try {
    await window.sansokFirebase.auth.signInAdmin();
  } catch (error) {
    console.error(error);
    adminLoginError.textContent = error.code === "auth/popup-blocked"
      ? "팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요."
      : error.code === "auth/popup-closed-by-user"
        ? "로그인 창이 닫혔습니다. 다시 시도해 주세요."
        : (error.message || "Google 로그인에 실패했습니다.");
  } finally {
    adminLoginButton.disabled = false;
    adminLoginButton.textContent = "Google 계정으로 로그인";
  }
});

window.sansokFirebase.auth.onChange(user => {
  if (window.sansokFirebase.auth.isAdmin(user)) {
    unlockAdmin();
    return;
  }
  document.body.classList.add("admin-locked");
  document.querySelector("#adminLock").hidden = false;
});
