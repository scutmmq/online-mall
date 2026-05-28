<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
    aiChatApi,
    aiListSessionsApi,
    aiListMessagesApi,
    aiConfirmDraftApi,
    aiCancelDraftApi
} from "@/api/ai";
import MarkdownMessage from "./MarkdownMessage.vue";

// ── 宽度管理 ──────────────────────────────────────────────────────────────
const WIDTH_KEY = "ai-drawer-width";
const MIN_WIDTH = 380;
const safeMaxWidth = () => Math.max(MIN_WIDTH, window.innerWidth - 80);
const initialWidth = () => {
    try {
        const v = parseInt(localStorage.getItem(WIDTH_KEY) || "", 10);
        if (!Number.isNaN(v) && v >= MIN_WIDTH) return Math.min(v, safeMaxWidth());
    } catch {}
    return 560;
};
const drawerWidth = ref(initialWidth());
const drawerSize  = computed(() => drawerWidth.value + "px");
const router = useRouter();

// ── 拖拽 / 点击折叠手柄 ──────────────────────────────────────────────────
let resizeStartX    = 0;
let resizeStartWidth = 0;
let dragMoved       = false;
const resizing = ref(false);

const onHandleMouseDown = (e) => {
    resizeStartX     = e.clientX;
    resizeStartWidth = drawerWidth.value;
    dragMoved        = false;
    resizing.value   = true;
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup",   onResizeUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor     = "ew-resize";
    e.preventDefault();
};
const onResizeMove = (e) => {
    const delta = resizeStartX - e.clientX;   // 向左拖 → delta>0 → 宽度增大
    if (Math.abs(delta) > 4) dragMoved = true;
    const next = resizeStartWidth + delta;
    drawerWidth.value = Math.min(Math.max(MIN_WIDTH, next), safeMaxWidth());
};
const onResizeUp = () => {
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup",   onResizeUp);
    document.body.style.userSelect = "";
    document.body.style.cursor     = "";
    resizing.value = false;
    if (!dragMoved) {
        // 没有拖动 → 视为点击 → 折叠抽屉
        visible.value = false;
    } else {
        try { localStorage.setItem(WIDTH_KEY, String(drawerWidth.value)); } catch {}
    }
};
const onWindowResize = () => {
    const max = safeMaxWidth();
    if (drawerWidth.value > max) drawerWidth.value = max;
};

// ── 抽屉可见性 ────────────────────────────────────────────────────────────
const props = defineProps({ modelValue: { type: Boolean, default: false } });
const emit  = defineEmits(["update:modelValue"]);
const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit("update:modelValue", v)
});

// ── 会话 & 消息 ───────────────────────────────────────────────────────────
const sessions        = ref([]);
const currentSessionId = ref("");
const messages        = ref([]);
const inputText       = ref("");
const sending         = ref(false);
const messagesEl      = ref(null);

const scrollToBottom = async () => {
    await nextTick();
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
};

const loadSessions = async () => {
    try {
        const res = await aiListSessionsApi();
        if (res?.code === 1) sessions.value = Array.isArray(res.data) ? res.data : [];
    } catch {}
};

const openSession = async (sessionId) => {
    currentSessionId.value = sessionId;
    messages.value = [];
    try {
        const res = await aiListMessagesApi(sessionId);
        if (res?.code === 1 && Array.isArray(res.data)) {
            messages.value = res.data
                .filter(m => m.role === "user" || m.role === "assistant")
                .map(m => ({ role: m.role, content: m.content }));
        }
    } catch { ElMessage.error("加载会话失败"); }
    scrollToBottom();
};

const startNewSession = () => { currentSessionId.value = ""; messages.value = []; };

