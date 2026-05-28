<template>
    <div class="product-detail-container">
        <!-- 加载状态 -->
        <div class="loading" v-if="isLoading">
            加载中...
        </div>

        <!-- 错误提示 -->
        <div class="error" v-if="isError">
            加载失败，请稍后重试
        </div>

        <!-- 商品详情内容 -->
        <div class="product-content" v-if="product && !isLoading && !isError">
            <div class="product-img">
                <!-- 使用 el-image 组件替换原来的 img 标签 -->
                <el-image 
                    :src="product.imageUrl" 
                    alt="商品图片"
                    class="product-main-image"
                    :preview-src-list="[product.imageUrl]"
                    :preview-teleported="true"
                    fit="contain"
                    @click="previewMainImage">
                </el-image>
                <div class="like-icon" @click="handleLike">
                    <el-icon :size="24" :color="product.isFavorite ? '#faad14' : '#999'">
                        <StarFilled v-if="product.isFavorite" />
                        <Star v-else />
                    </el-icon>
                    <span class="like-count">{{ product.favorite }}</span>
                </div>
            </div>
            <div class="product-info">
                <!-- 原有内容保持不变 -->
                <h1 class="title">{{ product.name }}</h1>
                <p class="price">¥{{ product.price.toFixed(2) }}</p>

                <!-- 库存信息 -->
                <p class="stock" :class="{ low: product.stockQuantity < 100 && product.stockQuantity > 0 }">
                    库存：{{ product.stockQuantity }}件
                    <span v-if="product.stockQuantity < 100 && product.stockQuantity > 0"
                        class="stock-warning">库存紧张</span>
                    <span v-if="product.stockQuantity <= 0" class="stock-out">已售罄</span>
                </p>

                <!-- 评分信息区域 - 新增部分 -->
                <div class="ratings-container">
                    <div class="rating-card">
                        <span class="rating-label">商品评分</span>
                        <strong class="rating-value">
                            <el-icon><StarFilled /></el-icon>
                            {{ formatScore(product.rating) }}
                        </strong>
                        <span class="rating-count">{{ product.ratingCount || 0 }} 条评价</span>
                    </div>
                    <div class="rating-card">
                        <span class="rating-label">商家评分</span>
                        <strong class="rating-value">
                            <el-icon><StarFilled /></el-icon>
                            {{ formatScore(product.merchant.merchantRating) }}
                        </strong>
                        <span class="rating-count">{{ product.merchant.merchantRatingCount || 0 }} 条评价</span>
                    </div>
                </div>

                <div class="purchase-control">
                    <span class="purchase-label">购买数量</span>
                    <ElInputNumber :min="1" :max="Math.max(product.stockQuantity, 1)" :step="1"
                        v-model="cartForm.quantity" :disabled="product.stockQuantity <= 0 || !product.isActive">
                    </ElInputNumber>
                    <span class="purchase-stock">库存 {{ product.stockQuantity }} 件</span>
                </div>

                <div class="merchant">
                    <!-- 新增商家Logo展示 -->
                    <div class="merchant-header">
                        <img :src="product.merchant.logoUrl || defaultMerchantLogo" 
                             :alt="product.merchant.name" 
                             class="merchant-logo"
                             @error="handleMerchantImageError">
                        <div class="merchant-info">
                            <p class="merchant-name">{{ product.merchant.name }}</p>
                            <p class="merchant-sales">累计销量：{{ product.merchant.totalSales }}件</p>
                        </div>
                    </div>
                </div>

                <p class="status">
                    状态：<span :class="product.isActive ? 'active' : 'inactive'">
                        {{ product.isActive ? '在售' : '已下架' }}
                    </span>
                </p>

                <p class="create-time">上架时间：{{ formatDate(product.createdTime) }}</p>

                <div class="description">
                    <h3>商品描述</h3>
                    <p>{{ product.description }}</p>
                </div>

                <!-- 新增：立即购买按钮 -->
                <div class="btn-group">
                    <ElButton type="primary" class="buy-btn" :disabled="!product.isActive || product.stockQuantity <= 0"
                        @click="handleAddCartItem">
                        {{ !product.isActive ? '商品已下架' : product.stockQuantity <= 0 ? '库存不足' : '加入购物车' }} </ElButton>
                            <ElButton type="success" class="buy-now-btn"
                                :disabled="!product.isActive || product.stockQuantity <= 0" @click="openBuyNowDialog">
                                {{ !product.isActive ? '商品已下架' : product.stockQuantity <= 0 ? '库存不足' : '立即购买' }}
                                    </ElButton>
                </div>
            </div>
        </div>

        <!-- 商品评论区域 -->
        <div class="product-reviews-container" v-if="product && !isLoading && !isError">
            <h2 class="reviews-title">商品评论 ({{ reviews.length }})</h2>
            <div class="reviews-content">
                <!-- 评论列表 -->
                <div class="reviews-list" v-if="reviews.length > 0">
                    <div class="review-item" v-for="review in reviews" :key="review.id">
                        <div class="review-header">
                            <div class="user-info">
                                <img :src="review.user.avatarUrl || defaultAvatar" :alt="review.user.nickName" class="user-avatar" @error="handleUserImageError">
                                <div class="user-details">
                                    <span class="username">{{ review.user.nickName }}</span>
                                    <div class="rating-stars">
                                        <span v-for="i in 5" :key="i" class="star" :class="getStarClass(i, review.rating)">★</span>
                                        <span class="rating-text">{{ review.rating }}分</span>
                                    </div>
                                </div>
                            </div>
                            <div class="review-time">{{ formatDate(review.reviewTime) }}</div>
                        </div>
                        <div class="review-content">
                            <p>{{ review.content }}</p>
                            <!-- 评论图片 -->
                            <div class="review-images" v-if="review.image">
                                <img v-for="(img, index) in review.image.split(',')" :key="index" :src="img.trim()" alt="评论图片" class="review-image" @click="previewImage(review.image.split(',').map(url => url.trim()), index)" @error="handleReviewImageError">
                            </div>
                            
                            <!-- 商家回复 -->
                            <div class="merchant-reply" v-if="review.merchantReply">
                                <div class="reply-header">
                                    <img :src="review.merchantLogoUrl || defaultMerchantLogo" :alt="review.merchantName || '商家'" class="merchant-logo" @error="handleMerchantImageError">
                                    <span class="merchant-name">{{ review.merchantName || '未知商家' }}</span>
                                    <span class="reply-time">{{ formatDate(review.replyTime) }}</span>
                                </div>
                                <div class="reply-content">
                                    {{ review.merchantReply }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 暂无评论 -->
                <div class="no-reviews" v-else>
                    <el-empty description="暂无评论，快来抢沙发吧！"></el-empty>
                </div>
            </div>
        </div>
        
        <!-- 图片预览组件 -->
        <el-image-viewer
            v-if="showImageViewer"
            :url-list="imagePreviewList"
            :initial-index="currentPreviewIndex"
            @close="closeImageViewer"
        />
    </div>

    <!-- 新增：立即购买弹窗（去掉配送方式选择） -->
    <ElDialog title="确认订单" v-model="buyNowDialogVisible" width="800px" :before-close="handleDialogClose"
        :append-to-body="true" :close-on-click-modal="false">
        <div class="order-form">
            <!-- 地址选择区域 -->
            <div class="address-section">
                <h3 class="section-title">收货地址</h3>
                <div class="address-list" v-if="addressList.length > 0">
                    <div class="address-item" v-for="address in addressList" :key="address.id"
                        :class="{ active: selectedAddressId === address.id }" @click="selectedAddressId = address.id">
                        <div class="address-header">
                            <span class="recipient">{{ address.recipient }}</span>
                            <span class="phone">{{ address.phone }}</span>
                            <span class="default-tag" v-if="address.isDefault === 1">默认地址</span>
                        </div>
                        <div class="address-detail">
                            {{ address.province }}{{ address.city }}{{ address.district }}{{ address.detail }}
                        </div>
                        <div class="postal-code">邮编：{{ address.postalCode }}</div>
                    </div>
                </div>
                <div class="no-address" v-else>
                    <el-empty description="暂无收货地址">
                        <ElButton type="primary" @click="goToAddressManage">
                            <el-icon>
                                <Plus />
                            </el-icon>
                            前往地址管理
                        </ElButton>
                    </el-empty>
                </div>
            </div>

            <!-- 商品信息区域 -->
            <div class="product-section">
                <h3 class="section-title">商品信息</h3>
                <div class="order-product-item">
                    <img :src="product.imageUrl" alt="商品图片" class="product-thumb">
                    <div class="product-info-short">
                        <p class="product-name">{{ product.name }}</p>
                        <p class="product-price">¥{{ product.price.toFixed(2) }}</p>
                    </div>
                    <div class="product-quantity-control">
                        <span>购买数量</span>
                        <ElInputNumber :min="1" :max="Math.max(product.stockQuantity, 1)" :step="1"
                            v-model="cartForm.quantity" :disabled="product.stockQuantity <= 0 || !product.isActive"
                            size="small" />
                    </div>
                </div>
            </div>

            <!-- 订单信息区域（去掉配送方式，只保留备注） -->
            <div class="order-info-section">
                <h3 class="section-title">订单信息</h3>
                <div class="form-item">
                    <label class="form-label">订单备注：</label>
                    <ElInput v-model="orderForm.remark" type="textarea" :rows="3" placeholder="请输入备注信息（选填，默认：没有备注）">
                    </ElInput>
                </div>
            </div>

            <!-- 订单汇总（去掉配送费用，只算商品总价） -->
            <div class="order-summary">
                <div class="summary-item">
                    <span>商品总价：</span>
                    <span class="price">¥{{ (product.price * cartForm.quantity).toFixed(2) }}</span>
                </div>
                <div class="summary-total">
                    <span>实付款：</span>
                    <span class="total-price">¥{{ calculateTotalAmount.toFixed(2) }}</span>
                </div>
            </div>
        </div>
        <template #footer>
            <ElButton @click="closeBuyNowDialog">取消</ElButton>
            <ElButton type="primary" @click="submitOrder" :loading="isSubmitting" :disabled="!selectedAddressId">
                <!-- 只判断地址是否选中 -->
                确认下单
            </ElButton>
        </template>
    </ElDialog>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElInputNumber, ElMessage, ElIcon, ElDialog, ElInput, ElEmpty, ElImageViewer, ElImage } from 'element-plus'; // 引入ElImage
