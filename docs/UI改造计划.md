# 地摊烟火小店 · UI 改造计划

> 目标：让 `miniapp/` 的前端实现对齐 `UI/` 设计稿的视觉语言与交互结构。
> 设计稿参照：`UI/src/components/CustomerApp.tsx`（顾客端）、`UI/src/components/SellerApp.tsx`（摊主端）。

---

## 一、差距诊断（为什么"完全不一致"）

| 维度 | 设计稿（UI/） | 当前实现（miniapp/） | 结论 |
|------|--------------|---------------------|------|
| **主色** | **emerald 翠绿** `#10b981/#059669` + amber 琥珀辅色 | **橙色系** `#ff6a3d/#ff5722/#ff7e5f` | ❌ 色系完全不同，最刺眼的不一致 |
| **底色** | `slate-50` 极浅灰白 `#f8fafc` | 杂色 `#eef0f2/#f6f7f9` 各页不一 | ❌ 不统一 |
| **卡片** | 白底 + 大圆角(`rounded-2xl`) + 轻阴影 + `slate-100` 细边 | 圆角阴影不统一，各页自定义 | ❌ 缺规范 |
| **全局 token** | Tailwind 统一色板/字号/圆角 | `app.scss` **是空的**，每页各写各的 | ❌ 根因 |
| **导航结构** | 单页内 4-Tab 切换（顾客 map/shop/square/me；摊主 assistant/products/ledger/me） | 多独立页面 + `navigateTo` 跳转 | ⚠️ 结构性差异 |
| **状态色** | 出摊中=red 脉冲、即将=amber、打烊=slate | 同义但色值不统一 | ⚠️ 需归一 |
| **字体** | Inter + Noto Sans SC | 系统默认 | ⚠️ 小程序受限，用字重对齐 |

**根因**：缺少统一的设计 token 层，导致每个页面"各自为政"，且主色选错（橙 vs 绿）。

---

## 二、改造策略

采取**渐进式、按模块**推进，每个模块独立可验证（`npx taro build --type weapp`），不一次性推倒重来：

1. **先立"地基"**：建立全局 SCSS design token（颜色/圆角/阴影/间距/字号变量），这是所有页面对齐的前提。
2. **再改"公共件"**：底部 TabBar、卡片、按钮、状态标签、空状态等复用样式统一。
3. **后逐页"贴皮"**：按顾客端 → 摊主端的顺序，逐页把样式换成 token，校正布局到设计稿。
4. **最后校交互**：补齐设计稿特有的视觉交互（脉冲动画、AI 实景对比、大字模式等）。

> 注：架构层面（4-Tab 单页 vs 多页跳转）暂**保留当前多页结构**，仅在视觉上对齐。是否重构为单页 Tab 架构，作为可选项在阶段五讨论 —— 因为它改动大、风险高，且当前多页结构对小程序分包更友好。

---

## 三、分阶段任务清单

### 阶段 0 · 设计 Token 地基 ⭐（必做第一步）✅ 已完成
- [x] 在 `miniapp/src/app.scss` 建立全局 CSS 变量（定义在 `page` 根选择器，所有页面自动继承）：
  - 主色 `--color-primary: #059669`（emerald-600）、`--color-primary-light/dark/bg/border`
  - 辅色 `--color-accent: #f59e0b`（amber-500）系列
  - 中性色阶 `--color-bg: #f8fafc`、`--color-card`、`--color-border`、`--text-main/body/sub/muted`
  - 状态色：出摊 `#ef4444`、即将 `#f59e0b`、打烊 `#94a3b8`（各含 -bg）
  - 语义色（danger/like/success）、圆角（sm/md/card/lg/pill）、阴影（xs/card/pop/primary）、间距、字号
  - 全局通用工具类：`.u-card` `.u-btn-primary` `.u-pill` `.u-ellipsis`
- [x] 建立 `miniapp/src/styles/mixins.scss`（card / btn-primary / btn-ghost / pill / status-tag / ellipsis / empty-state / pulse-dot）
- **验收**：✅ `npx taro build --type weapp` 通过。
- **引用范式（阶段 1+ 统一用）**：页面 scss 顶部写 `@use '@/styles/mixins.scss' as *;` 即可 `@include card` 等；
  CSS 变量无需 import，直接 `var(--color-primary)`。注意用 `@use` 而非 `@import`（后者已被 Dart Sass 弃用、会告警）。