const onEnterKey = (e) => {
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
        if (res?.code === 1) {
            const data = res.data || {};
            if (!currentSessionId.value) { currentSessionId.value = data.sessionId; await loadSessions(); }
            messages.value.push({ role: "assistant", content: data.reply || "", draft: data.actionDraft || null });
            scrollToBottom();
        } else {
            ElMessage.error(res?.msg || "AI 调用失败");
            messages.value.push({ role: "assistant", content: "（AI 暂不可用，请稍后重试）" });
        }
    } catch { ElMessage.error("网络异常，请稍后重试"); }
    finally { sending.value = false; }
};

const confirmDraft = async (msg) => {
    if (!msg.draft) return;
    try {
        await ElMessageBox.confirm(
            `确定执行该操作？\n${msg.draft.title}\n${msg.draft.summary}`,
            "确认执行",
            { confirmButtonText: getConfirmText(msg.draft.type), cancelButtonText: "取消", type: "warning" }
        );
    } catch { return; }
    try {
        const res = await aiConfirmDraftApi(msg.draft.id);
        if (res?.code === 1) {
            ElMessage.success("操作已执行");
            msg.draftCompleted = true;
            handlePostConfirmNavigation(msg.draft, res.data);
        } else {
            ElMessage.error(res?.msg || "执行失败");
            msg.draftFailed = res?.msg || "执行失败";
        }
    } catch { ElMessage.error("网络异常"); }
};

const cancelDraft = async (msg) => {
    if (!msg.draft) return;
    try {
        const res = await aiCancelDraftApi(msg.draft.id);
        if (res?.code === 1) { ElMessage.info("已取消"); msg.draftCancelled = true; }
        else ElMessage.error(res?.msg || "取消失败");
    } catch { ElMessage.error("网络异常"); }
};

const getConfirmText = (type) => ({
    CREATE_ORDER:        "确认下单",
    ADD_CART_ITEM:       "确认加入购物车",
    REGISTER_MERCHANT:   "确认注册店铺",
    UPDATE_USER_PROFILE: "确认修改资料",
    UPDATE_MERCHANT:     "确认修改店铺"
}[type] || "确认执行");

const cleanupBodyStyles = () => {
    document.body.style.userSelect = "";
    document.body.style.cursor     = "";
    document.documentElement.classList.remove("el-popup-parent--hidden");
    document.body.classList.remove("el-popup-parent--hidden");
    document.documentElement.style.overflow    = "";
    document.body.style.overflow               = "";
    document.documentElement.style.paddingRight = "";
    document.body.style.paddingRight            = "";
};

const handlePostConfirmNavigation = (draft, data) => {
    visible.value = false;
    setTimeout(() => {
        cleanupBodyStyles();
        switch (draft.type) {
            case "CREATE_ORDER":
                router.push(data && (data.orderId || data.id) ? `/order/${data.orderId || data.id}` : "/user/orders");
                break;
            case "ADD_CART_ITEM":
                ElMessage.success("已加入购物车");
                break;
            case "REGISTER_MERCHANT":
                router.push("/merchant/main");
                break;
            case "UPDATE_USER_PROFILE":
            case "UPDATE_MERCHANT":
                router.go(0);
                break;
        }
    }, 260);
};

watch(visible, (val) => { if (val) loadSessions(); });
onMounted(() => {
    if (visible.value) loadSessions();
    window.addEventListener("resize", onWindowResize);
});
onBeforeUnmount(() => {
    window.removeEventListener("resize", onWindowResize);
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup",   onResizeUp);
});
</script>

