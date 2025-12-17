# FLOS 醫美績效計算系統

員工操作費用記錄與統計系統，整合 Supabase 用戶資料庫。

## 功能

- 員工登入系統（整合現有 Supabase 用戶資料）
- 每日操作記錄（選擇日期、療程項目、數量）
- 職位自動識別（美容師/護理師/諮詢師）
- 療程費用設定管理
- 個人業績統計（每日/每週/每月）
- 記錄歷史查詢

## 技術棧

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase
- React Router

## 部署

### Vercel

1. Fork 此儲存庫
2. 在 Vercel 中導入專案
3. 設定環境變數：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 部署

## 開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置
npm run build
```

## 環境變數

複製 `.env.example` 為 `.env` 並填入 Supabase 連線資訊。
