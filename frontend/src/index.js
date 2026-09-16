/**
 * index.js — Entry của React app
 *
 * - Import 2 stylesheet theo thứ tự: tokens.css (biến CSS toàn cục + reset)
 *   rồi app.css (style component) — thứ tự quyết định cascade.
 * - Gắn <App/> (routing ở App.jsx) vào #root, bọc <StrictMode> + <BrowserRouter>.
 */
import React from 'react';
import { createElement } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  createElement(
    React.StrictMode,
    null,
    createElement(BrowserRouter, null, createElement(App))
  )
);