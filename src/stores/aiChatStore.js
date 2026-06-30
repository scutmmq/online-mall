// AI chat store (Vue 3 Composition style, no Pinia).
//
// 负责：
//   1. 全局会话列表 / 当前会话
//   2. 每个会话的 messages / runStatus / lastEventId / abortController
//   3. SSE 订阅 + 事件分发
//   4. 发送消息、确认 / 取消草稿
//
// 后端约定（见 AiStreamHub#buildSseEvent）：
//   id   = 事件自增 id
//   name = 事件类型（assistant.delta / tool.started / tool.finished /
//                   draft.created / run.completed / run.failed）
//   data = JSON 字符串：{ id, runId, sessionId, messageId, type, payload, createdAt }
//          其中 payload 又是后端实体里的 JSON 字符串（嵌套）。

import { ref, reactive, computed } from "vue";
import {
    aiChatApi,
    aiListSessionsApi,
    aiListMessagesApi,
    aiConfirmDraftApi,
    aiCancelDraftApi,
} from "@/api/ai";

// ── 模块级单例状态（整个 SPA 共享一份）─────────────────────────────────
const sessions = ref([]);
const activeSessionId = ref(null);

// 每个 session 一份 state。reactive Map 本身不会被追踪为整体重渲染，
// 但具体 session 的内部对象是 reactive proxy，组件读 messages.value / runStatus 等
// 会被自动追踪。
const sessionStateMap = reactive(new Map());

// ── 派生视图（基于 activeSessionId）────────────────────────────────────
const messages = computed(() => {
    const id = activeSessionId.value;
    if (!id) return [];
    const state = sessionStateMap.get(id);
    return state ? state.messages : [];
});

const runStatus = computed(() => {
    const id = activeSessionId.value;
    if (!id) return "IDLE";
    const state = sessionStateMap.get(id);
    return state ? state.runStatus : "IDLE";
});

const lastEventId = computed(() => {
    const id = activeSessionId.value;
    if (!id) return 0;
    const state = sessionStateMap.get(id);
    return state ? state.lastEventId : 0;
});

// ── 内部辅助 ──────────────────────────────────────────────────────────
// 允许 null/undefined 作为 key —— 表示"乐观阶段，还没拿到后端创建的 sessionId"。
// 此时需要暂存 user 消息 + runStatus，等 API 返回真 sessionId 后由 sendMessage
// 负责把这条 state 的内容迁移到新 key 上、清空原 key。
function getOrCreateSessionState(sessionId) {
    if (!sessionStateMap.has(sessionId)) {
        sessionStateMap.set(sessionId, {
            messages: [],
            runStatus: "IDLE",
            lastEventId: 0,
            abortController: null,
        });
    }
    return sessionStateMap.get(sessionId);
}

// 与 src/utils/request.js 保持一致：从 localStorage 读 token。
// 注意：request.js 把 token 原样塞进 Authorization（不带 Bearer），
// 但 EventSource / fetch 默认需要 "Bearer xxx"，所以这里手工加前缀。
function getAuthToken() {
    const raw = (typeof localStorage !== "undefined" && localStorage.getItem("token")) || "";
    return raw ? `Bearer ${raw}` : "";
}

function nowIso() {
    return new Date().toISOString();
}

function makeTempId() {
    return -Date.now();
}

// ── 会话列表 / 消息加载 ────────────────────────────────────────────────
async function loadSessions() {
    try {
        const res = await aiListSessionsApi();
        if (res && res.code === 1) {
            sessions.value = Array.isArray(res.data) ? res.data : [];
        }
    } catch (e) {
        console.warn("[aiChatStore] loadSessions failed", e);
    }
}

async function loadMessages(sessionId) {
    if (!sessionId) return;
    try {
        const res = await aiListMessagesApi(sessionId);
        if (res && res.code === 1) {
            const state = getOrCreateSessionState(sessionId);
            state.messages = Array.isArray(res.data) ? res.data : [];
        }
    } catch (e) {
        console.warn("[aiChatStore] loadMessages failed", sessionId, e);
    }
}