<template>
    <!-- ① 拖拽/折叠手柄：teleport 到 body 避免被 el-drawer overflow 裁剪 -->
    <teleport to="body">
        <div
            v-if="visible"
            class="ai-edge-handle"
            :class="{ 'is-resizing': resizing }"
            :style="{ right: drawerWidth + 'px' }"
            title="拖动调整宽度 · 点击收起"
            @mousedown="onHandleMouseDown"
        >
            <span class="handle-arrow">❮</span>
        </div>
    </teleport>

    <!-- ② 抽屉本体：关掉默认 header，自己画 -->
    <el-drawer
        v-model="visible"
        direction="rtl"
        :size="drawerSize"
        :destroy-on-close="false"
        :modal="false"
        :with-header="false"
        :class="{ 'ai-resizing': resizing }"
    >
        <div class="ai-drawer">
            <!-- 自定义 Header -->
            <div class="ai-header">
                <span class="ai-header-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;margin-right:6px">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#7c3aed" stroke="#7c3aed" stroke-width="0.5"/>
                    </svg>
                    荒天 AI 助手
                </span>
                <div class="ai-header-right">
                    <button class="hdr-btn" title="新建会话" @click="startNewSession">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                    <button class="hdr-btn close" title="收起" @click="visible = false">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>

            <!-- 主体：侧边栏 + 聊天区 -->
            <div class="ai-body">
                <!-- 左侧会话列表 -->
                <div class="ai-sidebar">
                    <div class="ai-session-list">
                        <div
                            v-for="s in sessions"
                            :key="s.id"
                            class="ai-session-item"
                            :class="{ active: s.id === currentSessionId }"
                            @click="openSession(s.id)"
                        >
                            <div class="s-title">{{ s.title || "新会话" }}</div>
                            <div class="s-meta">{{ s.messageCount || 0 }} 条</div>
                        </div>
                        <div v-if="!sessions.length" class="ai-empty">暂无历史会话</div>
                    </div>
                </div>

                <!-- 右侧聊天区 -->
                <div class="ai-main">
                    <div ref="messagesEl" class="ai-messages">
                        <div v-if="!messages.length" class="ai-empty-tip">
                            <p>你可以这样问我：</p>
                            <ul>
                                <li>"帮我推荐 300 元以内评分高的排球"</li>
                                <li>"查询我待支付的订单"</li>
                                <li>"把第一件商品下单，用默认地址"</li>
                                <li>"帮我注册一个个人店铺，叫心雨文具"</li>
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
                                <div v-if="m.draftCompleted"  class="draft-state done">✓ 已执行</div>
                                <div v-else-if="m.draftCancelled" class="draft-state cancelled">已取消</div>
                                <div v-else-if="m.draftFailed"    class="draft-state failed">执行失败：{{ m.draftFailed }}</div>
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
                        >发送</el-button>
                    </div>
                </div>
            </div>
        </div>
    </el-drawer>
</template>

<style scoped>
/* ── 边缘手柄（通过 teleport 渲染到 body） ─────────────────────────────── */
.ai-edge-handle {
    position: fixed;
    top: 0;
    bottom: 0;
    width: 18px;
    z-index: 9999;
    cursor: ew-resize;
    background: #f4f4f6;
    border-left: 1px solid #e0e0e8;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, border-color 0.15s ease;
    user-select: none;
}
.ai-edge-handle:hover,
.ai-edge-handle.is-resizing {
    background: #ebe8f8;
    border-color: #c4b5fd;
}
.handle-arrow {
    font-size: 11px;
    color: #888;
    line-height: 1;
    pointer-events: none;
    transition: color 0.15s ease;
}
.ai-edge-handle:hover .handle-arrow,
.ai-edge-handle.is-resizing .handle-arrow {
    color: #7c3aed;
}

/* ── 抽屉整体 ────────────────────────────────────────────────────────────── */
.ai-drawer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    overflow: hidden;
}

/* 禁用拖拽过程中的过渡动画 */
:global(.ai-resizing) :global(.el-drawer),
:global(.ai-resizing) :global(.el-drawer__body) {
    transition: none !important;
}

/* ── 自定义 Header ──────────────────────────────────────────────────────── */
.ai-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 52px;
    padding: 0 14px 0 16px;
    background: #fff;
    border-bottom: 1px solid #ebebef;
}
.ai-header-title {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a2e;
    display: flex;
    align-items: center;
}
.ai-header-right {
    display: flex;
    align-items: center;
    gap: 4px;
}
.hdr-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: background 0.15s ease, color 0.15s ease;
}
.hdr-btn:hover {
    background: #f4f4f6;
    color: #333;
}
.hdr-btn.close:hover {
    background: #fee2e2;
    color: #dc2626;
}

