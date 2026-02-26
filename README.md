<div align="center">

<img src="public/favicon.svg" width="64" height="64" alt="TagValidator logo" />

# TagValidator

**Free, real-time HTML/XML tag mismatch detection tool**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tagvalidator.com-4f9eff?style=flat-square)](https://tagvalidator.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite%205-646cff?style=flat-square)](https://vitejs.dev)
[![React 18](https://img.shields.io/badge/React-18-61dafb?style=flat-square)](https://react.dev)

</div>

---

> 🇬🇧 [English](#english) · 🇻🇳 [Tiếng Việt](#tiếng-việt)

---

## English

### What is TagValidator?

TagValidator is a production-grade web tool that detects **HTML and XML tag mismatches in real-time** — missing closing tags, orphaned closing tags, and structural mismatches — with line-level precision, without blocking the UI.

### ✨ Features

- **⚡ Real-time validation** — Results appear 500ms after you stop typing, powered by a Web Worker (non-blocking)
- **🎯 Precise error reporting** — Exact line & column for every error, with surrounding code context
- **✏️ Monaco Editor** — The same editor used in VS Code, with syntax highlighting, bracket coloring, and error markers
- **📂 Flexible input** — Paste directly, drag-and-drop files, or use the Upload button
- **🔧 Auto-fix** — Insert missing closing tags with one click (preview before applying)
- **📤 Export** — Download error report as CSV or copy as JSON
- **🌙 Dark / Light mode** — Persisted in localStorage
- **🌐 Multi-format** — HTML, XML, Vue, JSX

### 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Parser | `htmlparser2` v9 |
| State | Zustand |
| Styling | Tailwind CSS v3 |
| Build | Vite 5 |
| Processing | Web Worker (non-blocking) |

### 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/your-username/tagvalidator.git
cd tagvalidator

# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

### 🚦 How It Works

```
User input (paste / file / type)
    ↓
Main Thread (React + Zustand)
    ↓  postMessage(content)
Web Worker (htmlparser2 + Stack Algorithm)
    ↓  postMessage({ PROGRESS | COMPLETE | ERROR })
Main Thread → Monaco decorations + Error table
```

**Stack algorithm:**
1. Push `<open>` tags onto the stack (skip void elements: `<img>`, `<br>`, etc.)
2. On `</close>`: match top of stack → pop; mismatch → record error + recover
3. EOF: remaining items in stack = unclosed tags → report MISSING_CLOSE

### 📁 Project Structure

```
src/
├── workers/
│   ├── parser.ts              # htmlparser2 wrapper with line tracking
│   ├── validator.ts           # Stack-based algorithm
│   └── tagValidator.worker.ts # Web Worker entry
├── components/
│   ├── Header.tsx
│   ├── EditorPanel.tsx        # Monaco + decorations
│   ├── DiagnosticsPanel.tsx   # Summary + table + export
│   ├── ErrorTable.tsx         # Sortable, filterable
│   ├── FileInputDropZone.tsx
│   └── ProgressBar.tsx
├── hooks/
│   ├── useWorker.ts
│   └── useMonaco.ts
├── store/useAppStore.ts       # Zustand global state
├── utils/
│   ├── errorFormatter.ts
│   └── fileHandler.ts
└── types/index.ts
```

### ☕ Support

If you find this tool useful, consider buying me a coffee!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=flat-square&labelColor=000)](https://buymeacoffee.com/thanghh)

---

## Tiếng Việt

### TagValidator là gì?

TagValidator là công cụ web chuyên nghiệp giúp phát hiện **lỗi tag HTML/XML trong thời gian thực** — thẻ đóng bị thiếu, thẻ đóng mồ côi, và cấu trúc sai — với độ chính xác đến từng dòng, không làm lag giao diện.

### ✨ Tính năng

- **⚡ Validation thời gian thực** — Kết quả hiển thị sau 500ms khi dừng gõ, xử lý qua Web Worker (non-blocking)
- **🎯 Báo lỗi chính xác** — Dòng và cột cụ thể cho mỗi lỗi, kèm đoạn code tương ứng
- **✏️ Monaco Editor** — Editor giống VS Code, hỗ trợ highlight syntax, tô màu ngoặc, và đánh dấu lỗi
- **📂 Nhiều cách nhập liệu** — Paste trực tiếp, kéo thả file, hoặc dùng nút Upload
- **🔧 Tự động sửa lỗi** — Chèn thẻ đóng còn thiếu bằng một cú click (có xem trước trước khi áp dụng)
- **📤 Xuất dữ liệu** — Tải báo cáo lỗi dạng CSV hoặc copy dạng JSON
- **🌙 Chế độ tối / sáng** — Lưu vào localStorage
- **🌐 Đa định dạng** — HTML, XML, Vue, JSX

### 🛠 Công nghệ sử dụng

| Tầng | Công nghệ |
|---|---|
| Framework | React 18 + TypeScript |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Parser | `htmlparser2` v9 |
| State | Zustand |
| Giao diện | Tailwind CSS v3 |
| Build | Vite 5 |
| Xử lý | Web Worker (non-blocking) |

### 🚀 Chạy dự án

```bash
# Clone repo về máy
git clone https://github.com/your-username/tagvalidator.git
cd tagvalidator

# Cài dependencies
npm install

# Chạy dev server
npm run dev
# → http://localhost:5173
```

### 🚦 Cách hoạt động

```
Người dùng nhập (paste / file / gõ)
    ↓
Main Thread (React + Zustand)
    ↓  postMessage(content)
Web Worker (htmlparser2 + Thuật toán Stack)
    ↓  postMessage({ PROGRESS | COMPLETE | ERROR })
Main Thread → Decoration Monaco + Bảng lỗi
```

**Thuật toán stack:**
1. Push thẻ `<mở>` vào stack (bỏ qua void elements: `<img>`, `<br>`, ...)
2. Gặp thẻ `</đóng>`: khớp với đỉnh stack → pop; không khớp → ghi lỗi + khôi phục
3. Hết file: các phần tử còn trên stack = thẻ chưa đóng → báo MISSING_CLOSE

### 📁 Cấu trúc dự án

```
src/
├── workers/
│   ├── parser.ts              # Wrapper htmlparser2 với line tracking
│   ├── validator.ts           # Thuật toán stack
│   └── tagValidator.worker.ts # Entry point Web Worker
├── components/
│   ├── Header.tsx
│   ├── EditorPanel.tsx        # Monaco + decorations
│   ├── DiagnosticsPanel.tsx   # Tổng hợp + bảng + xuất
│   ├── ErrorTable.tsx         # Có sắp xếp, lọc theo loại
│   ├── FileInputDropZone.tsx
│   └── ProgressBar.tsx
├── hooks/
│   ├── useWorker.ts
│   └── useMonaco.ts
├── store/useAppStore.ts       # Zustand global state
├── utils/
│   ├── errorFormatter.ts
│   └── fileHandler.ts
└── types/index.ts
```

### ☕ Ủng hộ tác giả

Nếu bạn thấy công cụ này hữu ích, hãy mời mình một ly cà phê nhé!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=flat-square&labelColor=000)](https://buymeacoffee.com/thanghh)

---

<div align="center">
Made with ❤️ by <a href="https://buymeacoffee.com/thanghh">thanghh</a>
</div>