// ── 切换会话：取消旧订阅 → 切 active → 订阅新会话 ─────────────────────
function switchSession(sessionId) {
    if (activeSessionId.value && activeSessionId.value !== sessionId) {
        unsubscribeSessionEvents(activeSessionId.value);
    }
    activeSessionId.value = sessionId || null;
    if (sessionId) {
        // 提前保证 state 存在；订阅时再读 lastEventId
        getOrCreateSessionState(sessionId);
        subscribeSessionEvents(sessionId);
    }
}

// ── 发送消息（乐观更新） ──────────────────────────────────────────────
async function sendMessage(sessionId, text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return null;
    // sid 可以是 null（首次发送，后端会创建新会话）。
    // 用 null 作为 key 暂存乐观状态，等 API 返回真 sessionId 再迁移过去。
    const sid = sessionId;
    const state = getOrCreateSessionState(sid);

    state.runStatus = "QUEUED";

    // 乐观追加 user 消息
    const userMsg = {
        id: makeTempId(),
        sessionId: sid,
        role: "user",
        content: trimmed,
        status: null,
        runId: null,
        draft: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };
    state.messages.push(userMsg);

    try {
        const res = await aiChatApi(sid || null, trimmed);
        if (res && res.code === 1) {
            const data = res.data || {};
            const {
                runId,
                userMessageId,
                assistantMessageId,
                sessionId: respSid,
            } = data;

            // 把 sessionId 绑回：首次创建会话时
            const realSid = respSid || sid;
            const realState = getOrCreateSessionState(realSid);

            // ── 迁移：从暂存 state（key 为 null 或旧 sid）迁移到 realState ──
            // 1) user 消息：把 null state 里的 userMsg 搬到 realState，更新 id + sessionId
            // 2) 清空原 state（避免 UI 在 activeSessionId 切到 realSid 之前还显示 null 的气泡）
            if (state !== realState) {
                const idx = state.messages.indexOf(userMsg);
                if (idx !== -1) state.messages.splice(idx, 1);
                userMsg.sessionId = realSid;
                if (userMessageId) userMsg.id = userMessageId;
                realState.messages.push(userMsg);
                // 把原 state 的其他内容也搬过去（理论上只有 userMsg，但保险起见全搬）
                while (state.messages.length) {
                    realState.messages.push(state.messages.shift());
                }
                state.runStatus = "IDLE";
            } else if (userMessageId) {
                // 同一 session：只更新 id
                userMsg.id = userMessageId;
            }

            // 追加 assistant 占位
            realState.messages.push({
                id: assistantMessageId || makeTempId(),
                sessionId: realSid,
                role: "assistant",
                content: "",
                status: "STREAMING",
                runId: runId || null,
                draft: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
            });

            realState.runStatus = "RUNNING";

            // 首次创建会话 → 同步 activeSessionId 并订阅 SSE
            if (!activeSessionId.value && realSid) {
                activeSessionId.value = realSid;
            }
            // 如果已经在订阅别的不相关会话，切换到当前
            if (activeSessionId.value !== realSid) {
                switchSession(realSid);
            } else {
                subscribeSessionEvents(realSid);
            }

            // 刷新会话列表（让侧边栏的 runState / messageCount 跟上）
            loadSessions();

            return data;
        } else {
            state.runStatus = "FAILED";
            const err = new Error((res && res.msg) || "send failed");
            console.error("[aiChatStore] sendMessage business fail", err);
            throw err;
        }
    } catch (e) {
        // 已经 push 进 messages 的 user 占位保留，让用户能看到自己的输入
        const cur = getOrCreateSessionState(sid);
        if (cur) cur.runStatus = "FAILED";
        console.error("[aiChatStore] sendMessage error", e);
        throw e;
    }
}