### 阶段 1 · 公共组件视觉统一 ✅ 已完成
- [x] **底部 TabBar**：橙色高亮 → emerald 高亮；图标/字重/选中态对齐设计稿
- [x] **卡片/按钮/状态标签**基础类统一（白底大圆角、emerald 主按钮、状态色标签）
- **验收**：✅ 地图首页 TabBar 呈现 emerald 选中态。

### 阶段 2 · 顾客端逐页改造 ✅ 配色迁移完成（结构对齐见阶段 6）
- [x] `home`（地图扫街）：品类 chip 改 emerald；摊位卡片对齐设计稿卡片样式；定位按钮/sheet 圆角；**并已做结构级对齐**（顶部 header 文案、AI 逛街寻宝推荐、实景对比入口）
- [x] `stall-detail`（摊位详情）：状态标签、商品卡、AI 实景对比、优惠券领取区配色
- [x] `reserve`（预定下单）：表单/提货码票据样式
- [x] `orders`（我的预定）：状态 tab 下划线、提货码框
- [x] `my-coupons`（我的优惠券）：券卡视觉（虚线撕口、金额强调）
- [x] `wish-pool`（许愿池）：许愿卡 + 摊主回复气泡
- **验收**：✅ 顾客端 6 页配色/卡片/状态标签统一为 emerald 体系。

### 阶段 3 · 摊主端逐页改造 ✅ 配色迁移完成
- [x] `stall-setting`（开店设置）：表单样式
- [x] `product-manage`（商品管理）：商品卡 + 上下架开关
- [x] `pricing`（AI 定价助手）：AI 结果卡、推理文案区配色（设计稿亮点）
- [x] `order-manage`（订单管理）：状态 tab、核销扫码 FAB
- [x] `coupon-manage`（优惠券管理）：券模板卡
- [x] `stall-qrcode`（聚合摆摊码）：摆摊码展示 + 功能开关
- **验收**：✅ 摊主端 6 页统一；amber 辅色用于摊主端强调元素。

### 阶段 4 · 主包 + 我的页 ✅ 配色迁移完成
- [x] `pages/index`（启动分发页）
- [x] `pages/my`（我的/双角色入口）：头像区、角色切换、大字极简模式四宫格对齐设计稿
- **验收**：✅ 双角色入口、大字模式样式对齐。

### 阶段 6 · 结构/文案级设计对齐 🚧 进行中（token 迁移 ≠ 设计对齐）
> 配色统一后，各页的**元素结构、文案、布局骨架**仍可能与设计稿有出入。
> 方法：逐页对照 `UI/src/components/CustomerApp.tsx` / `SellerApp.tsx` 的 JSX，
> 做元素级 diff（缺失的搜索栏/状态条/CTA 按钮、文案差异如「实景扫街/云逛小店」、
> 品类 emoji 前缀等），只改 JSX 结构 + className + 文案，不动数据/store/事件逻辑。
- [x] `home`：header 文案（顾客版·市民扫街小店）、AI 逛街寻宝推荐、实景对比入口、mock 摊位兜底
- [ ] `stall-detail`：对照设计稿补齐结构（实景对比滑块区、公告条、优惠券领取排版）
- [ ] `reserve` / `orders`：提货码票据视觉、文案
- [ ] `my-coupons` / `wish-pool`：结构对照
- [ ] 摊主端 6 页：对照 SellerApp.tsx（assistant/products/ledger/me 四区）
- [ ] `pages/my`：对照 me 视图结构
- **验收**：逐页与设计稿并排对照无明显结构/文案差异。

### 阶段 5 · 交互细节增强（可选）
- [ ] 出摊中"脉冲"动画、火苗图标动效
- [ ] AI 实景去杂乱"前后对比"滑块（设计稿特色）
- [ ] 是否重构为 4-Tab 单页架构（顾客 map/shop/square/me）—— **大改动，需单独评估**
- **验收**：视觉细节贴近设计稿动效。

---

## 四、执行约定
- 每阶段完成后跑 `cd miniapp && npx taro build --type weapp` 验证编译。
- 一次专注一个模块，改完即可在微信开发者工具预览确认，再进下一个。
- 优先级：**阶段 0 → 1 必做且优先**（地基立起来后，后续页面改造会非常快）。
