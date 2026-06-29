<template>
    <div class="common-layout">
        <el-container class="container">
            <!-- 侧边栏 -->
            <el-aside width="170px" class="aside">
                <ElMenu
                    :router="true"
                    :default-active="activeMenu"
                    :default-openeds="openMenus"
                    :unique-opened="true"
                >
                    <ElMenuItem index="/merchant/main"><el-icon>
                            <House />
                        </el-icon>首页</ElMenuItem>

                    <el-sub-menu index="products">
                        <template #title><el-icon>
                                <Goods />
                            </el-icon>商品管理</template>
                        <el-menu-item index="/merchant/products"><el-icon>
                                <Box />
                            </el-icon>商品列表</el-menu-item>
                        <el-menu-item index="/merchant/stock"><el-icon>
                                <Sell />
                            </el-icon>库存管理</el-menu-item>
                        <el-menu-item index="/merchant/inventory"><el-icon>
                                <Tickets />
                            </el-icon>库存日志</el-menu-item>
                    </el-sub-menu>

                    <el-menu-item index="/merchant/orders"><el-icon>
                            <Document />
                        </el-icon>订单管理</el-menu-item>

                    <el-menu-item index="/merchant/reviews"><el-icon>
                            <ChatLineSquare />
                        </el-icon>顾客评价</el-menu-item>

                    <el-sub-menu index="settings">
                        <template #title><el-icon>
                                <Setting />
                            </el-icon>设置</template>
                        <el-menu-item index="/merchant/profile"><el-icon>
                                <User />
                            </el-icon>商家信息</el-menu-item>
                        <el-menu-item index="/merchant/address"><el-icon>
                                <Location />
                            </el-icon>发货地址</el-menu-item>
                        <el-menu-item index="/merchant/follow"><el-icon>
                                <Star />
                            </el-icon>我的关注</el-menu-item>
                    </el-sub-menu>
                </ElMenu>
            </el-aside>

            <!-- 分割线 -->
            <div class="custom-divider"></div>

            <!-- 主内容区 -->
            <el-main class="main">
                <router-view></router-view>
            </el-main>
        </el-container>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  House, 
  Goods, 
  Box, 
  Sell, 
  Tickets, 
  Document, 
  ChatLineSquare, 
  Setting, 
  User, 
  Location, 
  Star 
} from '@element-plus/icons-vue'

const route = useRoute()

const activeMenu = computed(() => route.path)

const openMenus = computed(() => {
  const path = activeMenu.value
  if (['/merchant/products', '/merchant/stock', '/merchant/inventory'].includes(path)) return ['products']
  if (['/merchant/profile', '/merchant/address', '/merchant/follow'].includes(path)) return ['settings']
  return []
})
</script>

<style scoped>
/* ============================================================================
   商家中心 · 荒天享物商城 —— clean blue-on-white 设计系统
   ============================================================================ */
.container {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    height: calc(100dvh - 60px);
    background: var(--mall-bg);
    overflow: hidden;
}

.custom-divider {
    display: none;
}

.aside {
    width: 220px !important;
    padding: 16px 12px;
    border-right: 1px solid var(--mall-border);
    background: var(--mall-surface);
    overflow-y: auto;
}

.main {
    min-width: 0;
    padding: 24px;
    background: var(--mall-bg);
    overflow: auto;
}

:deep(.el-menu) {
    border-right: 0;
    background: transparent;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
    height: 40px;
    margin: 2px 0;
    border-radius: 6px;
    color: var(--mall-text-muted);
    transition: background-color 0.18s ease, color 0.18s ease;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
    background: var(--mall-surface-muted);
    color: var(--mall-text);
}

:deep(.el-menu-item.is-active) {
    background: var(--mall-accent-bg) !important;
    color: var(--mall-primary) !important;
}

:deep(.el-icon) {
    color: currentColor !important;
}

/* 响应式 */
@media (max-width: 768px) {
    .container {
        grid-template-columns: 1fr;
        height: auto;
        min-height: calc(100dvh - 56px);
    }

    .aside {
        width: 100% !important;
        border-right: 0;
        border-bottom: 1px solid var(--mall-border);
    }

    .main {
        padding: 16px;
    }
}
</style>