// ── SSE 订阅 ──────────────────────────────────────────────────────────
// 用 fetch + ReadableStream 拿 text/event-stream，自己解析。
// 原因：原生 EventSource 不支持自定义请求头（无法带 Authorization）。
function subscribeSessionEvents(sessionId) {
    if (!sessionId) return;
    const state = getOrCreateSessionState(sessionId);
    if (!state) return;
    if (state.abortController) {
        // 已经有连接了，不重复开
        return;
    }

    const ctrl = new AbortController();
    state.abortController = ctrl;

    const url = `/api/ai/sessions/${encodeURIComponent(sessionId)}/events?afterId=${state.lastEventId || 0}`;

    fetch(url, {
        method: "GET",
        headers: {
            Authorization: getAuthToken(),
            Accept: "text/event-stream",
        },
        signal: ctrl.signal,
    })
        .then(async (response) => {
            if (!response.ok) {
                console.error(
                    "[aiChatStore] SSE failed sessionId=",
                    sessionId,
                    "status=",
                    response.status
                );
                const cur = sessionStateMap.get(sessionId);
                if (cur) {
                    cur.runStatus = "FAILED";
                    cur.abortController = null;
                }
                return;
            }

            const reader = response.body && response.body.getReader();
            if (!reader) {
                console.error("[aiChatStore] SSE no readable body", sessionId);
                const cur = sessionStateMap.get(sessionId);
                if (cur) cur.abortController = null;
                return;
            }

            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                // 按 \n\n 切 SSE event
                let idx;
                while ((idx = buffer.indexOf("\n\n")) !== -1) {
                    const raw = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);
                    if (raw.length) processSseEvent(sessionId, raw);
                }
            }

            // 流自然结束（服务器主动 close / 网络断）
            const cur = sessionStateMap.get(sessionId);
            if (cur) cur.abortController = null;
        })
        .catch((err) => {
            if (err && err.name === "AbortError") {
                // 主动取消，静默
                return;
            }
            console.error("[aiChatStore] SSE error", sessionId, err);
            const cur = sessionStateMap.get(sessionId);
            if (cur) {
                cur.runStatus = "FAILED";
                cur.abortController = null;
            }
        });
}

function unsubscribeSessionEvents(sessionId) {
    if (!sessionId) return;
    const state = sessionStateMap.get(sessionId);
    if (!state) return;
    if (state.abortController) {
        try {
            state.abortController.abort();
        } catch (e) {
            // ignore
        }
        state.abortController = null;
    }
}

// ── 解析一条 SSE event 文本 ──────────────────────────────────────────
// 形如：
//   id: 123
//   event: assistant.delta
//   data: {"id":123,...}
function processSseEvent(sessionId, eventText) {
    const lines = eventText.split(/\r?\n/);
    let idNum = null;
    let type = null;
    let dataStr = null;

    for (const line of lines) {
        if (!line) continue;
        // SSE 注释行：以 ":" 开头，忽略
        if (line.startsWith(":")) continue;
        if (line.startsWith("id: ")) {
            const n = parseInt(line.slice(4).trim(), 10);
            if (!Number.isNaN(n)) idNum = n;
        } else if (line.startsWith("event: ")) {
            type = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
            dataStr = line.slice(6);
        } else if (line.startsWith("data:")) {
            // 容忍没有空格的写法
            dataStr = line.slice(5);
        }
    }
    if (!type) return;

    const state = getOrCreateSessionState(sessionId);
    if (!state) return;
    if (idNum !== null) state.lastEventId = idNum;

    let payload = {};
    if (dataStr) {
        try {
            payload = JSON.parse(dataStr);
        } catch {
            payload = {};
        }
    }

    // 后端 data 长这样：{ id, runId, sessionId, messageId, type, payload, createdAt }
    // 其中 payload 又是 JSON 字符串，需再解一次。
    let inner = {};
    if (payload && typeof payload.payload === "string") {
        try {
            inner = JSON.parse(payload.payload);
        } catch {
            inner = {};
        }
    } else if (payload && typeof payload.payload === "object" && payload.payload) {
        inner = payload.payload;
    }
    const runId = (payload && payload.runId) || (inner && inner.runId) || null;
    const messageId = (payload && payload.messageId) || null;

    switch (type) {
        case "assistant.delta": {
            // inner.delta / inner.content 是新增的文本片段
            const delta =
                (inner && (inner.delta || inner.content)) ||
                (payload && payload.delta) ||
                "";
            if (!delta) break;
            appendToAssistant(state, runId, messageId, delta);
            break;
        }
        case "assistant.message": {
            // 整段 assistant 消息（兜底，比如某些 Provider 不走 delta）
            const content = (inner && (inner.content || inner.delta)) || "";
            if (!content) break;
            replaceOrCreateAssistant(state, runId, messageId, content);
            break;
        }
        case "tool.started":
        case "tool.finished":
        case "draft.created": {
            // 暂存到对应 assistant 消息上
            attachMetaToAssistant(state, runId, messageId, type, inner);
            break;
        }
        case "run.completed": {
            state.runStatus = "IDLE";
            markAssistantFinished(state, runId, messageId, "COMPLETED");
            loadSessions();
            break;
        }
        case "run.failed": {
            state.runStatus = "FAILED";
            markAssistantFinished(state, runId, messageId, "FAILED", inner);
            loadSessions();
            break;
        }
        default:
            // 未知类型，忽略
            break;
    }
}

