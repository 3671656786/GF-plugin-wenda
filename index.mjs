import ln from "node:crypto";
import w from "node:fs";
import d from "node:path";

function R(n) { return String(n ?? "").trim(); }

function getConfig(n) {
  const e = R(n.configPath);
  if (!e || !w.existsSync(e)) return {};
  try { return JSON.parse(w.readFileSync(e, "utf-8")); } catch { return {}; }
}

function saveConfig(n, updater) {
  const e = R(n.configPath);
  if (!e) return false;
  try {
    const config = getConfig(n);
    updater(config);
    w.writeFileSync(e, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch { return false; }
}

function Tn(n) {
  const config = getConfig(n);
  return R(config?.ownerOpenId) || "6E0B188704AC0611617425B687DB9034";
}

function getMasters(n) {
  const config = getConfig(n);
  return Array.isArray(config.masters) ? config.masters.filter(Boolean) : [];
}

function getBotOpenId(n) {
  const config = getConfig(n);
  if (config?.botOpenId) return R(config.botOpenId);
  try {
    return R(n?.account?.openid || n?.robot?.openid || n?.botOpenId || n?.selfOpenId || "");
  } catch { return ""; }
}

function getAtReplySetting(n, t) {
  const config = getConfig(n);
  if (t.scope === "group") {
    if (config.replyAtGroups && config.replyAtGroups[t.group_openid] !== undefined) {
      return config.replyAtGroups[t.group_openid];
    }
    return config.replyAtGlobal !== false;
  }
  if (config.replyAtPrivate !== undefined) return config.replyAtPrivate;
  return config.replyAtGlobal !== false;
}

function setAtReplySetting(n, t, val) {
  return saveConfig(n, (config) => {
    if (t.scope === "group") {
      if (!config.replyAtGroups) config.replyAtGroups = {};
      config.replyAtGroups[t.group_openid] = val;
    } else {
      config.replyAtPrivate = val;
    }
  });
}

function j(n) {
  const e = n.author && typeof n.author == "object" ? n.author : {};
  return R(n.user_openid ?? n.group_member_openid ?? n.member_openid ?? n.op_member_openid ?? n.openid ?? e.user_openid ?? e.member_openid ?? e.union_openid ?? e.id);
}

function S(n) { return R(n.group_openid ?? n.group_open_id); }

function On(n) {
  const e = String(n ?? "").trim().toLowerCase();
  return e === "member" || e === "admin" || e === "owner" ? e : "";
}

function pn(n) {
  const e = n.author && typeof n.author == "object" ? n.author : {};
  return On(e.member_role ?? n.member_role);
}

const I = new Map();

function Gn(n, e, t, r) {
  const o = R(n), i = R(e);
  if (!o || !i) return;
  let s = I.get(o);
  s || (s = new Map(), I.set(o, s));
  const c = s.get(i);
  c !== t && (s.set(i, t), c && r?.info?.(`[GF_qa] 群身份变更 ${i} ${c}→${t}`));
}

function dn(n, e) {
  const t = R(n.t);
  if (t && t !== "GROUP_AT_MESSAGE_CREATE" && t !== "GROUP_MESSAGE_CREATE" && t !== "GROUP_MEMBER_ADD") return;
  const r = S(n), o = j(n), i = pn(n);
  !r || !o || !i || Gn(r, o, i, e);
}

function In(n) {
  const e = S(n), t = j(n);
  if (!e || !t) return;
  const r = I.get(e);
  r?.has(t) && (r.delete(t), r.size === 0 && I.delete(e));
}

function Un(n) {
  const e = pn(n);
  if (e) return e;
  const t = S(n), r = j(n);
  return !t || !r ? "" : I.get(t)?.get(r) || "";
}

function isOwnerOnly(n, e) {
  const t = Tn(n), r = j(e);
  return !!t && !!r && t === r;
}

function P(n, e) {
  if (isOwnerOnly(n, e)) return true;
  const r = j(e);
  if (!r) return false;
  return getMasters(n).includes(r);
}

function Y(n, e) { return P(n, e); }

function B(n, e) {
  if (P(n, e)) return !0;
  const t = Un(e);
  return t === "owner" || t === "admin";
}

const J = "问答系统";

function Ln(n) { w.mkdirSync(d.dirname(n), { recursive: !0 }); }

function Q(n) {
  const e = String(n.dataPath || "").trim();
  if (e) return e;
  const t = String(n.pluginPath || "").trim();
  return t ? d.join(t, "data") : d.resolve("data");
}

function mn(n) { return String(n ?? "").trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 120) || "unknown"; }

function k(n, e, t) { return d.join(Q(n), J, mn(e), `${t}.json`); }

function gn(n, e) { return d.join(Q(n), J, mn(e), "撤回时间.json"); }

function Z(n, e) {
  const t = A(gn(n, e)).seconds;
  if (t == null || t === "" || !/^\d+$/.test(t)) return 0;
  const r = Number(t);
  return !Number.isInteger(r) || r < 0 || r > 600 ? 0 : r;
}

function Dn(n, e, t) { U(gn(n, e), { seconds: String(t) }); }

function x(n) { return d.join(Q(n), J, "图片数据"); }

function V(n) { return d.join(x(n), "urls.json"); }

function z(n, e, t) {
  const r = d.basename(String(e || "").trim()), o = String(t || "").trim();
  if (!r || !/^https?:\/\//i.test(o)) return;
  const i = A(V(n));
  i[r] = o, U(V(n), i);
}

function Fn(n, e) {
  const t = d.basename(String(e || "").trim());
  return t && A(V(n))[t] || "";
}

function A(n) {
  try {
    if (!w.existsSync(n)) return {};
    const e = JSON.parse(w.readFileSync(n, "utf-8"));
    if (!e || typeof e != "object" || Array.isArray(e)) return {};
    const t = {};
    for (const [r, o] of Object.entries(e)) t[String(r)] = String(o ?? "");
    return t;
  } catch { return {}; }
}

function U(n, e) {
  Ln(n), w.writeFileSync(n, `${JSON.stringify(e, null, 2)}\n`, "utf-8");
}

function q(n, e) {
  return {
    精准: A(k(n, e, "精准")),
    模糊: A(k(n, e, "模糊")),
    延时精准: A(k(n, e, "延时精准")),
    延时模糊: A(k(n, e, "延时模糊")),
    延时毫秒精准: A(k(n, e, "延时毫秒精准")),
    延时毫秒模糊: A(k(n, e, "延时毫秒模糊"))
  };
}

function Bn(n, e, t, r) {
  const o = A(k(n, e, t));
  if (Object.prototype.hasOwnProperty.call(o, r)) return o[r];
}

function qn(n, e, t, r, o) {
  const i = k(n, e, t), s = A(i);
  s[r] = o, U(i, s);
}

function Nn(n, e, t, r) {
  const o = k(n, e, t), i = A(o);
  return Object.prototype.hasOwnProperty.call(i, r) ? (delete i[r], U(o, i), !0) : !1;
}

function N(n, e, t) { U(k(n, e, t), {}); }

function zn(n, e) {
  N(n, "全局", e), N(n, "私聊", e);
  const t = d.join(Q(n), J);
  let r = 0;
  try {
    if (!w.existsSync(t)) return 0;
    for (const o of w.readdirSync(t, { withFileTypes: !0 }))
      o.isDirectory() && (o.name === "全局" || o.name === "私聊" || o.name === "图片数据" || (N(n, o.name, e), r += 1));
  } catch (o) { n.logger?.warn?.("[GF_qa] 清空全部扫描失败", o?.message || o); }
  return r;
}

function v(n) {
  const e = String(n ?? ""), t = [], r = /\[img:([^\]]+)\]/g;
  let o = 0, i;
  for (; (i = r.exec(e)) !== null; ) {
    i.index > o && t.push({ kind: "text", text: e.slice(o, i.index) });
    const s = String(i[1] || "").trim();
    s && t.push({ kind: "img", file: s }), o = r.lastIndex;
  }
  return o < e.length && t.push({ kind: "text", text: e.slice(o) }), t.length ? t : [{ kind: "text", text: e }];
}

function Hn(n, e = 80) {
  const t = String(n ?? "").replace(/\[img:[^\]]+\]/g, "[图片]").replace(/\s+/g, " ").trim();
  return t.length <= e ? t || "[图片]" : `${t.slice(0, e)}…`;
}

const hn = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36";

function Jn(n, e) { return { code: 0, msg: "success", data: { url: e, source: n } }; }

function K(n) { return { code: -1, msg: n }; }

function Qn() {
  const n = ln.randomBytes(16).toString("hex");
  return `${n.slice(0, 8)}-${n.slice(8, 12)}-4${n.slice(12, 15)}-${n.slice(16, 20)}-${n.slice(20, 32)}`;
}

function Wn(n) {
  const e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let t = "";
  for (let r = 0; r < n; r++) t += e[Math.floor(Math.random() * e.length)];
  return t;
}

function on(n) {
  let e = Buffer.from(n, "utf8").toString("base64");
  const t = (e.match(/=/g) || []).length;
  e = e.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "") + String(t);
  const r = Math.floor(e.length / 2);
  return e.slice(r) + e.slice(0, r);
}