import { Star, StarFilled, Plus } from '@element-plus/icons-vue';
import { getProductDetailApi } from '@/api/product';
import { getProductReviewsApi } from '@/api/product_review';
import { addCartItemApi } from '@/api/cart';
import { likeProductApi } from '@/api/product';
import { getAddressApi } from '@/api/address';
import { addOrder } from '@/api/order';

const router = useRouter();

// 接收路由传递的商品ID
const props = defineProps({
    id: {
        type: [String, Number],
        required: true
    }
});

// 状态管理
const product = ref(null);
const isLoading = ref(true);
const isError = ref(false);
const cartForm = ref({
    quantity: 1  // 默认数量1
});
const isLiking = ref(false);

// 新增：评论相关状态
const reviews = ref([]);
const defaultAvatar = ref('https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png');
const defaultMerchantLogo = ref('https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png');

// 新增：图片预览相关状态
const showImageViewer = ref(false);
const imagePreviewList = ref([]);
const currentPreviewIndex = ref(0);

// 新增：立即购买相关状态（去掉shippingMethod）
const buyNowDialogVisible = ref(false);
const addressList = ref([]);
const selectedAddressId = ref('');
const isSubmitting = ref(false);
const orderForm = ref({
    remark: '' // 只保留备注字段
});

// 格式化日期（原有）
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatScore = (score) => Number(score || 0).toFixed(1);

