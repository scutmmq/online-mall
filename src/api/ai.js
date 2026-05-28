import request from "@/utils/request";

export const aiChatApi = (sessionId, message) =>
    request.post("/ai/chat", { sessionId, message });

export const aiListSessionsApi = () => request.get("/ai/sessions");

export const aiListMessagesApi = (sessionId) =>
    request.get(`/ai/sessions/${sessionId}/messages`);

export const aiConfirmDraftApi = (draftId) =>
    request.post(`/ai/actions/${draftId}/confirm`);

export const aiCancelDraftApi = (draftId) =>
    request.post(`/ai/actions/${draftId}/cancel`);
