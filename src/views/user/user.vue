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
                    <ElMenuItem index="/user/main"><el-icon>
                            <House />
                        </el-icon>我的首页</ElMenuItem>

                    <el-sub-menu index="orderManage">
                        <template #title><el-icon>
                                <Shop />
                            </el-icon>购物中心</template>
                        <el-menu-item index="/user/orders"><el-icon>
                                <Document />
                            </el-icon>我的订单</el-menu-item>
                        <el-menu-item index="/user/cart"><el-icon>
                                <ShoppingCartFull />
                            </el-icon>购物车</el-menu-item>
                        <el-menu-item index="/user/reviews"><el-icon>
                                <ChatLineSquare />
                            </el-icon>已评价</el-menu-item>
                    </el-sub-menu>

                    <el-sub-menu index="users">
                        <template #title><el-icon>
                                <User />
                            </el-icon>账户设置</template>
                        <el-menu-item index="/user/profile"><el-icon>
                                <EditPen />
                            </el-icon>个人信息</el-menu-item>
                        <el-menu-item index="/user/address"><el-icon>
                                <Location />
                            </el-icon>地址管理</el-menu-item>
                        <el-menu-item index="/user/password"><el-icon>
                                <Key />
                            </el-icon>修改密码</el-menu-item>
                    </el-sub-menu>

                    <el-menu-item index="/user/favorite"><el-icon>
                            <StarFilled />
                        </el-icon>我的收藏</el-menu-item>
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
  Shop, 
  Document, 
  ShoppingCartFull, 
  User, 
  EditPen, 
  Location, 
  Key, 
  StarFilled, 
  CirclePlusFilled,
  ChatLineSquare
} from '@element-plus/icons-vue'

const route = useRoute()

const activeMenu = computed(() => {
  if (route.path === '/cart') return '/user/cart'
  return route.path
})

const openMenus = computed(() => {
  const path = activeMenu.value
  if (['/user/orders', '/user/cart', '/user/reviews'].includes(path)) return ['orderManage']
  if (['/user/profile', '/user/address', '/user/password'].includes(path)) return ['users']
  return []
})
</script>

<style scoped>
/* ============================================================================
   用户中心 · 荒天享物商城 —— clean blue-on-white 设计系统
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