// 获取星级评分的类名
const getStarClass = (index, rating) => {
  // 计算当前星星应该显示的状态
  const floorRating = Math.floor(rating);
  const decimalPart = rating - floorRating;
  
  if (index <= floorRating) {
    // 完全填充的星星
    return 'filled';
  } else if (index === floorRating + 1 && decimalPart > 0) {
    // 半填充的星星（只要有小数部分就显示半星）
    return 'half-filled';
  } else {
    // 空星星
    return '';
  }
};

// 处理用户头像加载错误
const handleUserImageError = (event) => {
  event.target.src = defaultAvatar.value;
};

// 处理商家Logo加载错误
const handleMerchantImageError = (event) => {
  event.target.src = defaultMerchantLogo.value;
};

// 处理评论图片加载错误
const handleReviewImageError = (event) => {
  // 对于评论图片，我们可以选择隐藏或者设置一个默认图片
  event.target.style.display = 'none';
};

// 计算订单总金额（去掉配送费，只算商品总价）
const calculateTotalAmount = computed(() => {
    return product.value ? product.value.price * cartForm.value.quantity : 0;
});

// 修复：监听库存变化，确保数量不超过库存
watch(() => product.value?.stockQuantity, (newStock) => {
    if (newStock === undefined) return;
    // 库存<=0时，数量重置为1（但组件会禁用）
    if (newStock <= 0) {
        cartForm.value.quantity = 1;
    } else if (cartForm.value.quantity > newStock) {
        // 数量超过库存时，自动调整为最大库存
        cartForm.value.quantity = newStock;
    }
}, { immediate: true });