function Yn(n) {
  return { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" }[n.toLowerCase()] || "application/octet-stream";
}

async function Kn(n) {
  if (n.buffer && n.buffer.length > 0) {
    const e = n.filename || `upload_${Date.now()}.jpg`;
    return { buffer: n.buffer, filename: e };
  }
  if (n.filepath) {
    const e = d.isAbsolute(n.filepath) ? n.filepath : d.resolve(n.filepath);
    if (!w.existsSync(e)) throw new Error("文件不存在");
    const t = w.readFileSync(e), r = n.filename || d.basename(e);
    return { buffer: t, filename: r };
  }
  if (n.url) {
    const e = await fetch(n.url, { redirect: "follow", headers: { "User-Agent": hn, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" } });
    if (!e.ok) throw new Error(`下载图片失败 HTTP ${e.status}`);
    const t = await e.arrayBuffer(), r = Buffer.from(t);
    let o = n.filename || "upload.jpg";
    try { const a = new URL(n.url), u = d.basename(a.pathname); u && u.includes(".") && (o = u); } catch {}
    const i = String(e.headers.get("content-type") || "").split(";")[0].trim().toLowerCase(), c = { "image/png": "png", "image/gif": "gif", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/bmp": "bmp" }[i];
    return c && (o = `${String(o).replace(/\.[^.]+$/, "") || "upload"}.${c}`), { buffer: r, filename: o };
  }
  throw new Error("缺少图片内容（buffer / filepath / url）");
}

async function Xn(n, e) {
  const t = d.extname(e).replace(/^\./, "").toLowerCase();
  if (!["jpg", "jpeg", "png", "gif", "bmp"].includes(t)) throw new Error("58同城不支持该格式");
  const r = `58Anonymous${Qn()}`, o = { user_id: r, source: "14", im_token: r, client_version: "1.0", client_type: "pcweb", os_type: "Chrome", os_version: "122.0.6261.95", appid: "10140-mcs@jitmouQrcHs", extend_flag: "0", unread_index: "1", sdk_version: "6432", device_id: r, xxzl_smartid: "", id58: "CkwAd2e0U3tBNxbRAzQ2Ag==" };
  const i = on(new URLSearchParams(o).toString());
  const s = on(JSON.stringify({ sender_id: r, sender_source: 14, to_id: "10002", to_source: 100, file_suffixs: [t] }));
  const c = `https://im.58.com/msg/get_pic_upload_url?params=${encodeURIComponent(i)}&version=j1.0`;
  const u = await (await fetch(c, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", Origin: "https://ai.58.com", Referer: "https://ai.58.com/pc/", "User-Agent": hn }, body: s })).text();
  const f = JSON.parse(u);
  if (f?.error_code !== 0 || !f?.data?.upload_info?.[0]?.url) throw new Error(f?.error_msg || "58同城获取上传地址失败");
  const p = String(f.data.upload_info[0].url);
  const y = await fetch(p, { method: "PUT", headers: { "Content-Type": Yn(t) }, body: new Uint8Array(n) });
  if (!y.ok) throw new Error(`58同城上传失败 HTTP ${y.status}`);
  const g = "/nowater/im/", $ = p.indexOf(g);
  if ($ < 0) throw new Error("58同城上传地址解析失败");
  const M = p.slice($ + g.length).split("?")[0];
  return `https://pic${Math.floor(Math.random() * 8) + 1}.58cdn.com.cn/nowater/im/${M}`;
}

async function Vn(n, e) {
  const t = new FormData();
  t.append("name", e), t.append("uuid", `o_${Wn(27)}`), t.append("sign", String(Math.floor(Date.now() / 1e3))), t.append("file", new Blob([new Uint8Array(n)]), e);
  const o = await (await fetch("https://img.wnflb2023.com/application/upload.php", { method: "POST", body: t, headers: { Referer: "https://img.wnflb2023.com/" } })).json();
  if (o?.code === 200 && o?.url) return String(o.url);
  throw new Error(o?.message || "fuliba 上传失败");
}

async function Zn(n, e) {
  const t = new FormData();
  t.append("image", new Blob([new Uint8Array(n)]), e);
  const o = await (await fetch("https://imgdd.com/upload", { method: "POST", body: t, headers: { Referer: "https://imgdd.com/" } })).json();
  if (o?.url) return String(o.url);
  throw new Error(o?.message || "IMGDD 上传失败");
}

async function wn(n) {
  let e, t;
  try { ({ buffer: e, filename: t } = await Kn(n)); } catch (i) { return K(i instanceof Error ? i.message : String(i)); }
  if (e.length > 10 * 1024 * 1024) return K("文件最大10M");
  const r = [{ source: "cdn58", fn: () => Xn(e, t) }, { source: "pngcm", fn: () => Vn(e, t) }, { source: "imgdd", fn: () => Zn(e, t) }], o = [];
  for (const i of r) {
    try { const s = await i.fn(); return Jn(i.source, s); }
    catch (s) { o.push(`${i.source}: ${s instanceof Error ? s.message : String(s)}`); }
  }
  return K(o.join(" | ") || "全部图床上传失败");
}

function h(n) { return String(n ?? "").trim(); }

const _n = /<@!?([A-Za-z0-9_]+)>/g;

function xn(n) { return n.replace(_n, "").replace(/\s+/g, " ").trim(); }

function yn(n) { return String(n.content ?? "").replace(_n, "").replace(/^\s+/, "").replace(/\s+$/, ""); }

function vn(n) { return xn(String(n.content ?? "")); }

// 指令前缀兼容：允许用 / 或 ／ 开头，例如 /问答系统、/添加精准问答#你好#你好呀
function stripSlash(n) { return String(n ?? "").replace(/^[\s\/／]+/, "").trim(); }

function ne(n) {
  const e = h(n.t);
  return e === "GROUP_AT_MESSAGE_CREATE" || e === "GROUP_MESSAGE_CREATE" || e === "C2C_MESSAGE_CREATE";
}

function ee(n) {
  const e = h(n.t), t = h(n.id);
  if (e === "GROUP_AT_MESSAGE_CREATE" || e === "GROUP_MESSAGE_CREATE") {
    const r = S(n);
    if (!r) throw new Error("缺少 group_openid");
    return { scope: "group", group_openid: r, msg_id: t || void 0 };
  }
  if (e === "C2C_MESSAGE_CREATE") {
    const r = j(n);
    if (!r) throw new Error("缺少 user_openid");
    return { scope: "c2c", user_openid: r, msg_id: t || void 0 };
  }
  throw new Error(`无法识别发送目标，事件类型: ${e || "未知"}`);
}

async function E(n, e, t = {}) {
  if (!n.actions?.call) throw new Error("GF_qa: 插件上下文未就绪");
  return n.actions.call(e, t, n.adapterName);
}

const te = 5;

function sn(n) { delete n.msg_id, delete n.event_id, delete n.next_msg_seq; }

function re(n) { return n.includes("被动回复") && n.includes("超过限制"); }

function oe(n) {
  if (n.scope === "group") {
    if (!n.group_openid) throw new Error("缺少 group_openid");
    return `/v2/groups/${n.group_openid}/messages`;
  }
  if (!n.user_openid) throw new Error("缺少 user_openid");
  return `/v2/users/${n.user_openid}/messages`;
}

function bn(n) {
  if (n.scope === "group") {
    if (!n.group_openid) throw new Error("缺少 group_openid");
    return `/v2/groups/${n.group_openid}`;
  }
  if (!n.user_openid) throw new Error("缺少 user_openid");
  return `/v2/users/${n.user_openid}`;
}

function nn(n, e) {
  if (e.scope === "group") {
    if (!e.group_openid) throw new Error("缺少 group_openid");
    n.group_openid = e.group_openid;
    return;
  }
  if (!e.user_openid) throw new Error("缺少 user_openid");
  n.openid = e.user_openid;
}

function ie(n) {
  if (!n.msg_id && !n.event_id) return;
  const e = n.next_msg_seq ?? 1;
  return n.next_msg_seq = e + 1, e;
}

function cn(n, e, t) {
  const r = { ...e };
  return nn(r, n), n.event_id ? r.event_id = n.event_id : n.msg_id && (r.msg_id = n.msg_id, t != null && (r.msg_seq = t)), r;
}

function se(n) { return !n.msg_id && !n.event_id ? !0 : (n.next_msg_seq ?? 1) > te; }

const ce = 3.5 * 1024 * 1024, ae = 10002432;

function D(n, e) { return ln.createHash(n).update(e).digest("hex"); }

async function ue(n, e, t) {
  const r = { file_type: 1, srv_send_msg: !1, file_data: t.toString("base64"), url: "" };
  nn(r, e);
  const o = bn(e), i = await E(n, `${o}/files`, r), s = h(i?.file_info);
  if (!s) throw new Error("富媒体上传未返回 file_info");
  return s;
}

async function fe(n, e, t, r) {
  const o = D("md5", t), i = D("sha1", t), s = D("md5", t.subarray(0, Math.min(t.length, ae))), c = bn(e), a = await E(n, `${c}/upload_prepare`, { file_type: 1, file_size: String(t.length), file_name: r, md5: o, sha1: i, md5_10m: s });
  const u = h(a?.upload_id);
  if (!u) throw new Error("upload_prepare 未返回 upload_id");
  const f = Array.isArray(a.parts) ? a.parts : [];
  if (!f.length) throw new Error("upload_prepare 未返回分片 parts");
  const p = Number(a.block_size) || 5 * 1024 * 1024, y = [...f].sort((m, b) => (typeof m.index == "number" ? m.index : 0) - (typeof b.index == "number" ? b.index : 0));
  let g = 0;
  for (const m of y) {
    const b = typeof m.index == "number" ? m.index : 0, rn = h(m.presigned_url);
    if (!rn) throw new Error(`分片 ${b} 缺少预签名 URL`);
    const Pn = Number(m.block_size) || Math.min(p, t.length - g), L = t.subarray(g, Math.min(g + Pn, t.length));
    g += L.length;
    const W = await fetch(rn, { method: "PUT", body: new Uint8Array(L) });
    if (!W.ok) { const Cn = await W.text().catch(() => ""); throw new Error(`分片 PUT 失败 ${W.status}: ${Cn.slice(0, 200)}`); }
    await E(n, `${c}/upload_part_finish`, { upload_id: u, part_index: b, block_size: String(L.length), md5: D("md5", L) });
  }
  const $ = { file_type: 1, srv_send_msg: !1, upload_id: u, file_name: r };
  nn($, e);
  const M = await E(n, `${c}/files`, $), C = h(M?.file_info);
  if (!C) throw new Error("分片合并未返回 file_info");
  return C;
}

function Sn(n, e) {
  const t = d.basename(h(e));
  if (!t) throw new Error("图片文件名为空");
  return d.join(x(n), t);
}

async function le(n, e, t) {
  if (!w.existsSync(t)) throw new Error(`本地图片不存在: ${t}`);
  const r = w.readFileSync(t);
  if (!r.length) throw new Error(`本地图片为空: ${t}`);
  const o = d.basename(t) || "image.png";
  if (r.length <= ce)
    try { return await ue(n, e, r); } catch (i) { n.logger?.warn?.("[GF_qa] file_data 上传失败，改分片:", i?.message || i); }
  return fe(n, e, r, o);
}

function $n(n, e = 96) {
  const t = String(n || "").trim();
  return t ? `![图#${e}px #${e}px](${t})` : "";
}

function pe(n) {
  try {
    const e = new URL(n).hostname.toLowerCase();
    return e.includes("qq.com") || e.includes("gtimg") || e.includes("qpic.cn") ? !1 : /^https?:\/\//i.test(n);
  } catch { return !1; }
}

async function En(n, e, t) {
  const r = Fn(n, e);
  if (r && pe(r)) return r;
  const o = Sn(n, e);
  if (w.existsSync(o)) {
    const s = await wn({ filepath: o, filename: d.basename(o) });
    if (s.code === 0 && s.data?.url) return z(n, e, s.data.url), s.data.url;
    n.logger?.warn?.("[GF_qa] 图床上传失败:", s.msg);
  }
  const i = String(r || "").trim();
  return /^https?:\/\//i.test(i) ? (r || z(n, e, i), i) : "";
}

async function An(n, e, t = 96) {
  const r = v(e);
  let o = "";
  for (const i of r) {
    if (i.kind === "text") { o += i.text; continue; }
    const s = await En(n, i.file);
    o += s ? `\n${$n(s, t)}\n` : " [图片] ";
  }
  return o.trim();
}

async function an(n, e, t, r) {
  const o = oe(e);
  if (t.kind === "markdown") {
    const i = { content: "1", msg_type: 2, markdown: { content: t.content } };
    t.keyboard && (i.keyboard = { content: t.keyboard });
    return E(n, o, cn(e, i, r));
  }
  const i = await le(n, e, t.absPath);
  return E(n, o, cn(e, { msg_type: 7, media: { file_info: i } }, r));
}

async function Rn(n, e, t) {
  se(e) && (e.msg_id || e.event_id) && sn(e);
  const r = !!(e.msg_id || e.event_id), o = ie(e);
  try { return await an(n, e, t, o); }
  catch (i) {
    const s = i instanceof Error ? i.message : String(i);
    if (r && re(s)) return sn(e), n.logger?.warn?.("[GF_qa] 被动超限，改为主动重试:", s), an(n, e, t, void 0);
    throw i;
  }
}

async function G(n, e, t, r) {
  const o = String(t ?? "").trim();
  return o ? Mn(await Rn(n, e, { kind: "markdown", content: o, keyboard: r })) : [];
}

async function de(n, e, t) { return Mn(await Rn(n, e, { kind: "image", absPath: t })); }

function me(n) {
  if (!n || typeof n != "object") return "";
  const e = n, t = e.data && typeof e.data == "object" ? e.data : e;
  return h(t.id ?? t.msg_id ?? t.message_id ?? e.id ?? e.msg_id ?? "");
}

function Mn(n) {
  const e = me(n);
  return e ? [e] : [];
}

async function ge(n, e, t) {
  const r = h(t);
  if (!r) throw new Error("message_id 为空");
  if (e.scope === "group") {
    const i = h(e.group_openid);
    if (!i) throw new Error("缺少 group_openid");
    return E(n, `/v2/groups/${i}/messages/${r}`, { __method: "DELETE" });
  }
  const o = h(e.user_openid);
  if (!o) throw new Error("缺少 user_openid");
  return E(n, `/v2/users/${o}/messages/${r}`, { __method: "DELETE" });
}

const H = new Set();

function en(n, e, t, r) {
  const o = t.map(h).filter(Boolean);
  if (!o.length || !Number.isInteger(r) || r < 1 || r > 600) return;
  const i = { scope: e.scope, group_openid: e.group_openid, user_openid: e.user_openid };
  const s = setTimeout(() => {
    H.delete(s), (async () => {
      for (const c of o) try { await ge(n, i, c); } catch (a) { n.logger?.warn?.("[GF_qa] 撤回失败:", a?.message || a); }
    })();
  }, r * 1e3);
  H.add(s);
}

function he() { for (const n of H) clearTimeout(n); H.clear(); }

async function we(n, e, t, r) {
  let o = "";
  const i = [];
  for (const a of t) {
    if (a.kind === "text") { o += a.text; continue; }
    const u = await En(n, a.file);
    u ? o += `\n${$n(u, 240)}\n` : i.push(a.file);
  }
  const s = [String(r || "").trim(), o.trim()].filter(Boolean).join(`\n\n`), c = [];
  s && c.push(...await G(n, e, s));
  for (const a of i) c.push(...await de(n, e, Sn(n, a)));
  return c;
}

const T = 3500;

async function _e(n, e, t) {
  const r = String(t ?? "").trim();
  if (!r) return [];
  const o = [];
  if (r.length <= T) return o.push(...await G(n, e, r)), o;
  let i = r;
  for (; i.length; ) {
    if (i.length <= T) { o.push(...await G(n, e, i)); break; }
    let s = i.lastIndexOf(`\n`, T);
    s < T / 2 && (s = T), o.push(...await G(n, e, i.slice(0, s))), i = i.slice(s).replace(/^\n+/, "");
  }
  return o;
}

function ye(n) {
  const e = n, t = e.d && typeof e.d == "object" ? e.d : void 0, r = e.attachments ?? t?.attachments;
  if (!Array.isArray(r)) return [];
  const o = [];
  for (const i of r) {
    if (!i || typeof i != "object") continue;
    const s = i, c = h(s.url);
    if (!/^https?:\/\//i.test(c)) continue;
    const a = h(s.content_type ?? s.contentType).toLowerCase(), u = h(s.filename ?? s.file_name);
    (a.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)(?:$|\?)/i.test(u) || /\.(jpe?g|png|gif|webp|bmp)(?:$|\?)/i.test(c)) && o.push({ url: c, filename: u, content_type: a });
  }
  return o;
}

function be(n) {
  const e = { "image/png": "png", "image/gif": "gif", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/bmp": "bmp" };
  if (e[n.content_type]) return e[n.content_type];
  const t = n.filename.match(/\.(jpe?g|png|gif|webp|bmp)$/i) || n.url.match(/\.(jpe?g|png|gif|webp|bmp)(?:$|\?)/i);
  return t ? t[1].toLowerCase().replace("jpeg", "jpg") : "png";
}

async function Se(n, e) {
  const t = ye(e);
  if (!t.length) return [];
  const r = x(n);
  w.mkdirSync(r, { recursive: !0 });
  const o = [];
  for (const i of t) {
    const s = await fetch(i.url);
    if (!s.ok) throw new Error(`第 ${o.length + 1} 张图片下载失败 HTTP ${s.status}`);
    const c = Buffer.from(await s.arrayBuffer());
    if (!c.length) throw new Error(`第 ${o.length + 1} 张图片为空`);
    const a = be(i), u = `${Date.now()}_${Math.floor(Math.random() * 9e4 + 1e4)}.${a}`;
    w.writeFileSync(d.join(r, u), c);
    const f = await wn({ buffer: c, filename: u });
    f.code === 0 && f.data?.url ? z(n, u, f.data.url) : (n.logger?.warn?.("[GF_qa] 图床失败，暂用原链:", f.msg), /^https?:\/\//i.test(i.url) && z(n, u, i.url)), o.push(u);
  }
  return o;
}

function parseStoredEntry(raw) {
  if (raw == null) return null;
  let at = undefined;
  let content = String(raw);
  const atIdx = content.lastIndexOf('\u0001at=');
  if (atIdx >= 0) { const flag = content.slice(atIdx + 4); at = flag === '1'; content = content.slice(0, atIdx); }
  const parts = content.split('\u0000');
  const answer = parts[0] || '';
  const delay = parseInt(parts[1] || '0', 10) || 0;
  return { answer, delay, at };
}

function $e(n, e) {
  if (!e) return null;
  if (n.精准[e]) { const p = parseStoredEntry(n.精准[e]); return { type: "精准", answer: p.answer, delay: 0, at: p.at }; }
  for (const t of Object.keys(n.模糊)) if (t && e.includes(t)) { const p = parseStoredEntry(n.模糊[t]); return { type: "模糊", answer: p.answer, delay: 0, at: p.at }; }
  if (n.延时精准[e]) { const p = parseStoredEntry(n.延时精准[e]); return { type: "延时精准", answer: p.answer, delay: p.delay * 1000, at: p.at }; }
  for (const t of Object.keys(n.延时模糊)) if (t && e.includes(t)) { const p = parseStoredEntry(n.延时模糊[t]); return { type: "延时模糊", answer: p.answer, delay: p.delay * 1000, at: p.at }; }
  if (n.延时毫秒精准[e]) { const p = parseStoredEntry(n.延时毫秒精准[e]); return { type: "延时毫秒精准", answer: p.answer, delay: p.delay, at: p.at }; }
  for (const t of Object.keys(n.延时毫秒模糊)) if (t && e.includes(t)) { const p = parseStoredEntry(n.延时毫秒模糊[t]); return { type: "延时毫秒模糊", answer: p.answer, delay: p.delay, at: p.at }; }
  return null;
}

function Ee(n, e, t) {
  if (!e) return null;
  const r = ["全局", t];
  for (const o of r) { const i = $e(q(n, o), e); if (i != null) return { ...i, scope: o }; }
  return null;
}

const Ae = 3;

function Re(n) {
  const e = v(n);
  let t = 0, r = "";
  for (const s of e) s.kind === "img" ? t += 1 : r += s.text;
  const o = r.replace(/\r\n/g, `\n`), i = o.length ? Math.ceil(o.split(`\n`).length / 4) : 0;
  return Math.max(1, i + t);
}

function Me(n, e) {
  if (!n.length) return [];
  const t = Math.max(1, e), r = [];
  let o = [], i = 0;
  for (const s of n) o.length > 0 && i + s.cost > t && (r.push(o), o = [], i = 0), o.push(s), i += s.cost;
  return o.length && r.push(o), r;
}

function kn(n, e) {
  const t = String(n ?? ""), r = e == null || e === "" ? t : e, o = encodeURIComponent(t), i = encodeURIComponent(r);
  return `<qqbot-cmd-input text="${o}" show="${i}" reference="false"/>`;
}

// ============ ⌨️ 键盘按钮（非蓝字，点击把指令填入聊天输入框） ============
// type=2 为「指令按钮」：点击后把 action.data 的内容填进输入框。
// enter=false → 只填入、不自动发送；改成 true 则点一下就直接发出。
function kbBtn(id, label, data, style = 1) {
  const t = String(label ?? "").slice(0, 20) || "按钮";
  return {
    id: String(id),
    render_data: { label: t, visited_label: t, style },
    action: {
      type: 2,
      permission: { type: 2 },
      data: String(data ?? "").slice(0, 100),
      enter: false,
      unsupport_tips: "当前客户端不支持此操作"
    }
  };
}

function buildKeyboard(rows) {
  const r = (Array.isArray(rows) ? rows : []).filter((x) => Array.isArray(x) && x.length).slice(0, 5);
  if (!r.length) return void 0;
  return { rows: r.map((row) => ({ buttons: row.slice(0, 5) })) };
}

// 主菜单底部的「常用功能」按钮
const MAIN_KEYBOARD = buildKeyboard([[
  kbBtn("qa_btn_menu", "问答菜单", "问答菜单"),
  kbBtn("qa_btn_list", "问答词列表", "问答词列表#1"),
  kbBtn("qa_btn_me", "我的账号", "我的账号")
]]);

// 各板块菜单底部的键盘按钮（点击把指令填进聊天栏，不自动发送）
const BACK_ROW = [kbBtn("qa_btn_back", "⬅️ 返回主菜单", "问答系统", 0)];

const KB_MASTER = buildKeyboard([
  [kbBtn("qa_m_add", "加主人", "加主人+OpenID"), kbBtn("qa_m_del", "删主人", "删主人+OpenID")],
  [kbBtn("qa_m_list", "查看主人列表", "查看主人列表", 0), kbBtn("qa_m_clear", "清空主人", "清空主人", 0)],
  BACK_ROW
]);

const KB_GROUP = buildKeyboard([
  [kbBtn("qa_g_add_p", "添加精准", "添加精准问答#问题#答案"), kbBtn("qa_g_add_f", "添加模糊", "添加模糊问答#问题#答案")],
  [kbBtn("qa_g_del_p", "删除精准", "删除精准问答#问题", 0), kbBtn("qa_g_del_f", "删除模糊", "删除模糊问答#问题", 0)],
  [kbBtn("qa_g_list", "问答词列表", "问答词列表#1", 0), kbBtn("qa_g_clr_p", "清空精准", "清空精准问答", 0), kbBtn("qa_g_clr_f", "清空模糊", "清空模糊问答", 0)],
  [kbBtn("qa_g_time", "撤回时间", "设置本群答案撤回时间#115", 0)],
  BACK_ROW
]);

const KB_GLOBAL = buildKeyboard([
  [kbBtn("qa_w_add_p", "添加精准", "添加全局精准问答#问题#答案"), kbBtn("qa_w_add_f", "添加模糊", "添加全局模糊问答#问题#答案")],
  [kbBtn("qa_w_del_p", "删除精准", "删除全局精准问答#问题", 0), kbBtn("qa_w_del_f", "删除模糊", "删除全局模糊问答#问题", 0)],
  [kbBtn("qa_w_list", "问答词列表", "问答词列表#1", 0), kbBtn("qa_w_clr_p", "清空精准", "清空全局精准问答", 0), kbBtn("qa_w_clr_f", "清空模糊", "清空全局模糊问答", 0)],
  [kbBtn("qa_w_time", "撤回时间", "设置全局答案撤回时间#115", 0)],
  BACK_ROW
]);

const KB_PRIVATE = buildKeyboard([
  [kbBtn("qa_p_add_p", "添加精准", "添加私聊精准问答#问题#答案"), kbBtn("qa_p_add_f", "添加模糊", "添加私聊模糊问答#问题#答案")],
  [kbBtn("qa_p_del_p", "删除精准", "删除私聊精准问答#问题", 0), kbBtn("qa_p_del_f", "删除模糊", "删除私聊模糊问答#问题", 0)],
  [kbBtn("qa_p_list", "问答词列表", "问答词列表#1", 0), kbBtn("qa_p_clr_p", "清空精准", "清空私聊精准问答", 0), kbBtn("qa_p_clr_f", "清空模糊", "清空私聊模糊问答", 0)],
  [kbBtn("qa_p_time", "撤回时间", "设置私聊答案撤回时间#115", 0)],
  BACK_ROW
]);

const KB_DELAY = buildKeyboard([
  [kbBtn("qa_d_add_p", "延时精准", "添加延时精准问答#问题#答案#60"), kbBtn("qa_d_add_f", "延时模糊", "添加延时模糊问答#问题#答案#60")],
  [kbBtn("qa_d_addm_p", "毫秒精准", "添加延时毫秒精准问答#问题#答案#5000"), kbBtn("qa_d_addm_f", "毫秒模糊", "添加延时毫秒模糊问答#问题#答案#5000")],
  [kbBtn("qa_d_del_p", "删延时精准", "删除延时精准问答#问题", 0), kbBtn("qa_d_del_f", "删延时模糊", "删除延时模糊问答#问题", 0), kbBtn("qa_d_delm_p", "删毫秒精准", "删除延时毫秒精准问答#问题", 0), kbBtn("qa_d_delm_f", "删毫秒模糊", "删除延时毫秒模糊问答#问题", 0)],
  [kbBtn("qa_d_clr", "清空延时精准", "清空延时精准问答", 0), kbBtn("qa_d_clrm", "清空延时模糊", "清空延时模糊问答", 0), kbBtn("qa_d_clrm_p", "清空毫秒精准", "清空延时毫秒精准问答", 0), kbBtn("qa_d_clrm_f", "清空毫秒模糊", "清空延时毫秒模糊问答", 0)],
  BACK_ROW
]);

const KB_CLEAR = buildKeyboard([
  [kbBtn("qa_c_p", "清空全部精准", "清空全部精准问答", 0), kbBtn("qa_c_f", "清空全部模糊", "清空全部模糊问答", 0)],
  BACK_ROW
]);

function kbReply(n, scope) {
  const rows = [];
  if (n.owner) rows.push([kbBtn("qa_r_g", "切换全局回复模式", "切换全局回复模式")]);
  if (scope === "group") rows.push([kbBtn("qa_r_b", "切换本群回复模式", "切换本群回复模式")]);
  if (n.owner) rows.push([kbBtn("qa_r_p", "切换私聊回复模式", "切换私聊回复模式", 0)]);
  rows.push(BACK_ROW);
  return buildKeyboard(rows);
}

function l(n, e) { return `- ${kn(n, e)}`; }

function ke(n) {
  const e = j(n);
  return e ? `<@${e}>` : "";
}

function tn(n, e) {
  const t = String(e ?? "").trim();
  const content = n?.t === "C2C_MESSAGE_CREATE" ? "" : `${ke(n)}`;
  return content ? `${content}\n${t}`.trim() : t;
}

async function _(n, e, t, r, o) {
  const cost = Date.now() - (t._startTime || Date.now());
  const finalText = `${r}\n> 响应用时: ${cost}ms`;
  return G(n, e, tn(t, finalText), o);
}

async function je(n, e, t, r, o) { const i = await _(n, e, t, r); return en(n, e, i, Z(n, o)), i; }

async function Pe(n, e, t, r, o) {
  const cost = Date.now() - (t._startTime || Date.now());
  const finalText = `${r}\n> 响应用时: ${cost}ms`;
  const i = await _e(n, e, tn(t, finalText));
  return en(n, e, i, Z(n, o)), i;
}

function jn(n, e) { return e.scope === "group" ? S(n) || "unknown" : "私聊"; }

function X(n) { return l(`设置${n}答案撤回时间#115`, `设置${n}答案撤回时间#120`); }

function un(n, e, t) {
  if (P(n, e)) return true;
  if (t.scope === "group") return B(n, e);
  return false;
}

function O(n, e) { n.length && n.push("***"), n.push(...e); }

// ============ 普通用户专属菜单 ============
function CeUser() {
  const e = [];
  O(e, [
    "**📖 问答系统 · 使用指南**",
    "",
    "本群已开启问答功能，你可以：",
    "",
    "**1. 查看本群问答列表**",
    l("问答词列表#1", "点击查看本群问答"),
    "",
    "**2. 直接触发回答**",
    "在群里发送问答词，即可获得对应回答",
    "",
    "**3. 关于延时问答**",
    "部分问答会有延迟回复，请耐心等待",
    "",
    "如需新增、修改或删除问答，请联系群主或管理员。"
  ]);
  O(e, [
    "",
    "**🔑 我的账号**",
    l("我的账号", "点击获取你的 OpenID")
  ]);
  return e.join(`\n`);
}

// ============ 主菜单 ============
function CeMain(n) {
  const e = [];
  const identity = n.fixedOwner ? "👑 固定操作者" : (n.owner ? "👑 主人" : "🛡️ 群管理员");

  O(e, [
    "**📋 问答系统 · 主菜单**",
    "",
    `👤 当前身份：**${identity}**`,
    "",
    "**📌 板块导航**"
  ]);

  if (n.fixedOwner) O(e, [l("问答系统-主人", "👑 主人管理")]);
  if (n.owner || (n.group && n.manageGroup)) O(e, [l("问答系统-回复", "🎭 回复模式")]);
  if (n.group && n.manageGroup) O(e, [l("问答系统-本群", "📚 本群问答")]);
  if (n.owner) {
    O(e, [l("问答系统-全局", "🌍 全局问答")]);
    O(e, [l("问答系统-私聊", "💬 私聊问答")]);
  }
  if (n.group && n.manageGroup) O(e, [l("问答系统-延时", "⏱️ 延时问答")]);
  if (n.owner) O(e, [l("问答系统-清空", "🗑️ 清空操作")]);

  O(e, [
    "",
    "**🔍 快速查看**",
    l("问答词列表#1", "查看问答词列表")
  ]);

  O(e, [
    "",
    "**🔑 我的账号**",
    l("我的账号", "点击获取你的 OpenID")
  ]);

  O(e, [
    "",
    "💡 点击上方蓝字可直接填充对应指令",
    "💡 指令前面可加 `/`，例如 `/问答系统`、`/添加精准问答#你好#你好呀`",
    "⌨️ 底部【常用功能】按钮：点一下会把指令自动填进聊天栏"
  ]);

  return e.join(`\n`);
}

// ============ 👑 主人管理 ============
function CeMaster(n) {
  const e = [];
  const masters = getMasters(n);
  O(e, [
    "**👑 主人管理**",
    "",
    `固定操作者：\`${Tn(n)}\``,
    `其他主人：${masters.length} 位`,
    "",
    "**📌 添加主人**",
    l("加主人+OpenID", "加主人+OpenID"),
    "可省略 `+`：`加主人 OpenID` / `加主人OpenID`",
    "",
    "**📌 删除主人**",
    l("删主人+OpenID", "删主人+OpenID"),
    "可省略 `+`：`删主人 OpenID` / `删主人OpenID`",
    "",
    "**📌 其他操作**",
    l("查看主人列表", "查看主人列表"),
    l("清空主人", "清空主人（保留固定操作者）"),
    "",
    "⌨️ 底部按钮：点一下会把指令自动填进聊天栏"
  ]);
  return e.join(`\n`);
}

// ============ 🎭 回复模式 ============
function CeReply(n) {
  const e = [];
  const globalMode = n.atReplyGlobal ? "带艾特" : "纯文本";
  const groupMode = n.atReplyGroup ? "带艾特" : "纯文本";
  const privateMode = n.atReplyPrivate ? "带艾特" : "纯文本";

  O(e, ["**🎭 回复模式**", ""]);

  if (n.owner) O(e, [`🌍 全局：**${globalMode}**`, l("切换全局回复模式", "切换全局回复模式")]);
  if (n.group && n.manageGroup) O(e, ["", `📚 本群：**${groupMode}**`, l("切换本群回复模式", "切换本群回复模式")]);
  if (n.owner) O(e, ["", `💬 私聊：**${privateMode}**`, l("切换私聊回复模式", "切换私聊回复模式")]);

  O(e, ["", "**💡 优先级**", "单条答案后缀 > 范围模式 > 全局模式", "", "⌨️ 底部按钮：点一下会把指令自动填进聊天栏"]);
  return e.join(`\n`);
}

// ============ 📚 本群问答 ============
function CeGroup(n, t) {
  const e = [];
  const groupId = t && t.group_openid ? t.group_openid : "unknown";
  const rt = Z(n, groupId);
  O(e, [
    "**📚 本群问答**",
    "",
    `当前撤回时间：**${rt === 0 ? "不撤回" : rt + " 秒"}**`,
    "",
    "**📌 添加**",
    l("添加精准问答#问题#答案", "添加精准问答#问题#答案"),
    l("添加模糊问答#问题#答案", "添加模糊问答#问题#答案"),
    "",
    "**📌 删除**",
    l("删除精准问答#问题", "删除精准问答#问题"),
    l("删除模糊问答#问题", "删除模糊问答#问题"),
    "",
    "**📌 清空**",
    l("清空精准问答", "清空精准问答"),
    l("清空模糊问答", "清空模糊问答"),
    "",
    "**📌 设置**",
    l("设置本群答案撤回时间#115", "设置本群答案撤回时间#120"),
    "",
    "**💡 单条答案艾特控制**",
    "末尾加 `#N@` = 纯文本，加 `#Y@` = 带艾特",
    "",
    "⌨️ 底部按钮：点一下会把指令自动填进聊天栏"
  ]);
  return e.join(`\n`);
}

// ============ 🌍 全局问答 ============
function CeGlobal(n) {
  const e = [];
  const rt = Z(n, "全局");
  O(e, [
    "**🌍 全局问答**",
    "",
    `当前撤回时间：**${rt === 0 ? "不撤回" : rt + " 秒"}**`,
    "",
    "**📌 添加**",
    l("添加全局精准问答#问题#答案", "添加全局精准问答#问题#答案"),
    l("添加全局模糊问答#问题#答案", "添加全局模糊问答#问题#答案"),
    "",
    "**📌 删除**",
    l("删除全局精准问答#问题", "删除全局精准问答#问题"),
    l("删除全局模糊问答#问题", "删除全局模糊问答#问题"),
    "",
    "**📌 清空**",
    l("清空全局精准问答", "清空全局精准问答"),
    l("清空全局模糊问答", "清空全局模糊问答"),
    "",
    "**📌 设置**",
    l("设置全局答案撤回时间#115", "设置全局答案撤回时间#120"),
    "",
    "⌨️ 底部按钮：点一下会把指令自动填进聊天栏"
  ]);
  return e.join(`\n`);
}

// ============ 💬 私聊问答 ============
function CePrivate(n) {
  const e = [];
  const rt = Z(n, "私聊");
  O(e, [
    "**💬 私聊问答**",
    "",
    `当前撤回时间：**${rt === 0 ? "不撤回" : rt + " 秒"}**`,
    "",
    "**📌 添加**",
    l("添加私聊精准问答#问题#答案", "添加私聊精准问答#问题#答案"),
    l("添加私聊模糊问答#问题#答案", "添加私聊模糊问答#问题#答案"),
    "",
    "**📌 删除**",
    l("删除私聊精准问答#问题", "删除私聊精准问答#问题"),
    l("删除私聊模糊问答#问题", "删除私聊模糊问答#问题"),
    "",
    "**📌 清空**",
    l("清空私聊精准问答", "清空私聊精准问答"),
    l("清空私聊模糊问答", "清空私聊模糊问答"),
    "",
    "**📌 设置**",
    l("设置私聊答案撤回时间#115", "设置私聊答案撤回时间#120"),
    "",
    "⌨️ 底部按钮：点一下会把指令自动填进聊天栏"
  ]);
  return e.join(`\n`);
}

// ============ ⏱️ 延时问答 ============
function CeDelay(n) {
  const e = [];
  O(e, [
    "**⏱️ 延时问答**",
    "",
    "**📌 延时秒（最长 60 秒）**",
    l("添加延时精准问答#问题#答案#60", "添加延时精准问答#问题#答案#秒数"),
    l("添加延时模糊问答#问题#答案#60", "添加延时模糊问答#问题#答案#秒数"),
    l("删除延时精准问答#问题", "删除延时精准问答#问题"),
    l("删除延时模糊问答#问题", "删除延时模糊问答#问题"),
    l("清空延时精准问答", "清空延时精准问答"),
    l("清空延时模糊问答", "清空延时模糊问答"),
    "",
    "**📌 延时毫秒（最长 60000 毫秒）**",
    l("添加延时毫秒精准问答#问题#答案#5000", "添加延时毫秒精准问答#问题#答案#毫秒数"),
    l("添加延时毫秒模糊问答#问题#答案#5000", "添加延时毫秒模糊问答#问题#答案#毫秒数"),
    l("删除延时毫秒精准问答#问题", "删除延时毫秒精准问答#问题"),
    l("删除延时毫秒模糊问答#问题", "删除延时毫秒模糊问答#问题"),
    l("清空延时毫秒精准问答", "清空延时毫秒精准问答"),
    l("清空延时毫秒模糊问答", "清空延时毫秒模糊问答"),
    "",
    "**💡 单条答案艾特控制**",
    "末尾加 `#N@` = 纯文本，加 `#Y@` = 带艾特",
    "例：`添加延时精准问答#问题#答案#60#N@`",
    "",
    "⌨️ 底部按钮：点一下会把指令自动填进聊天栏"
  ]);
  return e.join(`\n`);
}

// ============ 🗑️ 清空操作 ============
function CeClear(n) {
  const e = [];
  O(e, [
    "**🗑️ 清空操作（全局）**",
    "",
    "⚠️ **警告：以下操作不可撤销，请谨慎使用**",
    "",
    l("清空全部精准问答", "清空全部精准问答"),
    l("清空全部模糊问答", "清空全部模糊问答"),
    "",
    "说明：",
    "- 会同时清空全局、私聊、所有群目录的对应库",
    "- 仅最高主人可执行",
    "",
    "⌨️ 底部按钮：点一下会把指令自动填进聊天栏"
  ]);
  return e.join(`\n`);
}

const Te = /^(添加|删除|清空)(?!.*延时毫秒)(?!.*延时)(精准|模糊)问答(?:#([^\r\n#]+)(?:#([\s\S]*))?)?$/, Oe = /^(添加|删除|清空)(?!.*延时毫秒)(?!.*延时)(全局|私聊)(精准|模糊)问答(?:#([^\r\n#]+)(?:#([\s\S]*))?)?$/, Ge = /^清空全部(精准|模糊)问答$/, Ie = /^(问答词列表|详细问答词列表)(?:#([^\r\n#]*))?$/, Ue = /^设置(本群|私聊|全局)答案撤回时间(?:#([^\r\n#]*))?$/, Le = /^添加(?:全局|私聊)?(?:精准|模糊)问答#[^\r\n#]*#/, De = /^添加(?:全局|私聊)?(?:精准|模糊)问答#[^\r\n#]+/;
const Ee2 = /^(添加|删除|清空)延时(精准|模糊)问答(?:#([^\r\n#]+)(?:#([\s\S]*))?)?$/;
const EeMs = /^(添加|删除|清空)延时毫秒(精准|模糊)问答(?:#([^\r\n#]+)(?:#([\s\S]*))?)?$/;

const CMD_SUB = /^问答系统[-\s_]?(主人|回复|本群|全局|私聊|延时|清空)(管理)?$/;
const CMD_MAIN = /^问答系统$/;

const CMD_ADD_MASTER = /^加主人[\s+#：:]*(\S+)$/;
const CMD_DEL_MASTER = /^删主人[\s+#：:]*(\S+)$/;
const CMD_ADD_MASTER_EMPTY = /^加主人[\s+#：:]*$/;
const CMD_DEL_MASTER_EMPTY = /^删主人[\s+#：:]*$/;
const CMD_LIST_MASTER = /^查看主人列表$/;
const CMD_CLEAR_MASTER = /^清空主人$/;

function parseAtSuffix(str) {
  if (str.endsWith("#N@")) return { content: str.slice(0, -3), at: false };
  if (str.endsWith("#Y@")) return { content: str.slice(0, -3), at: true };
  return { content: str, at: undefined };
}

function Fe(n) {
  const e = String(n ?? "").trim();
  if (!/^\d+$/.test(e)) return { ok: !1 };
  const t = Number(e);
  return !Number.isInteger(t) || t < 0 || t > 600 ? { ok: !1 } : { ok: !0, seconds: t };
}

function Be(n) {
  const e = String(n ?? "").trim();
  if (!e || !/^\d+$/.test(e)) return 1;
  const t = Number(e);
  return !Number.isInteger(t) || t < 1 ? 1 : t;
}

function qe(n, e, t) {
  const r = P(n, e), o = t.scope === "group", i = [], s = (c, a, u) => {
    const f = Object.entries(a || {});
    f.length && i.push({ title: c, total: f.length, deleteFill: u, entries: f });
  };
  if (r) {
    const c = q(n, "全局");
    s("全局精准问答", c.精准, (a) => `删除全局精准问答#${a}`), s("全局模糊问答", c.模糊, (a) => `删除全局模糊问答#${a}`);
    s("全局延时精准问答", c.延时精准, (a) => `删除延时精准问答#${a}`), s("全局延时模糊问答", c.延时模糊, (a) => `删除延时模糊问答#${a}`);
    s("全局延时毫秒精准问答", c.延时毫秒精准, (a) => `删除延时毫秒精准问答#${a}`), s("全局延时毫秒模糊问答", c.延时毫秒模糊, (a) => `删除延时毫秒模糊问答#${a}`);
  }
  if (o) {
    const c = q(n, S(e) || "unknown");
    s("本群精准问答", c.精准, (a) => `删除精准问答#${a}`), s("本群模糊问答", c.模糊, (a) => `删除模糊问答#${a}`);
    s("本群延时精准问答", c.延时精准, (a) => `删除延时精准问答#${a}`), s("本群延时模糊问答", c.延时模糊, (a) => `删除延时模糊问答#${a}`);
    s("本群延时毫秒精准问答", c.延时毫秒精准, (a) => `删除延时毫秒精准问答#${a}`), s("本群延时毫秒模糊问答", c.延时毫秒模糊, (a) => `删除延时毫秒模糊问答#${a}`);
  } else if (r) {
    const c = q(n, "私聊");
    s("私聊精准问答", c.精准, (a) => `删除私聊精准问答#${a}`), s("私聊模糊问答", c.模糊, (a) => `删除私聊模糊问答#${a}`);
    s("私聊延时精准问答", c.延时精准, (a) => `删除私聊延时精准问答#${a}`), s("私聊延时模糊问答", c.延时模糊, (a) => `删除私聊延时模糊问答#${a}`);
    s("私聊延时毫秒精准问答", c.延时毫秒精准, (a) => `删除私聊延时毫秒精准问答#${a}`), s("私聊延时毫秒模糊问答", c.延时毫秒模糊, (a) => `删除私聊延时毫秒模糊问答#${a}`);
  }
  return i;
}

function Ne(n) {
  const e = [];
  for (const t of n) t.entries.forEach(([r, o], i) => {
    e.push({ title: t.title, total: t.total, index: i + 1, question: r, answer: o, deleteFill: t.deleteFill(r), cost: Re(o) });
  });
  return e;
}

// 修复：新增「测试问答」按钮（点击后填入 @机器人 + 问题文本）
async function ze(n, e, t, r) {
  if (!r.length) return "";
  const botId = getBotOpenId(n);
  const atPrefix = botId ? `<@!${botId}> ` : "";
  let o = `### ${e}（${t}）\n\n`;
  for (const i of r) {
    const s = await An(n, i.answer, 96);
    const testBtn = kn(`${atPrefix}${i.question}`, "测试问答");
    o += `${i.index}. ${kn(i.deleteFill, i.question)}\n${s || Hn(i.answer)}\n- ${testBtn}\n\n`;
  }
  return o;
}

function He(n, e, t) {
  const r = [`第 ${e}/${t} 页`];
  return e > 1 && r.push(l(`${n}#${e - 1}`, "上一页")), e < t && r.push(l(`${n}#${e + 1}`, "下一页")), r.join(`\n`);
}

function F(n) { return n === "全局" || n === "私聊" ? n : "本群"; }

async function Je(n, e, t, r) {
  const o = yn(e);
  let c = (r && r.trim()) || "";
  if (!c) {
    const i = o.match(Le), s = o.match(De);
    i ? c = o.slice(i[0].length) : c = "", c = c.trim();
  }
  let a = [];
  try { a = await Se(n, e); } catch (f) { return { ok: !1, error: f?.message || "图片下载失败，添加已取消" }; }
  let u = c;
  for (const f of a) u += `[img:${f}]`;
  return u.length ? t.trim() ? { ok: !0, content: u } : { ok: !1, error: "必填参数缺失！请带上问题。" } : { ok: !1, error: "答案不能为空～文字或图片至少要有一样哦" };
}

async function fn(n, e, t, r, o, i, s, c, delay = 0, atOverride = undefined) {
  const fileSuffix = delay > 0 ? `延时${o}` : o;
  if (r === "添加") {
    let at = atOverride, answer = c;
    if (at === undefined) { const parsed = parseAtSuffix(answer); answer = parsed.content; at = parsed.at; }
    const a = await Je(n, e, s, answer);
    if (a.ok === !1) return await _(n, t, e, a.error), !0;
    if (Bn(n, i, fileSuffix, s) != null) return await _(n, t, e, `【${F(i)}${fileSuffix}问答】中已存在该词语啦～！如需修改请先删除哦～`), !0;
    let finalContent = a.content;
    if (delay > 0) finalContent = `${finalContent}\u0000${delay}`;
    if (at !== undefined) finalContent = `${finalContent}\u0001at=${at ? 1 : 0}`;
    qn(n, i, fileSuffix, s, finalContent);
    const f = F(i), p = await An(n, a.content, 96);
    const delayText = delay > 0 ? `\n**延迟：** ${delay}秒` : "";
    const atText = at === undefined ? "\n**回复模式：** 使用本群默认" : `\n**回复模式：** ${at ? "艾特" : "纯文本"}`;
    return await je(n, t, e, `已新增【${f}${fileSuffix}问答】\n\n**问：** ${s}\n\n**答：** ${p}${delayText}${atText}`, jn(e, t)), !0;
  }
  return r === "删除" ? s ? Nn(n, i, fileSuffix, s) ? (await _(n, t, e, `好哒！已删除【${F(i)}${fileSuffix}问答】的「${s}」`), !0) : (await _(n, t, e, "好像木有这个哎～要不你仔细看看列表？"), !0) : (await _(n, t, e, "必填参数缺失！请带上要删除的问题。"), !0) : r === "清空" ? (N(n, i, fileSuffix), await _(n, t, e, `这就把【${F(i)}${fileSuffix}问答】的词语通通清空！`), !0) : !1;
}

async function fnMs(n, e, t, r, o, i, s, c, delayMs = 0, atOverride = undefined) {
  const fileSuffix = delayMs > 0 ? `延时毫秒${o}` : o;
  if (r === "添加") {
    let at = atOverride, answer = c;
    if (at === undefined) { const parsed = parseAtSuffix(answer); answer = parsed.content; at = parsed.at; }
    const a = await Je(n, e, s, answer);
    if (a.ok === !1) return await _(n, t, e, a.error), !0;
    if (Bn(n, i, fileSuffix, s) != null) return await _(n, t, e, `【${F(i)}${fileSuffix}问答】中已存在该词语啦～！如需修改请先删除哦～`), !0;
    let finalContent = a.content;
    if (delayMs > 0) finalContent = `${finalContent}\u0000${delayMs}`;
    if (at !== undefined) finalContent = `${finalContent}\u0001at=${at ? 1 : 0}`;
    qn(n, i, fileSuffix, s, finalContent);
    const f = F(i), p = await An(n, a.content, 96);
    const delayText = delayMs > 0 ? `\n**延迟：** ${delayMs}毫秒` : "";
    const atText = at === undefined ? "\n**回复模式：** 使用本群默认" : `\n**回复模式：** ${at ? "艾特" : "纯文本"}`;
    return await je(n, t, e, `已新增【${f}${fileSuffix}问答】\n\n**问：** ${s}\n\n**答：** ${p}${delayText}${atText}`, jn(e, t)), !0;
  }
  return r === "删除" ? s ? Nn(n, i, fileSuffix, s) ? (await _(n, t, e, `好哒！已删除【${F(i)}${fileSuffix}问答】的「${s}」`), !0) : (await _(n, t, e, "好像木有这个哎～要不你仔细看看列表？"), !0) : (await _(n, t, e, "必填参数缺失！请带上要删除的问题。"), !0) : r === "清空" ? (N(n, i, fileSuffix), await _(n, t, e, `这就把【${F(i)}${fileSuffix}问答】的词语通通清空！`), !0) : !1;
}

async function Qe(n, e, t, r, o) {
  const i = P(n, e), s = t.scope === "group", c = qe(n, e, t);
  if (!c.length) return !i && !s ? "" : i ? "好像木有过数据哎～" : "好像木有过数据哎～本群还没有问答。";
  const a = Ne(c), u = c.length * Ae, f = Me(a, u), p = f.length;
  if (!p) return i ? "好像木有过数据哎～" : "好像木有过数据哎～本群还没有问答。";
  if (r > p) return `没有这一页（共 ${p} 页）`;
  const y = f[r - 1] || [], g = [];
  for (const m of y) {
    const b = g[g.length - 1];
    b && b.title === m.title ? b.items.push(m) : g.push({ title: m.title, total: m.total, items: [m] });
  }
  const $ = [];
  for (const m of g) $.push(await ze(n, m.title, m.total, m.items));
  const M = $.filter(Boolean).join(`\n***\n`), C = He(o, r, p);
  return C ? `${M}\n***\n${C}` : M;
}

async function We(n, e, t) {
  const r = stripSlash(yn(e));
  if (!r) return !1;

  // ============ 主人管理指令 ============
  if (CMD_ADD_MASTER_EMPTY.test(r)) {
    if (!isOwnerOnly(n, e)) { await _(n, t, e, "只有固定操作者才能添加主人！"); return true; }
    await _(n, t, e, "格式：`加主人+OpenID`（加号 / 空格 / # 可省略）\n例如：`加主人 6E0B188704AC0611617425B687DB9034`");
    return true;
  }

  if (CMD_DEL_MASTER_EMPTY.test(r)) {
    if (!isOwnerOnly(n, e)) { await _(n, t, e, "只有固定操作者才能删除主人！"); return true; }
    await _(n, t, e, "格式：`删主人+OpenID`（加号 / 空格 / # 可省略）\n例如：`删主人 6E0B188704AC0611617425B687DB9034`");
    return true;
  }

  if (CMD_ADD_MASTER.test(r)) {
    if (!isOwnerOnly(n, e)) { await _(n, t, e, "只有固定操作者才能添加主人！"); return true; }
    const m = r.match(CMD_ADD_MASTER);
    const newOpenid = (m[1] || "").trim();
    if (newOpenid.length < 8) { await _(n, t, e, "OpenID 长度异常，请重新检查后重试。"); return true; }
    if (newOpenid === Tn(n)) { await _(n, t, e, "该 OpenID 已经是固定操作者本人，无需重复添加。"); return true; }
    const masters = getMasters(n);
    if (masters.includes(newOpenid)) { await _(n, t, e, "该 OpenID 已在主人列表中。"); return true; }
    const ok = saveConfig(n, (config) => { if (!Array.isArray(config.masters)) config.masters = []; config.masters.push(newOpenid); });
    if (!ok) { await _(n, t, e, "保存配置失败，请检查配置文件是否可写。"); return true; }
    await _(n, t, e, `✅ 已添加主人：\`${newOpenid}\``);
    return true;
  }

  if (CMD_DEL_MASTER.test(r)) {
    if (!isOwnerOnly(n, e)) { await _(n, t, e, "只有固定操作者才能删除主人！"); return true; }
    const m = r.match(CMD_DEL_MASTER);
    const target = (m[1] || "").trim();
    const masters = getMasters(n);
    if (!masters.includes(target)) { await _(n, t, e, "该 OpenID 不在主人列表中。"); return true; }
    const ok = saveConfig(n, (config) => { config.masters = (config.masters || []).filter((x) => x !== target); });
    if (!ok) { await _(n, t, e, "保存配置失败，请检查配置文件是否可写。"); return true; }
    await _(n, t, e, `✅ 已移除主人：\`${target}\``);
    return true;
  }

  if (CMD_LIST_MASTER.test(r)) {
    if (!isOwnerOnly(n, e)) return true;
    const masters = getMasters(n);
    if (!masters.length) { await _(n, t, e, `**主人列表**\n\n固定操作者：\`${Tn(n)}\`\n\n其他主人：（暂无）`); return true; }
    const list = masters.map((m, i) => `${i + 1}. \`${m}\``).join(`\n`);
    await _(n, t, e, `**主人列表**\n\n固定操作者：\`${Tn(n)}\`\n\n其他主人（${masters.length} 位）：\n${list}`);
    return true;
  }

  if (CMD_CLEAR_MASTER.test(r)) {
    if (!isOwnerOnly(n, e)) return true;
    const masters = getMasters(n);
    if (!masters.length) { await _(n, t, e, "主人列表已经为空。"); return true; }
    const ok = saveConfig(n, (config) => { config.masters = []; });
    if (!ok) { await _(n, t, e, "保存配置失败，请检查配置文件是否可写。"); return true; }
    await _(n, t, e, "✅ 已清空所有主人（固定操作者保留）。");
    return true;
  }
  // ========================================================

  if (r === "我的账号") {
    const openid = j(e);
    if (!openid) { await G(n, t, "无法获取你的 OpenID，请稍后再试。"); return true; }
    const cost = Date.now() - (e._startTime || Date.now());
    const content = [`${ke(e)}`, `你的OpenID是: ${openid}`, `> 响应用时: ${cost}ms`].join("\n");
    await G(n, t, content);
    return true;
  }

  if (r === "切换全局回复模式") {
    if (!P(n, e)) return true;
    const cur = getAtReplySetting(n, { scope: "global" });
    const ok = saveConfig(n, (config) => { config.replyAtGlobal = !cur; });
    if (!ok) { await _(n, t, e, "保存配置失败。"); return true; }
    await _(n, t, e, `全局回复模式已切换为【${!cur ? "带艾特" : "纯文本"}】`);
    return true;
  }

  if (r === "切换本群回复模式") {
    if (t.scope !== "group" || !B(n, e)) return true;
    const cur = getAtReplySetting(n, t);
    const ok = setAtReplySetting(n, t, !cur);
    if (!ok) { await _(n, t, e, "保存配置失败。"); return true; }
    await _(n, t, e, `本群回复模式已切换为【${!cur ? "带艾特" : "纯文本"}】`);
    return true;
  }

  if (r === "切换私聊回复模式") {
    if (!P(n, e)) return true;
    const cur = getAtReplySetting(n, { scope: "c2c" });
    const ok = setAtReplySetting(n, { scope: "c2c" }, !cur);
    if (!ok) { await _(n, t, e, "保存配置失败。"); return true; }
    await _(n, t, e, `私聊回复模式已切换为【${!cur ? "带艾特" : "纯文本"}】`);
    return true;
  }

  // 普通用户专属菜单
  if (r === "问答菜单" || r === "问答帮助" || r === "问答指南") {
    await _(n, t, e, CeUser());
    return true;
  }

  // ============ 板块指令 ============
  const subMatch = r.match(CMD_SUB);
  if (subMatch) {
    const section = subMatch[1];
    const isOwner = P(n, e);
    const isGroupAdmin = t.scope === "group" && B(n, e);

    if (section === "主人") {
      if (!isOwnerOnly(n, e)) { await _(n, t, e, "只有固定操作者才能打开主人管理板块。"); return true; }
      await _(n, t, e, CeMaster(n), KB_MASTER);
      return true;
    }

    if (section === "清空") {
      if (!isOwner) { await _(n, t, e, "只有主人才能打开清空操作板块。"); return true; }
      await _(n, t, e, CeClear(n), KB_CLEAR);
      return true;
    }

    if (section === "全局" || section === "私聊") {
      if (!isOwner) { await _(n, t, e, `只有主人才能打开${section}问答板块。`); return true; }
      await _(n, t, e, section === "全局" ? CeGlobal(n) : CePrivate(n), section === "全局" ? KB_GLOBAL : KB_PRIVATE);
      return true;
    }

    if (section === "本群") {
      if (t.scope !== "group") { await _(n, t, e, "本群问答板块仅支持在群聊中使用。"); return true; }
      if (!B(n, e)) { await _(n, t, e, "你不是本群群主或管理员，无法打开本群问答板块。"); return true; }
      await _(n, t, e, CeGroup(n, t), KB_GROUP);
      return true;
    }

    if (section === "延时") {
      if (t.scope !== "group") { await _(n, t, e, "延时问答板块仅支持在群聊中使用。"); return true; }
      if (!B(n, e)) { await _(n, t, e, "你不是本群群主或管理员，无法打开延时问答板块。"); return true; }
      await _(n, t, e, CeDelay(n), KB_DELAY);
      return true;
    }

    if (section === "回复") {
      if (!isOwner && !isGroupAdmin) { await _(n, t, e, "你没有权限打开回复模式板块。"); return true; }
      const cfg = getConfig(n);
      await _(n, t, e, CeReply({
        owner: isOwner,
        group: t.scope === "group",
        manageGroup: isGroupAdmin,
        atReplyGlobal: cfg.replyAtGlobal !== false,
        atReplyGroup: t.scope === "group" ? getAtReplySetting(n, t) : false,
        atReplyPrivate: cfg.replyAtPrivate !== undefined ? cfg.replyAtPrivate : (cfg.replyAtGlobal !== false)
      }), kbReply({ owner: isOwner }, t.scope));
      return true;
    }
    return true;
  }

  // ============ 主菜单 ============
  if (CMD_MAIN.test(r)) {
    const isOwner = P(n, e);
    const isGroupAdmin = t.scope === "group" && B(n, e);
    if (!isOwner && !isGroupAdmin) {
      await _(n, t, e, "你没有管理权限哦～\n如需查看问答使用说明，请发送：\n问答菜单");
      return true;
    }
    const cfg = getConfig(n);
    await _(n, t, e, CeMain({
      owner: isOwner,
      fixedOwner: isOwnerOnly(n, e),
      group: t.scope === "group",
      manageGroup: isGroupAdmin,
      atReplyGlobal: cfg.replyAtGlobal !== false,
      atReplyGroup: t.scope === "group" ? getAtReplySetting(n, t) : false,
      atReplyPrivate: cfg.replyAtPrivate !== undefined ? cfg.replyAtPrivate : (cfg.replyAtGlobal !== false)
    }), MAIN_KEYBOARD);
    return true;
  }

  const o = r.match(Ie);
  if (o) {
    const u = o[1] || "问答词列表", f = Be(String(o[2] || "")), p = await Qe(n, e, t, f, u);
    if (p) await Pe(n, t, e, p, jn(e, t));
    return true;
  }

  const i = r.match(Ue);
  if (i) {
    const u = i[1];
    if (u === "本群") { if (t.scope !== "group" || !B(n, e)) return !0; }
    else if (!Y(n, e)) return !0;
    const f = Fe(String(i[2] || ""));
    if (!f.ok) return await _(n, t, e, "撤回时间需为 **0–600** 的整数秒，未做保存。0 表示不撤回。"), !0;
    const p = u === "本群" ? S(e) || "unknown" : u;
    return Dn(n, p, f.seconds), await _(n, t, e, f.seconds === 0 ? `已设置【${u}】答案撤回时间为 0 秒（不撤回）` : `已设置【${u}】答案撤回时间为 ${f.seconds} 秒`), !0;
  }

  const c = r.match(Ge);
  if (c) {
    if (!Y(n, e)) return !0;
    const u = c[1], f = zn(n, u);
    return await _(n, t, e, [`已清空全部【${u}问答】`, "", "- 全局：已清空", "- 私聊：已清空", `- 群聊目录：${f} 个`].join(`\n`)), !0;
  }

  const cMs = r.match(EeMs);
  if (cMs) {
    const op = cMs[1], type = cMs[2], q = String(cMs[3] || ""), ans = String(cMs[4] || "");
    if (op === "添加" && t.scope === "group" && !B(n, e) || (op !== "添加" && !B(n, e) && !Y(n, e))) return true;
    if (t.scope !== "group") return true;
    if (op === "添加") {
      const parts = ans.split("#");
      if (parts.length < 2) return await _(n, t, e, "添加延时毫秒问答格式：添加延时毫秒精准问答#问题#答案#毫秒数"), true;
      const realAns = parts[0], delayStr = parts[1], suffix = parts[2], delayNum = parseInt(delayStr, 10);
      if (isNaN(delayNum) || delayNum < 1 || delayNum > 60000) return await _(n, t, e, "延迟时间需为1-60000毫秒整数！"), true;
      let at; if (suffix === 'N@') at = false; else if (suffix === 'Y@') at = true;
      const g = S(e) || "unknown";
      return fnMs(n, e, t, "添加", type, g, q, realAns, delayNum, at);
    } else if (op === "删除") { const g = S(e) || "unknown"; return fnMs(n, e, t, "删除", type, g, q, "", 1); }
    else if (op === "清空") { const g = S(e) || "unknown"; return fnMs(n, e, t, "清空", type, g, "", "", 1); }
    return true;
  }

  const cDelay = r.match(Ee2);
  if (cDelay) {
    const op = cDelay[1], type = cDelay[2], q = String(cDelay[3] || ""), ans = String(cDelay[4] || "");
    if (op === "添加" && t.scope === "group" && !B(n, e) || (op !== "添加" && !B(n, e) && !Y(n, e))) return true;
    if (t.scope !== "group") return true;
    if (op === "添加") {
      const parts = ans.split("#");
      if (parts.length < 2) return await _(n, t, e, "添加延时问答格式：添加延时精准问答#问题#答案#秒数"), true;
      const realAns = parts[0], delayStr = parts[1], suffix = parts[2], delayNum = parseInt(delayStr, 10);
      if (isNaN(delayNum) || delayNum < 1 || delayNum > 60) return await _(n, t, e, "延迟时间需为1-60秒整数！"), true;
      let at; if (suffix === 'N@') at = false; else if (suffix === 'Y@') at = true;
      const g = S(e) || "unknown";
      return fn(n, e, t, "添加", type, g, q, realAns, delayNum, at);
    } else if (op === "删除") { const g = S(e) || "unknown"; return fn(n, e, t, "删除", type, g, q, "", 1); }
    else if (op === "清空") { const g = S(e) || "unknown"; return fn(n, e, t, "清空", type, g, "", "", 1); }
    return true;
  }

  const cNormal = r.match(Oe);
  if (cNormal) {
    if (!Y(n, e)) return !0;
    const u = cNormal[1], f = cNormal[2], p = cNormal[3], y = String(cNormal[4] || ""), g = String(cNormal[5] || "");
    return fn(n, e, t, u, p, f, y, g, 0);
  }

  const a = r.match(Te);
  if (a) {
    if (t.scope !== "group" || !B(n, e)) return !0;
    const u = a[1], f = a[2], p = String(a[3] || ""), y = String(a[4] || ""), g = S(e) || "unknown";
    return fn(n, e, t, u, f, g, p, y, 0);
  }

  return !1;
}

async function Ye(n, e, t) {
  const r = vn(e);
  if (!r) return !1;
  const o = t.scope === "group" ? S(e) || "unknown" : "私聊", i = Ee(n, r, o);
  if (i == null) return !1;
  const atReply = i.at !== undefined ? i.at : getAtReplySetting(n, t);
  const prefix = atReply ? `${ke(e)}` : "";
  let answerText = i.answer;
  if (atReply) {
    const cost = Date.now() - (e._startTime || Date.now());
    answerText += `\n> 响应用时: ${cost}ms`;
  }
  if (i.delay > 0) await new Promise(resolve => setTimeout(resolve, i.delay));
  const s = await we(n, t, v(answerText), prefix);
  en(n, t, s, Z(n, i.scope)), !0;
  return true;
}

const Ke = [
  { key: "ownerOpenId", type: "string", label: "固定操作者 OpenID", description: "唯一固定操作者，可以添加/删除其他主人；全局 / 私聊问答仅此 openid 或主人列表成员可改", default: "6E0B188704AC0611617425B687DB9034", placeholder: "6A511E72CB258111C323EBD3EE3A081B" },
  { key: "botOpenId", type: "string", label: "机器人 OpenID（可选）", description: "填写后，问答列表的「测试问答」按钮会填入「@机器人 问题」格式；不填则只填问题文本，需手动 @ 机器人", default: "", placeholder: "例如：A1B2C3D4E5F6..." },
  { key: "replyAtGlobal", type: "boolean", label: "全局回复带艾特", description: "全局默认是否带艾特，默认开启", default: true },
  { key: "replyAtPrivate", type: "boolean", label: "私聊回复带艾特", description: "私聊环境是否带艾特，默认开启", default: true }
], xe = Ke;

async function ve(n) { n.logger?.info?.("[GF_qa] 官方问答插件已加载"); }

async function nt(n) { he(), n.logger?.info?.("[GF_qa] 插件已卸载"); }

async function et(n, e) {
  if (!e || typeof e != "object" || (dn(e, n.logger), !ne(e))) return;
  e._startTime = Date.now();
  let t;
  try { t = ee(e); }
  catch (r) { n.logger?.warn?.("[GF_qa] 无法解析发送目标:", r?.message || r); return; }
  try {
    if (await We(n, e, t)) return;
    await Ye(n, e, t);
  } catch (r) { n.logger?.error?.("[GF_qa] 处理消息失败:", r?.message || r); }
}

async function tt(n, e) {
  if (!e || typeof e != "object") return;
  const t = String(e.t ?? "").trim();
  if (t === "GROUP_MEMBER_REMOVE") { In(e); return; }
  t === "GROUP_MEMBER_ADD" && dn(e, n.logger);
}

export {
  nt as plugin_cleanup,
  Ke as plugin_config_schema,
  xe as plugin_config_ui,
  ve as plugin_init,
  tt as plugin_onevent,
  et as plugin_onmessage
};