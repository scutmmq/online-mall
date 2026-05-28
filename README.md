# 荒天享物商城 · 前端

> 基于 Vue 3 + Element Plus 构建的电商商城前端。
> 配套后端仓库：[huangtian-goods](https://github.com/scutmmq/huangtian-goods)

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API) |
| UI 组件库 | Element Plus |
| 路由 | Vue Router 4 |
| HTTP 请求 | Axios |
| Markdown 渲染 | marked + highlight.js + DOMPurify |
| 构建工具 | Vite |
| 运行时要求 | Node.js ≥ 20 |

## 功能模块

| 模块 | 说明 |
|------|------|
| 商城首页 | 三级分类侧边栏、关键词搜索、商品卡片网格 |
| 商品搜索 | 关键词 + 分类 + 价格区间筛选 |
| 商品详情 | 图片展示、规格信息、用户评价 |
| 购物车 | 按商家分组、增删改查、勾选结算 |
| 订单 | 提交订单、订单列表、订单详情 |
| 用户中心 | 个人信息、收货地址、我的收藏、我的关注、修改密码 |
| 商家后台 | 注册店铺、商品/库存/订单/评价管理 |
| AI 购物助手 | 悬浮拖动按钮 + 抽屉对话框，支持 Markdown 渲染与操作草稿确认 |

## 项目结构

```
src/
├── api/                        # 接口封装（按业务模块拆分）
├── assets/                     # 静态资源、全局样式
├── components/
│   ├── AiFloatingButton.vue    # AI 悬浮按钮（可拖动，吸附边缘）
│   ├── AiAssistantDrawer.vue   # AI 对话抽屉（支持左右拉伸）
│   ├── MarkdownMessage.vue     # Markdown 消息渲染（含代码高亮）
│   └── ProductCard.vue         # 商品卡片
├── router/                     # 路由配置
├── utils/
│   ├── request.js              # Axios 封装（Token 自动注入）
│   └── markdown.js             # Markdown 渲染工具
└── views/
    ├── layout/                 # 首页
    ├── product/                # 商品详情
    ├── search/                 # 搜索结果
    ├── cart/                   # 购物车
    ├── order/                  # 订单
    ├── user/                   # 用户中心
    └── merchant/               # 商家后台
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 构建生产包
npm run build
```

开发时 `/api` 请求会通过 Vite 代理转发至后端，配置见 `vite.config.js`。

## Docker 部署

```bash
# 构建镜像
docker build -t online-mall-web .

# 运行容器
docker run -d -p 80:80 online-mall-web
```

后端地址等配置通过 `nginx.conf.template` 中的环境变量注入。