// 找到 runId / messageId 对应（或最近一个 STREAMING）的 assistant 消息
function findAssistantMsg(state, runId, messageId) {
    if (!state || !Array.isArray(state.messages)) return null;
    // 1) 精确匹配 messageId
    if (messageId) {
        const byId = state.messages.find((m) => m.role === "assistant" && m.id === messageId);
        if (byId) return byId;
    }
    // 2) 匹配 runId
    if (runId) {
        const byRun = state.messages.find((m) => m.role === "assistant" && m.runId === runId);
        if (byRun) return byRun;
    }
    // 3) 兜底：最后一条 STREAMING 的 assistant
    for (let i = state.messages.length - 1; i >= 0; i--) {
        const m = state.messages[i];
        if (m.role === "assistant" && m.status === "STREAMING") return m;
    }
    // 4) 兜底：最后一条 assistant
    for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "assistant") return state.messages[i];
    }
    return null;
}

function appendToAssistant(state, runId, messageId, delta) {
    const msg = findAssistantMsg(state, runId, messageId);
    if (!msg) return;
    msg.content = (msg.content || "") + delta;
    msg.updatedAt = nowIso();
}

function replaceOrCreateAssistant(state, runId, messageId, content) {
    const msg = findAssistantMsg(state, runId, messageId);
    if (msg) {
        msg.content = content;
        msg.updatedAt = nowIso();
    }
}

function attachMetaToAssistant(state, runId, messageId, type, inner) {
    const msg = findAssistantMsg(state, runId, messageId);
    if (!msg) return;
    if (type === "draft.created" && inner) {
        // 后端 payload 一般含 id/title/summary/type/expiresAt
        msg.draft = inner;
    }
}

function markAssistantFinished(state, runId, messageId, status, inner) {
    const msg = findAssistantMsg(state, runId, messageId);
    if (msg) {
        msg.status = status;
        msg.updatedAt = nowIso();
        if (status === "FAILED" && inner && inner.errorMessage) {
            msg.content = msg.content || inner.errorMessage;
        }
    }
}

// ── 草稿确认 / 取消 ──────────────────────────────────────────────────
async function confirmDraft(draftId) {
    if (!draftId) return null;
    try {
        const res = await aiConfirmDraftApi(draftId);
        // 乐观地把本地 draft 标成已完成（无论后端是否成功，UI 都会刷新）
        return res;
    } catch (e) {
        console.error("[aiChatStore] confirmDraft error", draftId, e);
        throw e;
    }
}

async function cancelDraft(draftId) {
    if (!draftId) return null;
    try {
        const res = await aiCancelDraftApi(draftId);
        return res;
    } catch (e) {
        console.error("[aiChatStore] cancelDraft error", draftId, e);
        throw e;
    }
}

// ── 公开 composable ──────────────────────────────────────────────────
export function useAiChatStore() {
    return {
        // reactive state
        sessions,
        activeSessionId,
        messages,
        runStatus,
        lastEventId,
        // methods
        loadSessions,
        loadMessages,
        switchSession,
        sendMessage,
        subscribeSessionEvents,
        unsubscribeSessionEvents,
        confirmDraft,
        cancelDraft,
    };
}