// 页面加载时获取商品详情、评论和地址列表
onMounted(async () => {
    try {
        isLoading.value = true;
        // 并行请求商品详情、评论和地址列表
        const [productRes, reviewsRes, addressRes] = await Promise.all([
            getProductDetailApi(props.id),
            getProductReviewsApi(props.id),
            getAddressApi()
        ]);

        // 处理商品详情
        if (productRes.code === 1) {
            product.value = productRes.data;
            // 初始化数量：如果库存>0，默认1；库存<=0，默认1（但禁用组件）
            cartForm.value.quantity = product.value.stockQuantity > 0 ? 1 : 1;
        } else {
            isError.value = true;
        }

        // 处理商品评论
        if (reviewsRes.code === 1) {
            reviews.value = reviewsRes.data || [];
        }

        // 处理地址列表
        if (addressRes.code === 1) {
            addressList.value = addressRes.data.rows;
            // 默认选中默认地址
            const defaultAddress = addressList.value.find(addr => addr.isDefault === 1);
            if (defaultAddress) {
                selectedAddressId.value = defaultAddress.id;
            } else if (addressList.value.length > 0) {
                selectedAddressId.value = addressList.value[0].id;
            }
        }
    } catch (err) {
        console.error('初始化数据失败：', err);
        isError.value = true;
    } finally {
        isLoading.value = false;
    }
});

// 新增：预览主图
const previewMainImage = () => {
    // 使用 el-image 的 preview 功能
};

// 新增：预览评论图片
const previewImage = (imageList, index) => {
    imagePreviewList.value = imageList;
    currentPreviewIndex.value = index;
    showImageViewer.value = true;
};

// 新增：关闭图片预览
const closeImageViewer = () => {
    showImageViewer.value = false;
    imagePreviewList.value = [];
    currentPreviewIndex.value = 0;
};

// 新增：打开立即购买弹窗
const openBuyNowDialog = () => {
    // 即使地址为空也打开弹窗，在弹窗中提示用户前往地址管理
    buyNowDialogVisible.value = true;
};

// 新增：前往地址管理页面
const goToAddressManage = () => {
    buyNowDialogVisible.value = false;
    router.push('/user/address').then(() => {
        ElMessage.info('请添加收货地址后再进行购买');
    });
};

const resetOrderForm = () => {
    orderForm.value = {
        remark: '' // 只重置备注
    };
};

// 新增：关闭弹窗时重置表单
const handleDialogClose = (done) => {
    resetOrderForm();
    if (typeof done === 'function') {
        done();
    } else {
        buyNowDialogVisible.value = false;
    }
};

const closeBuyNowDialog = () => {
    resetOrderForm();
    buyNowDialogVisible.value = false;
};

// 新增：提交订单（严格按照指定DTO结构）
const submitOrder = async () => {
    if (!selectedAddressId.value) {
        ElMessage.warning('请选择收货地址');
        return;
    }

    // 再次校验库存（防止提交时库存已变化）
    if (product.value.stockQuantity <= 0) {
        ElMessage.error('商品已售罄，无法提交订单');
        buyNowDialogVisible.value = false;
        return;
    }

    if (cartForm.value.quantity > product.value.stockQuantity) {
        ElMessage.error('购买数量超过库存，请调整');
        cartForm.value.quantity = product.value.stockQuantity;
        return;
    }

    if (!Number.isInteger(cartForm.value.quantity) || cartForm.value.quantity < 1) {
        ElMessage.error('购买数量不正确，请重新选择');
        cartForm.value.quantity = 1;
        return;
    }

    isSubmitting.value = true;
    try {
        // 构建订单DTO（严格匹配要求的结构）
        const orderDTO = {
            shippingAddressId: selectedAddressId.value, // 地址ID
            list: [ // 商品列表：只包含productId和quantity
                {
                    productId: product.value.id,
                    quantity: cartForm.value.quantity
                }
            ],
            remark: orderForm.value.remark || '没有备注' // 备注默认值
        };

        console.log('提交的订单数据：', orderDTO); // 可查看最终提交的结构

        const res = await addOrder(orderDTO);
        if (res.code === 1) {
            ElMessage.success('订单创建成功！');
            buyNowDialogVisible.value = false;
            // 跳转到订单详情页
            router.push(`/order/${res.data.orderId}`);
        } else {
            ElMessage.error(res.msg || '订单创建失败');
        }
    } catch (err) {
        console.error('提交订单失败：', err);
        ElMessage.error('网络错误，订单创建失败');
    } finally {
        isSubmitting.value = false;
    }
};

