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
                            <House color="purple" />
                        </el-icon>首页</ElMenuItem>

                    <el-sub-menu index="products">
                        <template #title><el-icon>
                                <Goods color="green" />
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
                            <Document color="orange" />
                        </el-icon>订单管理</el-menu-item>

                    <el-menu-item index="/merchant/reviews"><el-icon>
                            <ChatLineSquare color="blue" />
                        </el-icon>顾客评价</el-menu-item>

                    <el-sub-menu index="settings">
                        <template #title><el-icon>
                                <Setting color="gray" />
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
.container {
    display: flex;
    height: calc(100vh - 60px);
    margin: 20px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    animation: fadeInUp 0.5s ease-out;
    position: relative;
    overflow: hidden;
}

.container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
    z-index: -1;
}

.aside {
    background: rgba(255, 255, 255, 0.8);
    padding: 10px;
    border-radius: 8px 0 0 8px;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(5px);
    border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.main {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 0 8px 8px 0;
    backdrop-filter: blur(5px);
}

.custom-divider {
    width: 1px;
    background: linear-gradient(to bottom, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
    margin: 0 10px;
    box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
}

/* 选中菜单高亮 */
:deep(.el-menu-item.is-active) {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%) !important;
    color: #667eea !important;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
    transform: translateY(-1px);
}

:deep(.el-menu-item) {
    margin: 2px 0;
    border-radius: 6px;
    transition: all 0.3s;
}

:deep(.el-menu-item:hover) {
    background: rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-sub-menu__title) {
    border-radius: 6px;
    transition: all 0.3s;
}

:deep(.el-sub-menu__title:hover) {
    background: rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 动画关键帧 */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 响应式调整 */
@media (max-width: 768px) {
    .container {
        margin: 0;
        border-radius: 0;
        grid-template-columns: 1fr;
        height: auto;
        min-height: calc(100dvh - 56px);
    }

    .aside {
        width: auto !important;
        border-radius: 0;
    }

    .main {
        border-radius: 0;
        padding: 16px;
    }
}

/* Unified merchant workspace */
.container {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    height: calc(100dvh - 60px);
    margin: 0;
    background: var(--mall-bg);
    border-radius: 0;
    box-shadow: none;
    backdrop-filter: none;
    animation: none;
    overflow: hidden;
}

.container::before,
.custom-divider {
    display: none;
}

.aside {
    width: 220px !important;
    padding: 16px 12px;
    border-right: 1px solid var(--mall-border);
    border-radius: 0;
    background: var(--mall-surface);
    box-shadow: none;
    backdrop-filter: none;
    overflow-y: auto;
}

.main {
    min-width: 0;
    padding: 24px;
    border-radius: 0;
    background: var(--mall-bg);
    backdrop-filter: none;
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
    box-shadow: none;
    color: var(--mall-text);
    transform: none;
}

:deep(.el-menu-item.is-active) {
    background: #eef5ff !important;
    box-shadow: none;
    color: var(--mall-primary) !important;
    transform: none;
}

:deep(.el-icon) {
    color: currentColor !important;
}
</style>