/* ── 主体布局 ────────────────────────────────────────────────────────────── */
.ai-body {
    flex: 1;
    display: flex;
    min-height: 0;
}

/* ── 左侧会话列表 ────────────────────────────────────────────────────────── */
.ai-sidebar {
    width: 148px;
    flex: 0 0 148px;
    border-right: 1px solid #ebebef;
    display: flex;
    flex-direction: column;
    background: #fafafa;
}
.ai-session-list {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 6px 0;
}
.ai-session-item {
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
    margin: 2px 6px;
    transition: background 0.15s ease;
}
.ai-session-item:hover   { background: #f0f0f5; }
.ai-session-item.active  { background: #ede9fb; }
.s-title {
    font-size: 12.5px;
    color: #2d2d3a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.s-meta {
    font-size: 11px;
    color: #aaa;
    margin-top: 2px;
}
.ai-empty {
    color: #bbb;
    font-size: 12px;
    text-align: center;
    padding: 20px 8px;
}

/* ── 聊天主区 ────────────────────────────────────────────────────────────── */
.ai-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.ai-messages {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;   /* ← 滚轮隔离：在此区域内滚动不会穿透到主页 */
    padding: 14px 12px;
    background: #f7f7fb;
}

/* 空状态引导 */
.ai-empty-tip {
    color: #888;
    font-size: 13px;
    padding: 20px 4px;
    line-height: 1.7;
}
.ai-empty-tip p { margin: 0 0 8px; font-weight: 600; color: #555; }
.ai-empty-tip ul { margin: 0; padding-left: 16px; }
.ai-empty-tip li { margin-bottom: 4px; }

/* ── 消息气泡 ────────────────────────────────────────────────────────────── */
.ai-msg {
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
}
.ai-msg.user      { align-items: flex-end; }
.ai-msg.assistant { align-items: flex-start; }

.bubble {
    max-width: 92%;
    padding: 9px 13px;
    border-radius: 10px;
    word-wrap: break-word;
    font-size: 14px;
    line-height: 1.6;
}
.ai-msg.user .bubble {
    background: #7c3aed;
    color: #fff;
    border-bottom-right-radius: 3px;
    white-space: pre-wrap;
}
.ai-msg.assistant .bubble {
    background: #fff;
    border: 1px solid #e8e8ee;
    border-bottom-left-radius: 3px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* ── 草稿操作卡片 ────────────────────────────────────────────────────────── */
.draft-card {
    margin-top: 8px;
    padding: 12px 14px;
    border: 1px solid #e9d5a0;
    background: #fefae8;
    border-radius: 10px;
    max-width: 92%;
}
.draft-title   { font-weight: 700; color: #92400e; margin-bottom: 4px; font-size: 13.5px; }
.draft-summary { color: #44403c; font-size: 13px; white-space: pre-wrap; line-height: 1.55; }
.draft-expire  { color: #aaa; font-size: 11px; margin-top: 5px; }
.draft-actions { margin-top: 10px; display: flex; gap: 8px; }
.draft-state   { margin-top: 8px; font-size: 13px; font-weight: 600; }
.draft-state.done      { color: #16a34a; }
.draft-state.cancelled { color: #9ca3af; }
.draft-state.failed    { color: #dc2626; }

/* ── 输入区 ──────────────────────────────────────────────────────────────── */
.ai-input {
    flex: 0 0 auto;
    border-top: 1px solid #ebebef;
    padding: 10px;
    display: flex;
    gap: 8px;
    align-items: flex-end;
    background: #fff;
}
.ai-input :deep(.el-textarea) { flex: 1; }
.ai-input :deep(.el-textarea__inner) {
    background: #f7f7fb;
    border-color: #e8e8ee;
    border-radius: 8px;
    font-size: 13.5px;
    resize: none;
}
.ai-input :deep(.el-textarea__inner:focus) {
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.12);
}
</style>