// 处理喜欢/取消喜欢（原有）
const handleLike = async () => {
    if (isLiking.value) return;
    try {
        isLiking.value = true;
        const res = await likeProductApi(product.value.id);
        if (res.code === 1) {
            product.value.isFavorite = !product.value.isFavorite;
            product.value.favorite += product.value.isFavorite ? 1 : -1;
            ElMessage.success(product.value.isFavorite ? '喜欢成功' : '取消喜欢');
        } else {
            ElMessage.error(res.msg || '操作失败');
        }
    } catch (err) {
        console.error('喜欢操作失败：', err);
        ElMessage.error('网络错误，操作失败');
    } finally {
        isLiking.value = false;
    }
};

// 添加购物车（原有，增加库存校验）
const handleAddCartItem = async () => {
    // 校验库存
    if (product.value.stockQuantity <= 0) {
        ElMessage.error('商品已售罄，无法添加购物车');
        return;
    }
    if (cartForm.value.quantity > product.value.stockQuantity) {
        ElMessage.error('购买数量超过库存，请调整');
        cartForm.value.quantity = product.value.stockQuantity;
        return;
    }

    cartForm.value.productId = product.value.id
    const result = await addCartItemApi(cartForm.value)
    if (result.code == 1) {
        ElMessage.success("添加成功！")
    } else {
        ElMessage.error('添加失败:' + result.msg)
    }
};
</script>

<style scoped>
/* 原有样式保持不变 */
.product-detail-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.loading,
.error {
    text-align: center;
    padding: 50px;
    font-size: 18px;
    color: #666;
}

