// DSML 标签剔除工具(C7.1 fix)
// 后端 DsmlSanitizer 的前端版本,算法保持一致:

const DSML_OPEN = "<｜｜DSML｜｜";   // U+FF5C 全角竖线 ×2
const DSML_CLOSE = "</｜｜DSML｜｜";

/**
 * 找到一个完整 DSML 标签的结束位置(包含标签名 + 属性 + '>')。
 * 如果 s[i] 不是 DSML 标签开头 → 返回 -1。
 * 如果 DSML 标签不闭合(到字符串末尾都没找到 '>')→ 返回 -1(交给调用方按文本处理)。
 *
 * 关键:必须把 <｜｜DSML｜｜tool_calls> 整个标签都跳过,不能只跳前缀。
 * 旧算法只跳前缀会让 "tool_calls>" / "invoke name=..." 这部分作为文本泄漏。
 */
function findDsmlTagEnd(s, i, prefix) {
    if (!s.startsWith(prefix, i)) return -1;
    let j = i + prefix.length;
    // 标签名: 字母/数字/下划线
    while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
    // 跳过属性部分: 读到 '>' 为止(处理引号字符串避免误判)
    while (j < s.length && s[j] !== ">") {
        if (s[j] === '"' || s[j] === "'") {
            const q = s[j];
            j++;
            while (j < s.length && s[j] !== q) j++;
            if (j < s.length) j++;
        } else {
            j++;
        }
    }
    if (j >= s.length) return -1;  // 不闭合的标签 → 不当 DSML 处理
    return j + 1;  // '>' 之后的位置
}

/**
 * 栈式扫描:
 * - 遇到 <｜｜DSML｜｜tagname ...> 视为 open,把当前 result 长度入栈
 * - 遇到 </｜｜DSML｜｜tagname> 视为 close,从栈顶弹出一个 open,把 result 截到该位置
 * - 其他字符:栈空 → 累积到 result;栈非空 → 在 DSML 块内,跳过
 *
 * 不平衡时不 bail 原文,而是返回「已 strip 的部分」。
 * 这样 SSE 流式 chunk 边界(可能切在 tag 内)也不会泄漏原始 DSML:
 * - 跨 chunk 的完整标签由 m.content 整段累积后在渲染层 strip 兜底
 * - 单 chunk 内的平衡 DSML 在这里就被剔除
 */
export function stripDsml(s) {
    if (s == null) return s;
    let text = s;
    // 剔除 <think>...</think> 及其不闭合变体
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "");
    text = text.replace(/<think>[\s\S]*$/g, "");
    text = text.replace(/<\/think>/g, "");

    let result = "";
    let i = 0;
    const openStack = [];

    while (i < text.length) {
        const openEnd = findDsmlTagEnd(text, i, DSML_OPEN);
        const closeEnd = openEnd < 0 ? findDsmlTagEnd(text, i, DSML_CLOSE) : -1;

        if (openEnd > 0) {
            // 找到完整 open 标签
            openStack.push(result.length);
            i = openEnd;
        } else if (closeEnd > 0) {
            // 找到完整 close 标签
            if (openStack.length === 0) {
                // 孤立的 close(没有匹配 open)— 跳过整个 close 标签
                i = closeEnd;
                continue;
            }
            const poppedAt = openStack.pop();
            result = result.substring(0, poppedAt);
            i = closeEnd;
        } else {
            // 当前字符不在任何 DSML 标签内
            if (openStack.length === 0) {
                result += text[i];
            }
            // 块内字符:跳过(已经决定这块要被 strip)
            i++;
        }
    }
    return result;
}

export { DSML_OPEN, DSML_CLOSE };
