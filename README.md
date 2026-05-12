# EatPlan — 個人化飲食規劃

一個 Next.js 網頁應用：依個人體重 / 體脂 / 目標自動產生每週 batch-cooking 菜單與 Costco 採購清單。

## 功能

- **個人資料 + 目標**：BMR / TDEE 自動計算，依目標時程檢查可行性，自動分配三大營養素
- **菜單產生**：30 分鐘內可批次完成 6 餐（2 人份）的食譜骨幹，依預算與飲食限制篩選
- **Costco 採購清單**：合併食材、依包裝向上取整、列印 / 行動裝置友善
- **進度追蹤**：每週體重 / 體脂紀錄
- **LLM 客製化**（選用）：透過 Claude API 改寫食譜步驟並替換食材

## 技術

- Next.js 15（App Router）+ TypeScript + Tailwind CSS
- Supabase（Postgres + Auth + Row-Level Security）— 可選，未設定環境變數時自動退回 localStorage
- Anthropic Claude API（@anthropic-ai/sdk，Sonnet 4.6 + prompt caching）— 可選
- Vitest 單元測試
- 部署：Vercel

## 開發

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 與 Anthropic key（皆可選）
npm run dev
```

執行測試：

```bash
npm run test
npm run typecheck
```

## 資料庫遷移

`supabase/migrations/0001_initial.sql` 包含 `profiles`、`goals`、`progress_logs`、`meal_plans` 四張表與 RLS 政策。在 Supabase Dashboard 的 SQL Editor 執行即可。

## 主要程式碼

- `src/lib/nutrition.ts` — BMR / TDEE / 三大營養素計算
- `src/lib/meal-planner.ts` — 規則式 6 餐選擇演算法
- `src/lib/shopping.ts` — 採購清單聚合
- `src/lib/ai/recipe.ts` — Claude API 食譜客製化
- `src/data/ingredients.ts`、`src/data/recipes.ts` — 種子資料
