<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
    aiChatApi,
    aiListSessionsApi,
    aiListMessagesApi,
    aiConfirmDraftApi,
    aiCancelDraftApi
} from "@/api/ai";
import MarkdownMessage from "./MarkdownMessage.vue";

// 抽屉宽度（px）。支持从左边缘拖拽改变，宽度持久化到 localStorage。
const WIDTH_KEY = "ai-drawer-width";
const MIN_WIDTH = 380;
const safeMaxWidth = () => Math.max(MIN_WIDTH, window.innerWidth - 80);
const initialWidth = () => {
    try {
        const v = parseInt(localStorage.getItem(WIDTH_KEY) || "", 10);
        if (!Number.isNaN(v) && v >= MIN_WIDTH) {
            return Math.min(v, safeMaxWidth());
        }
    } catch {}
    return 560;
};
const drawerWidth = ref(initialWidth());
const drawerSize = computed(() => drawerWidth.value + "px");

let resizeStartX = 0;
let resizeStartWidth = 0;
const resizing = ref(false);

const onResizeMouseDown = (e) => {
    resizeStartX = e.clientX;
    resizeStartWidth = drawerWidth.value;
    resizing.value = true;
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
    e.preventDefault();
};
const onResizeMove = (e) => {
    // 抽屉从右往左展开，鼠标向左拖动应增大宽度。
    const delta = resizeStartX - e.clientX;
    const next = resizeStartWidth + delta;
    drawerWidth.value = Math.min(Math.max(MIN_WIDTH, next), safeMaxWidth());
};
const onResizeUp = () => {
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeUp);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    resizing.value = false;
    try {
        localStorage.setItem(WIDTH_KEY, String(drawerWidth.value));
    } catch {}
};
const onWindowResize = () => {
    const max = safeMaxWidth();
    if (drawerWidth.value > max) drawerWidth.value = max;
};

const props = defineProps({
    modelValue: { type: Boolean, default: false }
});
const emit = defineEmits(["update:modelValue"]);

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit("update:modelValue", v)
});

// 会话 + 消息
const sessions = ref([]);
const currentSessionId = ref("");
const messages = ref([]); // [{ role, content, draft }]
const inputText = ref("");
const sending = ref(false);
const messagesEl = ref(null);

