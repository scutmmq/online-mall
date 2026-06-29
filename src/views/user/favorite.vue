<template>
    <div class="liked-products-page">
        <!-- 页面标题 -->
        <el-page-header @back="handleBack" content="我喜欢的商品" class="page-header"></el-page-header>

        <!-- 加载状态 -->
        <el-skeleton :loading="isLoading" :row="6" :loading-effect="'shine'" class="loading-container">
            <template #default>
                <!-- 空状态 -->
                <div v-if="isEmpty" class="empty-container">
                    <el-empty description="还没有喜欢的商品哦~">
                        <el-button type="primary" @click="handleBack">去逛逛</el-button>
                    </el-empty>
                </div>

                <!-- 商品列表 -->
                <div v-else class="products-grid">
                    <div class="product-card" v-for="product in likedProducts" :key="product.id"
                        @click="toProductDetail(product.id)">
                        <!-- 商品图片 -->
                        <el-image :src="product.imageUrl" :alt="product.name" class="product-img"
                            fit="cover"></el-image>

                        <!-- 商品名称 -->
                        <h3 class="product-name">{{ product.name }}</h3>

                        <!-- 价格 -->
                        <p class="product-price">¥{{ product.price.toFixed(2) }}</p>

                        <!-- 评分和商家 -->
                        <div class="product-footer">
                            <span class="product-rating"><el-icon><StarFilled /></el-icon>{{ product.rating }}</span>
                            <span class="product-merchant">{{ product.merchantName }}</span>
                        </div>

                        <!-- 商品状态标签 -->
                        <el-tag :type="product.isActive ? 'success' : 'danger'" class="status-tag">
                            {{ product.isActive ? '在售' : '已下架' }}
                        </el-tag>
                    </div>
                </div>
            </template>
        </el-skeleton>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
    ElPageHeader,
    ElSkeleton,
    ElEmpty,
    ElButton,
    ElImage,
    ElTag,
    ElMessage
} from 'element-plus';
import { getLikedProducts } from '@/api/product'; // 导入获取喜欢商品的接口

// 路由实例
const router = useRouter();

// 状态管理
const likedProducts = ref([]); // 喜欢的商品列表
const isLoading = ref(true); // 加载状态

// 计算属性：判断列表是否为空
// 计算属性：增加安全校验，处理可能的 null/undefined 情况
const isEmpty = computed(() => {
    // 先判断 likedProducts.value 是否存在，再检查 length
    return !likedProducts.value || likedProducts.value.length === 0;
});
// 页面加载时获取喜欢的商品
onMounted(async () => {
    await fetchLikedProducts();
});

// 获取喜欢的商品数据
const fetchLikedProducts = async () => {
    try {
        isLoading.value = true;
        const res = await getLikedProducts();
        if (res.code === 1) {
            likedProducts.value = res.data; // 保存商品列表
        } else {
            ElMessage.error('获取喜欢的商品失败：' + res.msg);
        }
    } catch (err) {
        console.error('获取喜欢的商品异常：', err);
        ElMessage.error('网络错误，请稍后重试');
    } finally {
        isLoading.value = false;
    }
};

// 返回上一页
const handleBack = () => {
    router.push('/')
};

// 跳转到商品详情页（与之前的详情页保持一致）
const toProductDetail = (productId) => {
    router.push(`/product/${productId}`);
};
</script>

<style scoped>
/* ============================================================================
   我的收藏 · 荒天享物商城 —— clean blue-on-white 设计系统
   ============================================================================ */
.liked-products-page {
    max-width: 1320px;
    margin: 0 auto;
    padding: 24px;
}

.page-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--mall-border);
}

.loading-container {
    margin-top: 20px;
}

.empty-container {
    margin: 50px 0;
    text-align: center;
}

/* 商品网格 */
.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    margin-top: 20px;
}

/* 商品卡片 */
.product-card {
    position: relative;
    padding: 16px;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface);
    box-shadow: var(--mall-shadow);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.product-card:hover {
    border-color: var(--mall-border-strong);
    box-shadow: var(--mall-shadow-hover);
    transform: translateY(-2px);
}

.product-img {
    width: 100%;
    height: 200px;
    border-radius: var(--mall-radius-sm);
    margin-bottom: 12px;
}

.product-name {
    height: 40px;
    margin-bottom: 8px;
    color: var(--mall-text);
    font-size: 16px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}

.product-price {
    margin-bottom: 12px;
    color: var(--mall-price);
    font-size: 18px;
    font-weight: 700;
}

.product-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--mall-text-muted);
    font-size: 12px;
}

.product-rating {
    display: inline-flex;
    align-items: center;
    gap: 3px;
}

.product-rating .el-icon {
    color: #f5a623;
    font-size: 13px;
}

.status-tag {
    position: absolute;
    top: 16px;
    right: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
    .liked-products-page {
        padding: 16px;
    }

    .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
    }

    .product-img {
        height: 160px;
    }

    .product-card {
        padding: 12px;
    }
}
</style>