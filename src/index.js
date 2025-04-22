import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration"; // 追加

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA 用に service worker を登録
serviceWorkerRegistration.register(); // ここでサービスワーカーを登録

// パフォーマンス計測
reportWebVitals();