const scrollToBottom = async () => {
    await nextTick();
    if (messagesEl.value) {
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
};

const loadSessions = async () => {
    try {
        const res = await aiListSessionsApi();
        if (res && res.code === 1) {
            sessions.value = Array.isArray(res.data) ? res.data : [];
        }
    } catch (e) {
        // 未登录等情况，request.js 已统一处理
    }
};

const openSession = async (sessionId) => {
    currentSessionId.value = sessionId;
    messages.value = [];
    try {
        const res = await aiListMessagesApi(sessionId);
        if (res && res.code === 1 && Array.isArray(res.data)) {
            messages.value = res.data
                .filter((m) => m.role === "user" || m.role === "assistant")
                .map((m) => ({ role: m.role, content: m.content }));
        }
    } catch (e) {
        ElMessage.error("加载会话失败");
    }
    scrollToBottom();
};

const startNewSession = () => {
    currentSessionId.value = "";
    messages.value = [];
};

const onEnterKey = (e) => {
    // Shift+Enter 换行；中文输入法处理中（isComposing）不发送
    if (e.shiftKey || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    sendMessage();
};

const sendMessage = async () => {
    const text = inputText.value.trim();
    if (!text || sending.value) return;
    messages.value.push({ role: "user", content: text });
    inputText.value = "";
    scrollToBottom();
    sending.value = true;
    try {
        const res = await aiChatApi(currentSessionId.value || null, text);
        if (res && res.code === 1) {
            const data = res.data || {};
            if (!currentSessionId.value) {
                currentSessionId.value = data.sessionId;
                await loadSessions();
            }
            messages.value.push({
                role: "assistant",
                content: data.reply || "",
                draft: data.actionDraft || null
            });
            scrollToBottom();
        } else {
            ElMessage.error(res?.msg || "AI 调用失败");
            messages.value.push({
                role: "assistant",
                content: "（AI 暂不可用，请稍后重试）"
            });
        }
    } catch (e) {
        ElMessage.error("网络异常，请稍后重试");
    } finally {
        sending.value = false;
    }
};

const confirmDraft = async (msg) => {
    if (!msg.draft) return;
    try {
        await ElMessageBox.confirm(
            `确定执行该操作？\n${msg.draft.title}\n${msg.draft.summary}`,
            "确认执行",
            {
                confirmButtonText: getConfirmText(msg.draft.type),
                cancelButtonText: "取消",
                type: "warning"
            }
        );
    } catch {
        return;
    }
    try {
        const res = await aiConfirmDraftApi(msg.draft.id);
        if (res && res.code === 1) {
            ElMessage.success("操作已执行");
            msg.draftCompleted = true;
            handlePostConfirmNavigation(msg.draft, res.data);
        } else {
            ElMessage.error(res?.msg || "执行失败");
            msg.draftFailed = res?.msg || "执行失败";
        }
    } catch (e) {
        ElMessage.error("网络异常");
    }
};

const cancelDraft = async (msg) => {
    if (!msg.draft) return;
    try {
        const res = await aiCancelDraftApi(msg.draft.id);
        if (res && res.code === 1) {
            ElMessage.info("已取消");
            msg.draftCancelled = true;
        } else {
            ElMessage.error(res?.msg || "取消失败");
        }
    } catch (e) {
        ElMessage.error("网络异常");
    }
};

const getConfirmText = (type) => {
    switch (type) {
        case "CREATE_ORDER":
            return "确认下单";
        case "ADD_CART_ITEM":
            return "确认加入购物车";
        case "REGISTER_MERCHANT":
            return "确认注册店铺";
        case "UPDATE_USER_PROFILE":
            return "确认修改资料";
        case "UPDATE_MERCHANT":
            return "确认修改店铺";
        default:
            return "确认执行";
    }
};

// 跳转前先把抽屉收掉、清掉 Element Plus 可能在 html/body 上残留的样式，
// 否则目标页（订单详情等）会带着 overflow:hidden / padding-right / cursor 之类的样式渲染，
// 视觉上就是“被挤压、标题被顶栏盖住”。
const cleanupBodyStyles = () => {
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    // Element Plus 抽屉用的 body lock class
    document.documentElement.classList.remove("el-popup-parent--hidden");
    document.body.classList.remove("el-popup-parent--hidden");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.documentElement.style.paddingRight = "";
    document.body.style.paddingRight = "";
};

const handlePostConfirmNavigation = (draft, data) => {
    // 先收起抽屉，等动画结束再跳，避免 body 样式残留到目标页
    visible.value = false;
    setTimeout(() => {
        cleanupBodyStyles();
        switch (draft.type) {
            case "CREATE_ORDER":
                if (data && (data.orderId || data.id)) {
                    location.href = `/order/${data.orderId || data.id}`;
                } else {
                    location.href = "/user/orders";
                }
                break;
            case "ADD_CART_ITEM":
                ElMessage.success("已加入购物车");
                break;
            case "REGISTER_MERCHANT":
                location.href = "/merchant/main";
                break;
            case "UPDATE_USER_PROFILE":
            case "UPDATE_MERCHANT":
                location.reload();
                break;
            default:
                break;
        }
    }, 260);
};

watch(visible, (val) => {
    if (val) {
        loadSessions();
    }
});

onMounted(() => {
    if (visible.value) loadSessions();
    window.addEventListener("resize", onWindowResize);
});
onBeforeUnmount(() => {
    window.removeEventListener("resize", onWindowResize);
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeUp);
});
</script>

<template>
    <el-drawer
        v-model="visible"
        title="荒天 AI 购物助手"
        direction="rtl"
        :size="drawerSize"
        :destroy-on-close="false"
        :modal="false"
        :class="{ 'ai-resizing': resizing }"
    >
        <div class="ai-drawer">
            <!-- 左边缘拖拽手柄：用于水平拉伸抽屉宽度 -->
            <div
                class="ai-resize-handle"
                title="拖动改变宽度"
                @mousedown="onResizeMouseDown"
            ></div>
            <div class="ai-sidebar">
                <div class="ai-side-header">
                    <el-button type="primary" size="small" @click="startNewSession">新建会话</el-button>
                </div>
                <div class="ai-session-list">
                    <div
                        v-for="s in sessions"
                        :key="s.id"
                        class="ai-session-item"
                        :class="{ active: s.id === currentSessionId }"
                        @click="openSession(s.id)"
                    >
                        <div class="title">{{ s.title || "新会话" }}</div>
                        <div class="meta">{{ s.messageCount || 0 }} 条 · {{ (s.updatedAt || "").slice(0, 10) }}</div>
                    </div>
                    <div v-if="!sessions.length" class="ai-empty">暂无历史会话</div>
                </div>
            </div>

            <div class="ai-main">
                <div ref="messagesEl" class="ai-messages">
                    <div v-if="!messages.length" class="ai-empty-tip">
                        <p>你可以这样问我：</p>
                        <ul>
                            <li>“帮我推荐 300 元以内评分高的排球”</li>
                            <li>“查询我待支付的订单”</li>
                            <li>“把第一件商品下单，用默认地址”</li>
                            <li>“帮我注册一个个人店铺，叫心雨文具”</li>
                        </ul>
                    </div>

                    <div
                        v-for="(m, idx) in messages"
                        :key="idx"
                        class="ai-msg"
                        :class="m.role"
                    >
                        <div class="bubble">
                            <MarkdownMessage v-if="m.role === 'assistant'" :text="m.content" />
                            <template v-else>{{ m.content }}</template>
                        </div>

                        <div v-if="m.draft" class="draft-card">
                            <div class="draft-title">{{ m.draft.title }}</div>
                            <div class="draft-summary">{{ m.draft.summary }}</div>
                            <div class="draft-expire">将于 {{ m.draft.expiresAt }} 过期</div>
                            <div v-if="m.draftCompleted" class="draft-state done">已执行</div>
                            <div v-else-if="m.draftCancelled" class="draft-state cancelled">已取消</div>
                            <div v-else-if="m.draftFailed" class="draft-state failed">执行失败：{{ m.draftFailed }}</div>
                            <div v-else class="draft-actions">
                                <el-button type="primary" size="small" @click="confirmDraft(m)">
                                    {{ getConfirmText(m.draft.type) }}
                                </el-button>
                                <el-button size="small" @click="cancelDraft(m)">取消</el-button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="ai-input">
                    <el-input
                        v-model="inputText"
                        type="textarea"
                        :rows="2"
                        placeholder="问点什么吧，回车发送，Shift+回车换行"
                        :disabled="sending"
                        resize="none"
                        @keydown.enter="onEnterKey"
                    />
                    <el-button
                        type="primary"
                        :loading="sending"
                        :disabled="!inputText.trim()"
                        @click="sendMessage"
                    >
                        发送
                    </el-button>
                </div>
            </div>
        </div>
    </el-drawer>
</template>

<style scoped>
.ai-drawer {
    display: flex;
    height: 100%;
    gap: 0;
    position: relative;
}

/* 左边缘拖拽手柄：宽 8px 但 hover 时显示成 4px 紫色条 */
.ai-resize-handle {
    position: absolute;
    top: 0;
    left: -8px;
    width: 12px;
    height: 100%;
    cursor: ew-resize;
    z-index: 30;
    background: transparent;
    transition: background 0.15s ease;
}
.ai-resize-handle::before {
    content: "";
    position: absolute;
    top: 0;
    left: 6px;
    width: 2px;
    height: 100%;
    background: transparent;
    transition: background 0.15s ease;
}
.ai-resize-handle:hover::before {
    background: rgba(124, 58, 237, 0.4);
}
:global(.ai-resizing) .ai-resize-handle::before {
    background: rgba(124, 58, 237, 0.7);
}
/* 拖拽过程中禁用文本选择和指针事件干扰 */
:global(.ai-resizing) .el-drawer__body,
:global(.ai-resizing) .el-drawer {
    transition: none !important;
}
.ai-sidebar {
    width: 150px;
    border-right: 1px solid #eee;
    display: flex;
    flex-direction: column;
}
.ai-side-header {
    padding: 8px;
    border-bottom: 1px solid #eee;
}
.ai-session-list {
    flex: 1;
    overflow-y: auto;
}
.ai-session-item {
    padding: 8px 10px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    transition: background 0.15s ease;
}
.ai-session-item:hover {
    background: #f7f7f9;
}
.ai-session-item.active {
    background: #eef5ff;
}
.ai-session-item .title {
    font-size: 13px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ai-session-item .meta {
    font-size: 11px;
    color: #999;
    margin-top: 2px;
}
.ai-empty,
.ai-empty-tip {
    color: #999;
    font-size: 12px;
    text-align: center;
    padding: 20px 8px;
}
.ai-empty-tip ul {
    text-align: left;
    margin-top: 8px;
}
.ai-main {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.ai-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: #fafafa;
}
.ai-msg {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
}
.ai-msg.user {
    align-items: flex-end;
}
.ai-msg.assistant {
    align-items: flex-start;
}
.ai-msg .bubble {
    max-width: 92%;
    padding: 8px 12px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #eee;
    word-wrap: break-word;
}
.ai-msg.user .bubble {
    white-space: pre-wrap;
}
.ai-msg.user .bubble {
    background: #eef5ff;
    border-color: #cfe2ff;
}
.draft-card {
    margin-top: 8px;
    padding: 10px 12px;
    border: 1px solid #f3d28c;
    background: #fffaee;
    border-radius: 8px;
    max-width: 90%;
}
.draft-title {
    font-weight: 600;
    color: #ad6800;
    margin-bottom: 4px;
}
.draft-summary {
    color: #333;
    font-size: 13px;
    white-space: pre-wrap;
}
.draft-expire {
    color: #999;
    font-size: 11px;
    margin-top: 4px;
}
.draft-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
}
.draft-state {
    margin-top: 8px;
    font-size: 13px;
}
.draft-state.done {
    color: #67c23a;
}
.draft-state.cancelled {
    color: #909399;
}
.draft-state.failed {
    color: #f56c6c;
}
.ai-input {
    border-top: 1px solid #eee;
    padding: 8px;
    display: flex;
    gap: 8px;
    align-items: flex-end;
    background: #fff;
}
.ai-input :deep(.el-textarea) {
    flex: 1;
}
</style>
