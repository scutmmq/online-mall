<template>
    <div class="merchant-home">
        <!-- 加载状态 -->
        <el-skeleton v-if="loading" :rows="6" style="width: 100%"></el-skeleton>

        <!-- 错误提示 -->
        <el-alert v-if="error" title="数据加载失败" type="error" show-icon :description="errorMsg"></el-alert>

        <div v-if="merchant" class="merchant-wrap">
            <!-- 页头 -->
            <div class="page-head">
                <h1>店铺首页</h1>
                <p class="sub">欢迎回来，{{ merchant.contactPerson }}。这里是你的店铺概览。</p>
            </div>

            <!-- 店铺卡片 -->
            <div class="store-card">
                <img :src="merchant.logoUrl" alt="商家logo" class="logo" @error="handleLogoError">
                <div class="store-meta">
                    <h2 class="name">{{ merchant.name }}</h2>
                    <div class="tags">
                        <el-tag :type="statusType">{{ merchant.status }}</el-tag>
                        <el-tag type="info">{{ merchant.merchantType }}商家</el-tag>
                        <el-tag v-if="merchant.isActive" type="success">已激活</el-tag>
                        <el-tag v-else type="warning">未激活</el-tag>
                    </div>
                </div>
            </div>

            <!-- 关键指标 -->
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-ic amber"><el-icon><StarFilled /></el-icon></div>
                    <div class="stat-val">{{ merchant.rating.toFixed(1) }}</div>
                    <div class="stat-lab">店铺评分</div>
                    <div class="stat-delta">{{ merchant.ratingCount || 0 }} 条评价</div>
                </div>
                <div class="stat-card">
                    <div class="stat-ic green"><el-icon><TrendCharts /></el-icon></div>
                    <div class="stat-val">{{ merchant.totalSales }}</div>
                    <div class="stat-lab">累计销量</div>
                    <div class="stat-delta">累计至今</div>
                </div>
                <div class="stat-card">
                    <div class="stat-ic"><el-icon><Box /></el-icon></div>
                    <div class="stat-val">{{ onSaleCount }}</div>
                    <div class="stat-lab">在售商品</div>
                    <div class="stat-delta">{{ totalProducts }} 件总商品</div>
                </div>
                <div class="stat-card">
                    <div class="stat-ic rose"><el-icon><Tickets /></el-icon></div>
                    <div class="stat-val">{{ toShipCount }}</div>
                    <div class="stat-lab">待发货订单</div>
                    <div class="stat-delta">需尽快处理</div>
                </div>
            </div>

            <!-- 商家信息 + 经营数据 -->
            <div class="info-grid">
                <!-- 商家信息 -->
                <div class="info-card">
                    <div class="card-head"><h3>商家信息</h3></div>
                    <el-descriptions column="1" border>
                        <el-descriptions-item label="商家描述">{{ merchant.description || '暂无描述'
                        }}</el-descriptions-item>
                        <el-descriptions-item label="联系人">{{ merchant.contactPerson }}</el-descriptions-item>
                        <el-descriptions-item label="联系电话">{{ merchant.contactPhone }}</el-descriptions-item>
                        <el-descriptions-item label="邮箱">{{ merchant.email }}</el-descriptions-item>
                        <el-descriptions-item label="地址">{{ merchant.address }}</el-descriptions-item>
                        <el-descriptions-item label="营业执照">{{ merchant.businessLicense }}</el-descriptions-item>
                        <el-descriptions-item label="创建时间">{{ formatTime(merchant.createdTime)
                        }}</el-descriptions-item>
                        <el-descriptions-item label="更新时间">{{ formatTime(merchant.updatedTime)
                        }}</el-descriptions-item>
                    </el-descriptions>
                </div>

                <!-- 经营数据 -->
                <div class="info-card">
                    <div class="card-head"><h3>经营数据</h3></div>
                    <div class="perf-body">
                        <div class="perf-label">店铺评分</div>
                        <div class="score-row">
                            <el-rate
                                :model-value="Math.round(merchant.rating * 2) / 2"
                                disabled
                                :max="5"
                                allow-half
                            ></el-rate>
                            <span class="score">{{ merchant.rating.toFixed(1) }}</span>
                            <span class="rating-count">({{ merchant.ratingCount || 0 }} 条评价)</span>
                        </div>
                        <div class="perf-divider"></div>
                        <div class="perf-label">累计销量</div>
                        <div class="perf-num">{{ merchant.totalSales }} 件</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getMerchantOfMe } from '@/api/merchant'; // 导入接口
import { getProductsOfMeApi } from '@/api/product';
import { getMerchantOrders } from '@/api/order';

// 状态管理
const loading = ref(true);
const error = ref(false);
const errorMsg = ref('');
const merchant = ref(null);

// 指标卡数据（真实数据：在售商品 / 待发货订单）
const totalProducts = ref(0);
const onSaleCount = ref(0);
const toShipCount = ref(0);

