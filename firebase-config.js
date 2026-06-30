const firebaseConfig = {
  apiKey: "AIzaSyDYutHABge6GB82yxm95rzAMNNwv1qFfhc",
  authDomain: "sansok-apple-shop.firebaseapp.com",
  projectId: "sansok-apple-shop",
  storageBucket: "sansok-apple-shop.firebasestorage.app",
  messagingSenderId: "727247869547",
  appId: "1:727247869547:web:7bd6b83a856e635970c32e"
};

firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const firebaseAuth = typeof firebase.auth === "function" ? firebase.auth() : null;
const ADMIN_EMAILS = ["moonjiugi917@gmail.com"];

function isAdminUser(user) {
  return Boolean(user && ADMIN_EMAILS.includes((user.email || "").toLowerCase()));
}

window.sansokFirebase = {
  auth: {
    onChange(callback) {
      return firebaseAuth.onAuthStateChanged(callback);
    },
    isAdmin: isAdminUser,
    async signInAdmin() {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await firebaseAuth.signInWithPopup(provider);
      if (!isAdminUser(result.user)) {
        const email = result.user?.email || "선택한 계정";
        await firebaseAuth.signOut();
        throw new Error(`${email} 계정은 판매 관리자로 등록되어 있지 않습니다.`);
      }
      return result.user;
    },
    signOut() {
      return firebaseAuth.signOut();
    }
  },
  async load() {
    const [catalog, settings, orders] = await Promise.all([
      firestore.doc("store/catalog").get(),
      firestore.doc("store/settings").get(),
      firestore.doc("store/orders").get()
    ]);
    return {
      products: catalog.exists ? catalog.data().products : null,
      settings: settings.exists ? settings.data() : null,
      orders: orders.exists ? orders.data().orders : null
    };
  },
  saveProducts(products) {
    return firestore.doc("store/catalog").set({ products, updatedAt: new Date().toISOString() });
  },
  saveSettings(settings) {
    return firestore.doc("store/settings").set({ ...settings, updatedAt: new Date().toISOString() });
  },
  saveOrders(orders) {
    return firestore.doc("store/orders").set({ orders, updatedAt: new Date().toISOString() });
  },
  async loadProductImage(productId) {
    const image = await firestore.doc(`productImages/${productId}`).get();
    return image.exists ? image.data().imageData : null;
  },
  saveProductImage(productId, imageData) {
    return firestore.doc(`productImages/${productId}`).set({
      imageData,
      updatedAt: new Date().toISOString()
    });
  }
};