.product-content {
    display: flex;
    gap: 30px;
    margin-top: 20px;
    background: #fff;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 修改商品图片容器样式 */
.product-img {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background-color: #f5f5f5; /* 添加背景色以更好地展示 contain 效果 */
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 新增：商品主图样式 */
.product-main-image {
    max-width: 500px;
    max-height: 500px;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.product-main-image:hover {
    transform: scale(1.02);
}

.like-icon {
    position: absolute;
    top: 15px;
    right: 15px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
}

.like-icon:hover {
    background-color: rgba(255, 255, 255, 1);
}

.like-count {
    font-size: 14px;
    color: #666;
}

.ratings-container {
    margin: 10px 0;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
}

.product-rating,
.merchant-rating {
    margin-bottom: 8px;
    font-size: 16px;
    color: #666;
}

.rating-count {
    font-size: 14px;
    color: #999;
    margin-left: 5px;
}

.title {
    font-size: 24px;
    color: #333;
    margin-bottom: 20px;
    line-height: 1.5;
}

.price {
    font-size: 28px;
    color: #ff4d4f;
    margin-bottom: 15px;
    font-weight: bold;
}

.category,
.rating,
.stock,
.sku,
.status,
.create-time {
    font-size: 16px;
    color: #666;
    margin-bottom: 10px;
}

.stock.low {
    color: #faad14;
}

.stock-warning {
    background-color: #faad14;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    margin-left: 8px;
}

/* 新增：已售罄样式 */
.stock-out {
    background-color: #ff4d4f;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    margin-left: 8px;
}

/* 新增：商家信息样式 */
.merchant {
    margin: 15px 0;
    padding: 15px;
    background-color: #f5f5f5;
    border-radius: 8px;
}

.merchant-header {
    display: flex;
    align-items: center;
    gap: 15px;
}

.merchant-logo {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.merchant-info {
    flex: 1;
}

.merchant-name {
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin-bottom: 5px;
}

.merchant-sales {
    font-size: 14px;
    color: #666;
}

.purchase-control {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 14px 0;
    padding: 12px 0;
    border-top: 1px solid var(--mall-border);
    border-bottom: 1px solid var(--mall-border);
}

.purchase-label {
    color: var(--mall-text);
    font-size: 14px;
    font-weight: 700;
}

.purchase-stock {
    color: var(--mall-text-muted);
    font-size: 13px;
}

.status .active {
    color: #52c41a;
}

.status .inactive {
    color: #ff4d4f;
}

.description {
    margin: 30px 0;
    padding: 20px;
    background-color: #f9f9f9;
    border-radius: 4px;
}

.description h3 {
    font-size: 18px;
    margin-bottom: 10px;
    color: #333;
}

.description p {
    font-size: 16px;
    color: #666;
    line-height: 1.8;
}

/* 新增：按钮组样式 */
.btn-group {
    display: flex;
    gap: 15px;
    margin-top: 20px;
}

.buy-btn,
.buy-now-btn {
    padding: 12px 30px;
    font-size: 16px;
    flex: 1;
}

.buy-now-btn {
    background-color: #faad14 !important;
    border-color: #faad14 !important;
}

/* 新增：订单弹窗样式 */
.order-form {
    padding: 10px;
}

.section-title {
    font-size: 16px;
    font-weight: bold;
    margin: 15px 0;
    color: #333;
}

.address-list {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 20px;
}

.address-item {
    width: calc(50% - 8px);
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.address-item.active {
    border-color: #1890ff;
    background-color: rgba(24, 144, 255, 0.05);
}

.address-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.recipient {
    font-weight: bold;
    margin-right: 15px;
}

.default-tag {
    background-color: #1890ff;
    color: white;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
}

.address-detail {
    margin-bottom: 8px;
    color: #666;
}

.postal-code {
    font-size: 12px;
    color: #999;
}

.no-address {
    text-align: center;
    padding: 30px;
    color: #666;
}

.order-product-item {
    display: flex;
    align-items: center;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 8px;
    margin-bottom: 20px;
}

.product-thumb {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 4px;
    margin-right: 15px;
}

.product-info-short {
    flex: 1;
}

.product-name {
    margin-bottom: 8px;
    font-weight: bold;
}

.product-price {
    color: #ff4d4f;
}

.product-quantity-control {
    display: grid;
    justify-items: end;
    gap: 8px;
    color: #666;
    font-size: 14px;
}

.form-item {
    margin-bottom: 15px;
}

.form-label {
    display: inline-block;
    width: 80px;
    text-align: right;
    margin-right: 15px;
    color: #666;
}

.order-summary {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    text-align: right;
}

.summary-item {
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;
}

.summary-total {
    margin-top: 15px;
    font-size: 16px;
    font-weight: bold;
}

.total-price {
    color: #ff4d4f;
    font-size: 18px;
}

/* 修复：ElInputNumber 禁用状态样式优化 */
.el-input-number.is-disabled {
    opacity: 0.8;
    cursor: not-allowed;
}

/* 新增：商品评论样式 */
.product-reviews-container {
    margin-top: 40px;
    background: #fff;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.reviews-title {
    font-size: 22px;
    color: #333;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
}

.review-item {
    padding: 20px 0;
    border-bottom: 1px solid #eee;
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.user-details {
    display: flex;
    flex-direction: column;
}

.username {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
}

.rating-stars {
    display: flex;
    align-items: center;
    gap: 2px;
}

.star {
  color: #ddd;
  font-size: 14px;
  margin-right: 2px;
}

.star.filled {
  color: #faad14;
}

.star.half-filled {
  color: #faad14;
  position: relative;
}

.star.half-filled::before {
  content: "★";
  color: #ddd;
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  width: 50%;
}

.rating-text {
    font-size: 14px;
    color: #666;
    margin-left: 8px;
}

.review-time {
    font-size: 12px;
    color: #999;
}

.review-content p {
    font-size: 15px;
    color: #333;
    line-height: 1.6;
    margin-bottom: 15px;
}

.review-images {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 15px;
}

.review-image {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s;
    border: 1px solid #eee;
    object-fit: cover;
}

.review-image:hover {
    transform: scale(1.05);
}

/* 新增：商家回复样式 */
.merchant-reply {
    margin-top: 15px;
    padding: 15px;
    background: rgba(24, 144, 255, 0.05);
    border-radius: 8px;
    border-left: 3px solid #1890ff;
}

.reply-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.reply-content {
    font-size: 14px;
    color: #333;
    line-height: 1.5;
}

.no-reviews {
    text-align: center;
    padding: 50px 0;
}

/* 图片预览组件样式 */
.el-image-viewer__wrapper {
    z-index: 2000;
}

/* Retail detail page refinement */
.product-detail-container {
    max-width: 1200px;
    padding: 24px 20px 56px;
}

.loading,
.error {
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface);
    color: var(--mall-text-muted);
}

.product-content,
.product-reviews-container {
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    box-shadow: var(--mall-shadow);
}

.product-content {
    display: grid;
    grid-template-columns: minmax(320px, 520px) minmax(0, 1fr);
    gap: 32px;
    margin-top: 0;
    padding: 24px;
}

.product-img {
    min-height: 420px;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface-muted);
    box-shadow: none;
}

.product-main-image {
    width: 100%;
    max-width: 100%;
    max-height: 520px;
}

.product-main-image:hover,
.review-image:hover {
    transform: none;
}

.like-icon {
    top: 12px;
    right: 12px;
    border: 1px solid var(--mall-border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: var(--mall-shadow);
}

.product-info {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.title {
    margin: 0 0 12px;
    color: var(--mall-text);
    font-size: 24px;
    font-weight: 700;
    line-height: 1.35;
}

.price {
    margin: 0 0 16px;
    color: var(--mall-danger);
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
}

.ratings-container {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0 0 16px;
    padding: 12px;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface-muted);
}

.product-rating,
.merchant-rating {
    margin: 0;
    color: var(--mall-text);
    font-size: 14px;
}

.product-rating p,
.merchant-rating p {
    margin: 0;
}

.stock,
.status,
.create-time {
    margin-bottom: 10px;
    color: var(--mall-text-muted);
    font-size: 14px;
}

.merchant {
    margin: 18px 0;
    padding: 14px;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface);
}

.merchant-logo {
    width: 48px;
    height: 48px;
    border: 1px solid var(--mall-border);
    box-shadow: none;
}

.merchant-name {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
}

.merchant-sales {
    margin: 0;
    color: var(--mall-text-muted);
}

.description {
    margin: 18px 0;
    padding: 16px;
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface-muted);
}

.description h3 {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 700;
}

.description p {
    margin: 0;
    color: var(--mall-text-muted);
    font-size: 14px;
    line-height: 1.7;
}

.btn-group {
    gap: 10px;
    margin-top: auto;
    padding-top: 18px;
}

.buy-btn,
.buy-now-btn {
    height: 44px;
    padding: 0 22px;
    border-radius: 6px;
    font-size: 15px;
}

.buy-now-btn {
    background-color: var(--mall-danger) !important;
    border-color: var(--mall-danger) !important;
}

.product-reviews-container {
    margin-top: 20px;
    padding: 24px;
}

.reviews-title {
    margin: 0 0 8px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--mall-border);
    color: var(--mall-text);
    font-size: 20px;
    font-weight: 700;
}

.review-item {
    padding: 20px 0;
    border-bottom: 1px solid var(--mall-border);
}

.review-item:last-child {
    border-bottom: 0;
}

.username {
    color: var(--mall-text);
    font-weight: 600;
}

.review-content p {
    margin: 0 0 12px;
    color: var(--mall-text);
}

.review-image {
    border-radius: 6px;
}

.merchant-reply {
    border-left: 3px solid var(--mall-border-strong);
    background: var(--mall-surface-muted);
}

.reply-content {
    color: var(--mall-text-muted);
}

/* Mainstream product detail polish */
.product-detail-container {
    max-width: 1320px;
    padding: 104px 24px 64px;
}

.product-content {
    grid-template-columns: minmax(420px, 560px) minmax(0, 1fr);
    gap: 0;
    overflow: hidden;
    padding: 0;
    border-radius: 8px;
}

.product-img {
    min-height: 560px;
    border: 0;
    border-right: 1px solid var(--mall-border);
    border-radius: 0;
    background: #fff;
}

.product-main-image {
    width: 100%;
    height: 100%;
    max-height: 560px;
    padding: 24px;
}

.like-icon {
    top: 18px;
    right: 18px;
    min-width: 68px;
    justify-content: center;
    padding: 8px 12px;
}

.product-info {
    padding: 30px 32px 28px;
}

.title {
    margin-bottom: 10px;
    font-size: 28px;
    line-height: 1.32;
}

.price {
    margin-bottom: 18px;
    color: #d92d20;
    font-size: 36px;
    letter-spacing: 0;
}

.stock {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
    padding: 6px 10px;
    border-radius: 6px;
    background: #f8fafc;
    color: var(--mall-text-muted);
    font-size: 13px;
}

.stock.low {
    background: #fff8e6;
    color: #b7791f;
}

.stock-warning,
.stock-out {
    margin-left: 0;
    border-radius: 999px;
    font-size: 12px;
}

.ratings-container {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 0 0 18px;
    padding: 0;
    border: 0;
    background: transparent;
}

.rating-card {
    display: grid;
    gap: 5px;
    padding: 12px 14px;
    border: 1px solid var(--mall-border);
    border-radius: 8px;
    background: #f8fafc;
}

.rating-label {
    color: var(--mall-text-muted);
    font-size: 12px;
}

.rating-value {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--mall-text);
    font-size: 18px;
}

.rating-value .el-icon {
    color: #b7791f;
}

.rating-count {
    margin-left: 0;
    color: var(--mall-text-subtle);
    font-size: 12px;
}

.purchase-control {
    display: grid;
    grid-template-columns: 88px auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    margin: 18px 0;
    padding: 16px;
    border: 1px solid var(--mall-border);
    border-radius: 8px;
    background: #fff;
}

.purchase-control :deep(.el-input-number) {
    width: 132px;
}

.purchase-stock {
    justify-self: end;
}

.merchant {
    margin: 0 0 16px;
    padding: 16px;
    background: #fff;
}

.merchant-header {
    gap: 12px;
}

.merchant-logo {
    width: 52px;
    height: 52px;
    border-radius: 8px;
}

.merchant-name {
    color: var(--mall-text);
    font-size: 16px;
}

.status,
.create-time {
    display: inline-flex;
    align-items: center;
    margin: 0 12px 10px 0;
    color: var(--mall-text-muted);
    font-size: 13px;
}

.status .active,
.status .inactive {
    display: inline-flex;
    align-items: center;
    margin-left: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
}

.status .active {
    background: #ecfdf3;
    color: #067647;
}

.status .inactive {
    background: #fef3f2;
    color: #b42318;
}

.description {
    margin: 8px 0 20px;
    padding: 16px;
    border-radius: 8px;
    background: #f8fafc;
}

.btn-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: auto;
    padding-top: 18px;
}