// 加载店铺指标，失败不阻塞主页面
const loadStoreStats = async () => {
    try {
        const pRes = await getProductsOfMeApi();
        if (pRes.code === 1 && Array.isArray(pRes.data)) {
            totalProducts.value = pRes.data.length;
            onSaleCount.value = pRes.data.filter(p => p.isActive === 1 || p.isActive === '1' || p.isActive === true).length;
        }
    } catch (e) {
        console.error('加载商品统计失败', e);
    }
    try {
        const oRes = await getMerchantOrders({ status: 'paid' });
        if (oRes.code === 1 && Array.isArray(oRes.data)) {
            toShipCount.value = oRes.data.length;
        }
    } catch (e) {
        console.error('加载待发货订单统计失败', e);
    }
};

// 处理logo加载失败
const handleLogoError = (e) => {
    e.target.src = '/images/default-logo.png'; // 替换为默认图片
};

// 格式化时间
const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// 根据状态获取标签类型
const statusType = computed(() => {
    switch (merchant.value?.status) {
        case '待审核': return 'warning';
        case '已通过': return 'success';
        case '已拒绝': return 'danger';
        default: return 'info';
    }
});

// 页面加载时获取数据
onMounted(async () => {
    try {
        loading.value = true;
        const res = await getMerchantOfMe();
        if (res.code === 1) {
            merchant.value = res.data;
            loadStoreStats();
        } else {
            error.value = true;
            errorMsg.value = res.msg || '获取商家信息失败';
        }
    } catch (err) {
        error.value = true;
        errorMsg.value = '网络错误，请稍后重试';
        console.error('获取商家信息失败：', err);
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
/* ============================================================================
   商家首页 · 荒天享物商城 —— 对齐 merchant UI Kit「店铺首页」
   ============================================================================ */
.merchant-home {
    padding: 0;
}

/* 页头 */
.page-head {
    margin-bottom: 18px;
}

.page-head h1 {
    margin: 0 0 4px;
    color: var(--mall-text);
    font-size: 22px;
    font-weight: 700;
}

.page-head .sub {
    margin: 0;
    color: var(--mall-text-muted);
    font-size: 13.5px;
}

/* 店铺卡片 */
.store-card {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 18px;
    padding: 20px 24px;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface);
    box-shadow: var(--mall-shadow);
}

.logo {
    width: 72px;
    height: 72px;
    flex: 0 0 auto;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    object-fit: cover;
}

.store-meta {
    min-width: 0;
}

.store-meta .name {
    margin: 0 0 10px;
    color: var(--mall-text);
    font-size: 22px;
    font-weight: 700;
    line-height: 1.25;
}

.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

/* 关键指标卡 */
.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 18px;
}

.stat-card {
    padding: 18px 20px;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface);
    box-shadow: var(--mall-shadow);
}

.stat-ic {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    margin-bottom: 12px;
    border-radius: var(--mall-radius-sm);
    background: var(--mall-accent-bg);
    color: var(--mall-primary);
    font-size: 19px;
}

.stat-ic.amber {
    background: #fef3e2;
    color: #f5a623;
}

.stat-ic.green {
    background: #eafaf0;
    color: var(--mall-success);
}

.stat-ic.rose {
    background: #fef2f2;
    color: var(--mall-danger);
}

.stat-val {
    color: var(--mall-text);
    font-size: 28px;
    font-weight: 800;
    line-height: 1.1;
}

.stat-lab {
    margin-top: 4px;
    color: var(--mall-text-muted);
    font-size: 13px;
}

.stat-delta {
    margin-top: 4px;
    color: var(--mall-text-subtle);
    font-size: 12px;
    font-weight: 500;
}

/* 信息 + 经营数据 两栏 */
.info-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
}

.info-card {
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface);
    box-shadow: var(--mall-shadow);
    overflow: hidden;
}

.card-head {
    padding: 14px 18px;
    border-bottom: 1px solid var(--mall-border);
}

.card-head h3 {
    margin: 0;
    color: var(--mall-text);
    font-size: 15px;
    font-weight: 700;
}

.info-card :deep(.el-descriptions) {
    padding: 16px 18px;
}

.info-card :deep(.el-descriptions__label) {
    width: 110px;
    color: var(--mall-text-muted);
    background: var(--mall-surface-muted);
}

.info-card :deep(.el-descriptions__content) {
    color: var(--mall-text);
}

/* 经营数据 */
.perf-body {
    padding: 18px;
}

.perf-label {
    margin-bottom: 8px;
    color: var(--mall-text-muted);
    font-size: 13px;
}

.score-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.score {
    color: #f5a623;
    font-size: 18px;
    font-weight: 700;
}

.rating-count {
    color: var(--mall-text-subtle);
    font-size: 13px;
}

.perf-divider {
    height: 1px;
    margin: 16px 0;
    background: var(--mall-border);
}

.perf-num {
    color: var(--mall-text);
    font-size: 24px;
    font-weight: 800;
}

/* 响应式 */
@media (max-width: 1180px) {
    .info-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .store-card {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
