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

window.sansokFirebase = {
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