.buy-btn,
.buy-now-btn {
    width: 100%;
    height: 46px;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 700;
}

.buy-btn {
    border-color: #b7c8e6 !important;
    background: #eef5ff !important;
    color: var(--mall-primary) !important;
}

.buy-now-btn {
    background-color: #d92d20 !important;
    border-color: #d92d20 !important;
}

.product-reviews-container {
    margin-top: 24px;
    padding: 26px 30px;
    border-radius: 8px;
}

.reviews-title {
    font-size: 22px;
}

.review-item {
    padding: 22px 0;
}

.user-avatar {
    width: 44px;
    height: 44px;
}

.review-content p {
    color: var(--mall-text);
    font-size: 15px;
    line-height: 1.75;
}

.merchant-reply {
    border-left-color: #d0d5dd;
    background: #f8fafc;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .product-content {
        grid-template-columns: 1fr;
        padding: 16px;
    }
    
    .product-img {
        width: 100%;
        max-width: 100%;
    }
    
    .product-main-image {
        max-width: 100%;
        max-height: 300px;
    }

    .product-img {
        min-height: 300px;
    }

    .ratings-container {
        grid-template-columns: 1fr;
    }
    
    .product-info {
        width: 100%;
    }
    
    .review-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .review-image {
        width: 70px;
        height: 70px;
    }
    
    .merchant-header {
        flex-direction: column;
        text-align: center;
    }
    
    .merchant-logo {
        width: 80px;
        height: 80px;
        margin: 0 auto 10px;
    }

    .product-detail-container {
        padding: 82px 12px 36px;
    }

    .product-content {
        gap: 0;
        padding: 0;
    }

    .product-img {
        border-right: 0;
        border-bottom: 1px solid var(--mall-border);
        border-radius: 0;
    }

    .product-info {
        padding: 20px;
    }

    .title {
        font-size: 22px;
    }

    .price {
        font-size: 30px;
    }

    .purchase-control {
        grid-template-columns: 1fr;
        align-items: start;
    }

    .purchase-stock {
        justify-self: start;
    }

    .btn-group {
        grid-template-columns: 1fr;
    }
}
</style>
