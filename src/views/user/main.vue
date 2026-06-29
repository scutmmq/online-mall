<!-- views/user/main.vue -->
<template>
    <div class="user-home">
        <!-- 用户信息卡片 -->
        <el-card class="user-card">
            <div class="user-info-container">
                <!-- 头像区域 -->
                <div class="avatar-section">
                    <el-avatar :size="100" class="user-avatar">
                        <img :src="userInfo.image || defaultAvatar" alt="用户头像" class="avatar-img">
                    </el-avatar>
                </div>

                <!-- 信息列表 -->
                <div class="info-list">
                    <h2 class="title">个人信息</h2>

                    <el-descriptions column="1" border>
                        <el-descriptions-item label="账号">
                            {{ userInfo.username || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="昵称">
                            {{ userInfo.nickName || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="性别">
                            {{ genderMap[userInfo.gender] || '未知' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="手机号">
                            {{ userInfo.phone || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="生日">
                            {{ userInfo.birthday ? formatDate(userInfo.birthday) : '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="地址">
                            {{ userInfo.address || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="最后登录时间">
                            {{ userInfo.lastLogin ? formatDate(userInfo.lastLogin) : '-' }}
                        </el-descriptions-item>
                    </el-descriptions>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getUserApi } from '@/api/user';

// 默认头像（接口返回image为空时使用）
const defaultAvatar = 'https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png';

// 用户信息（完全对应后端返回的data结构）
const userInfo = ref({});

// 性别映射（对应后端gender字段：0-男，1-女）
const genderMap = {
    0: '女',
    1: '男',
    2: '其他'
};

// 获取用户信息（仅调用/user接口）
const fetchUserInfo = async () => {
    try {
        const res = await getUserApi();
        if (res.code === 1) {
            // 直接赋值后端返回的data
            userInfo.value = res.data;
        } else {
            ElMessage.error(res.msg || '获取用户信息失败');
        }
    } catch (error) {
        ElMessage.error('获取用户信息失败');
        console.error(error);
    }
};

// 日期格式化（仅处理接口返回的时间格式）
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// 页面挂载时获取用户信息
onMounted(() => {
    fetchUserInfo();
});
</script>

<style scoped>
/* ============================================================================
   用户首页 · 荒天享物商城 —— clean blue-on-white 设计系统
   ============================================================================ */
.user-home {
    min-height: 100%;
}

.user-card {
    border: 1px solid var(--mall-border);
    border-radius: var(--mall-radius);
    background: var(--mall-surface);
    box-shadow: var(--mall-shadow);
}

.user-info-container {
    display: flex;
    gap: 40px;
    padding: 30px;
}

.avatar-section {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 10px;
}

.user-avatar {
    border: 1px solid var(--mall-border);
    transition: transform 0.2s ease;
    overflow: hidden;
}

.user-avatar:hover {
    transform: scale(1.04);
}

.avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.info-list {
    flex: 1;
    min-width: 0;
}

.title {
    margin: 0 0 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--mall-border);
    color: var(--mall-text);
    font-size: 20px;
    font-weight: 700;
}

/* 描述列表 */
:deep(.el-descriptions__label) {
    background: var(--mall-surface-muted) !important;
    color: var(--mall-text-muted) !important;
    font-weight: 600 !important;
}

:deep(.el-descriptions__content) {
    color: var(--mall-text) !important;
}

/* 响应式 */
@media (max-width: 768px) {
    .user-info-container {
        flex-direction: column;
        align-items: center;
        padding: 20px;
    }

    .info-list {
        width: 100%;
    }
}
</style>