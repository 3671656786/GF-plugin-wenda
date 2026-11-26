/* ============================================================
 * lib/web-console.mjs —— 问答系统网页控制台后端
 * ------------------------------------------------------------
 * 仿照 GF-plugin-xjyl / GF-kzt 的控制台接线方式：
 *   - ctx.router.page() 注册内嵌 React 页面（webui/remote.js）
 *   - 所有 API 挂在 /wenda/*，除登录态查询外一律校验本插件令牌
 *   - 在线更新复用 lib/update.mjs（含 GitHub 官方签名验证与风险确认）
 *   - 问答管理直接读写插件既有的 dataPath/问答系统/<范围>/<类型>.json
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as 更新 from './update.mjs';

const 前缀 = '/wenda';
const 初始密码 = '12345678';
const 会话时长 = 7 * 24 * 60 * 60 * 1000;
const 最多失败 = 5;
const 锁定时长 = 24 * 60 * 60 * 1000;

function 包装(处理器) {
  return async (req, res) => {
    try {
      await 处理器(req, res);
    } catch (e) {
      const 消息 = String((e && e.message) || e || '请求失败');
      if (!res.headersSent) res.status(500).json({ code: -1, message: 消息 });
    }
  };
}
function 成功(res, data, message = 'ok') { res.json({ code: 0, data, message }); }
function 失败(res, message, status = 400, extra = {}) {
  res.status(status).json({ code: -1, message, ...extra });
}
function 取IP(req) {
  const 原始 = String(req?.ip || req?.socket?.remoteAddress || '').replace(/^::ffff:/i, '');
  const 回环 = !原始 || 原始 === '127.0.0.1' || 原始 === '::1';
  if (回环) {
    const xff = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
    if (xff) return xff.replace(/^::ffff:/i, '');
  }
  return 原始 === '::1' || !原始 ? '127.0.0.1' : 原始;
}

/** 读取答案存储格式：正文 + \0<延迟> + \1at=<0|1> */
export function 解析答案(raw) {
  let 文本 = String(raw ?? '');
  let at = undefined;
  let 延迟 = '';
  const m = 文本.match(/\u0001at=([01])$/);
  if (m) { at = m[1] === '1'; 文本 = 文本.slice(0, -m[0].length); }
  const i = 文本.lastIndexOf('\u0000');
  if (i >= 0) { 延迟 = 文本.slice(i + 1); 文本 = 文本.slice(0, i); }
  return { 文本, 延迟, at };
}
export function 组装答案({ 文本, 延迟 = '', at }) {
  let s = String(文本 ?? '');
  if (延迟 !== '' && 延迟 != null) s += `\u0000${String(延迟)}`;
  if (at === true || at === false) s += `\u0001at=${at ? 1 : 0}`;
  return s;
}

export function 注册网页后台(ctx, 依赖) {
  const 路由 = ctx?.router;
  if (!路由 || typeof 路由.get !== 'function' || typeof 路由.post !== 'function') {
    ctx?.logger?.warn?.('[wenda] 宿主未提供 router，跳过网页后台注册');
    return false;
  }
  const 路径 = (p) => (p ? `${前缀}${p.startsWith('/') ? p : `/${p}`}` : 前缀);
  const 数据文件 = (名) => path.join(String(ctx.dataPath || ''), 名);

  function 读JSON(文件, 兜底) {
    try {
      if (!fs.existsSync(文件)) return 兜底;
      const v = JSON.parse(fs.readFileSync(文件, 'utf8'));
      return v && typeof v === 'object' ? v : 兜底;
    } catch { return 兜底; }
  }
  function 写JSON(文件, 值) {
    fs.mkdirSync(path.dirname(文件), { recursive: true });
    fs.writeFileSync(文件, `${JSON.stringify(值, null, 2)}\n`, 'utf8');
  }
  function 哈希(密码, 盐) {
    return crypto.scryptSync(String(密码 ?? ''), String(盐 ?? ''), 64).toString('hex');
  }
  function 认证记录() {
    const f = 数据文件('auth.json');
    const raw = 读JSON(f, null);
    if (raw && typeof raw.hash === 'string' && typeof raw.salt === 'string') {
      return { hash: raw.hash, salt: raw.salt, 已改密码: raw.已改密码 === true };
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const rec = { hash: 哈希(初始密码, salt), salt, 已改密码: false, updatedAt: Date.now() };
    try { 写JSON(f, rec); } catch { /* 只读环境忽略 */ }
    return { ...rec };
  }
  function 令牌哈希(t) { return crypto.createHash('sha256').update(String(t || '')).digest('hex'); }
  function 会话表() {
    const f = 数据文件('auth-sessions.json');
    const raw = 读JSON(f, { sessions: [] });
    const map = new Map();
    for (const x of (Array.isArray(raw.sessions) ? raw.sessions : [])) {
      if (x?.key && Number(x.exp) > Date.now()) map.set(String(x.key), { ip: String(x.ip || ''), exp: Number(x.exp) });
    }
    return map;
  }
  function 保存会话(map) {
    写JSON(数据文件('auth-sessions.json'), {
      sessions: [...map.entries()].map(([key, v]) => ({ key, ip: v.ip, exp: v.exp })),
    });
  }
  function 取令牌(req) {
    return String(req?.headers?.['x-wenda-token'] || req?.query?.token || '').trim();
  }
  function 验令牌(req) {
    const t = 取令牌(req);
    if (!t) return false;
    return 会话表().has(令牌哈希(t));
  }
  function 读锁定() { return 读JSON(数据文件('auth-locks.json'), { ips: {} }); }
  function 记失败(ip) {
    const state = 读锁定();
    const rec = state.ips[ip] || { failures: 0, lockedUntil: 0 };
    if (Number(rec.lockedUntil) > Date.now()) return { locked: true };
    rec.failures = (Number(rec.failures) || 0) + 1;
    rec.lastFailAt = Date.now();
    if (rec.failures >= 最多失败) rec.lockedUntil = Date.now() + 锁定时长;
    state.ips[ip] = rec;
    try { 写JSON(数据文件('auth-locks.json'), state); } catch { /* ignore */ }
    return { locked: Number(rec.lockedUntil) > Date.now(), failures: rec.failures };
  }
  function 清失败(ip) {
    const state = 读锁定();
    if (state.ips[ip]) { delete state.ips[ip]; try { 写JSON(数据文件('auth-locks.json'), state); } catch { /* ignore */ } }
  }
  function 校验令牌中间件(处理器) {
    return 包装(async (req, res) => {
      if (!验令牌(req)) {
        失败(res, '未登录或登录已过期', 401, { needLogin: true });
        return;
      }
      await 处理器(req, res);
    });
  }

  /* ---------------------------------------------------------- 登录 / 安全 */
  路由.get(路径('/auth/status'), 包装((req, res) => {
    const rec = 认证记录();
    const ip = 取IP(req);
    const 锁 = 读锁定().ips[ip] || {};
    成功(res, {
      已登录: 验令牌(req),
      默认密码: !rec.已改密码,
      失败次数: Number(锁.failures) || 0,
      锁定剩余毫秒: Math.max(0, Number(锁.lockedUntil || 0) - Date.now()),
    });
  }));

  路由.post(路径('/auth/login'), 包装((req, res) => {
    const ip = 取IP(req);
    const 锁 = 读锁定().ips[ip] || {};
    if (Number(锁.lockedUntil) > Date.now()) {
      失败(res, `登录失败次数过多，请 ${Math.ceil((锁.lockedUntil - Date.now()) / 60000)} 分钟后再试`, 429);
      return;
    }
    const rec = 认证记录();
    const 输入 = 哈希(String(req?.body?.password ?? ''), rec.salt);
    const a = Buffer.from(输入, 'hex'), b = Buffer.from(rec.hash, 'hex');
    const 正确 = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!正确) {
      const r = 记失败(ip);
      失败(res, `密码错误${r.locked ? '，账号已锁定 24 小时' : `（第 ${r.failures}/${最多失败} 次）`}`, 401);
      return;
    }
    清失败(ip);
    const token = crypto.randomBytes(24).toString('hex');
    const map = 会话表();
    for (const [k, v] of [...map]) if (!(v.exp > Date.now())) map.delete(k);
    map.set(令牌哈希(token), { ip, exp: Date.now() + 会话时长 });
    try { 保存会话(map); } catch { /* ignore */ }
    成功(res, { token }, '登录成功');
  }));

  路由.post(路径('/auth/logout'), 校验令牌中间件((req, res) => {
    const map = 会话表();
    if (map.delete(令牌哈希(取令牌(req)))) { try { 保存会话(map); } catch { /* ignore */ } }
    成功(res, { ok: true }, '已退出登录');
  }));

  路由.post(路径('/auth/password'), 校验令牌中间件((req, res) => {
    const rec = 认证记录();
    const 旧 = Buffer.from(哈希(String(req?.body?.oldPassword ?? ''), rec.salt), 'hex');
    const 正确 = Buffer.from(rec.hash, 'hex');
    if (旧.length !== 正确.length || !crypto.timingSafeEqual(旧, 正确)) {
      失败(res, '原密码不正确', 403); return;
    }
    const 新密码 = String(req?.body?.password ?? '');
    if (新密码.length < 8 || 新密码.length > 64 || !/[A-Z]/.test(新密码) || !/[a-z]/.test(新密码)
        || !/[0-9]/.test(新密码) || !/[^A-Za-z0-9]/.test(新密码) || 新密码 === 初始密码) {
      失败(res, '新密码需 8–64 位，含大小写字母、数字、特殊符号，且不能沿用初始密码', 400);
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    写JSON(数据文件('auth.json'), { hash: 哈希(新密码, salt), salt, 已改密码: true, updatedAt: Date.now() });
    成功(res, { ok: true }, '密码已修改');
  }));

  /* ------------------------------------------------------------ 总览 */
  路由.get(路径('/overview'), 校验令牌中间件((req, res) => {
    const 当前 = 依赖.当前版本();
    let 问答数 = 0, 范围数 = 0;
    try {
      const 根 = 依赖.问答根();
      for (const 项 of fs.readdirSync(根, { withFileTypes: true })) {
        if (!项.isDirectory() || 项.name === '图片数据') continue;
        范围数 += 1;
        for (const 类型 of ['精准', '模糊', '延时精准', '延时模糊', '延时毫秒精准', '延时毫秒模糊']) {
          try { 问答数 += Object.keys(依赖.读问答(项.name, 类型)).length; } catch { /* ignore */ }
        }
      }
    } catch { /* 目录不存在 */ }
    成功(res, {
      插件名: '问答系统',
      插件ID: 更新.插件ID,
      当前版本: 当前,
      仓库: 更新.仓库,
      发布页: `https://github.com/${更新.仓库}/releases`,
      问答数,
      范围数,
      固定操作者: 依赖.固定操作者(),
      主人数量: 依赖.主人列表().length,
      下载源: 更新.取源(更新.读更新配置(ctx.dataPath).源).键,
      源列表: 更新.下载源表.map((x) => ({ 键: x.键, 名: x.名 })),
    });
  }));

  /* ------------------------------------------------------------ 问答管理 */
  const 合法类型 = new Set(['精准', '模糊', '延时精准', '延时模糊', '延时毫秒精准', '延时毫秒模糊']);
  function 列范围() {
    const 结果 = ['全局', '私聊'];
    try {
      for (const 项 of fs.readdirSync(依赖.问答根(), { withFileTypes: true })) {
        if (项.isDirectory() && !['全局', '私聊', '图片数据'].includes(项.name)) 结果.push(项.name);
      }
    } catch { /* ignore */ }
    return 结果;
  }

  路由.get(路径('/qa/list'), 校验令牌中间件((req, res) => {
    const 范围 = String(req?.query?.scope || '').trim();
    const 列表 = 范围 ? [范围] : 列范围();
    const 数据 = {};
    for (const sc of 列表) {
      数据[sc] = {};
      for (const 类型 of 合法类型) {
        const 原 = 依赖.读问答(sc, 类型);
        数据[sc][类型] = Object.entries(原).map(([question, raw]) => {
          const 拆 = 解析答案(raw);
          return { question, answer: 拆.文本, delay: 拆.延迟, at: 拆.at, raw };
        }).sort((a, b) => a.question.localeCompare(b.question, 'zh-CN'));
      }
    }
    成功(res, { 范围: 列表, 类型: [...合法类型], 数据 });
  }));

  路由.post(路径('/qa/save'), 校验令牌中间件((req, res) => {
    const b = req?.body || {};
    const sc = String(b.scope || '').trim();
    const 类型 = String(b.type || '').trim();
    const 问题 = String(b.question || '').trim();
    const 答案 = String(b.answer ?? '');
    if (!sc || !合法类型.has(类型)) { 失败(res, '范围或问答类型不合法'); return; }
    if (!问题) { 失败(res, '问题不能为空'); return; }
    if (!答案.trim() && !/\[img:/.test(答案)) { 失败(res, '答案不能为空'); return; }
    const 旧 = 依赖.读问答(sc, 类型);
    if (Object.prototype.hasOwnProperty.call(旧, 问题) && !b.replace) {
      失败(res, '该问题已存在，请勾选「覆盖已有」后再保存', 409); return;
    }
    let 延迟 = String(b.delay ?? '').trim();
    if (类型.startsWith('延时毫秒')) {
      if (延迟 && (!/^\d+$/.test(延迟) || +延迟 < 1 || +延迟 > 60000)) { 失败(res, '毫秒延迟需在 1–60000 之间'); return; }
    } else if (类型.startsWith('延时')) {
      if (延迟 && (!/^\d+$/.test(延迟) || +延迟 < 1 || +延迟 > 60)) { 失败(res, '秒数延迟需在 1–60 之间'); return; }
    } else 延迟 = '';
    旧[问题] = 组装答案({ 文本: 答案, 延迟, at: b.at === '' || b.at == null ? undefined : !!b.at });
    依赖.写问答(sc, 类型, 旧);
    成功(res, { scope: sc, type: 类型, question: 问题 }, '已保存');
  }));

  路由.post(路径('/qa/delete'), 校验令牌中间件((req, res) => {
    const b = req?.body || {};
    const sc = String(b.scope || '').trim();
    const 类型 = String(b.type || '').trim();
    const 问题 = String(b.question || '').trim();
    if (!sc || !合法类型.has(类型) || !问题) { 失败(res, '参数不完整'); return; }
    const 旧 = 依赖.读问答(sc, 类型);
    if (!(问题 in 旧)) { 失败(res, '没有这个问题', 404); return; }
    delete 旧[问题];
    依赖.写问答(sc, 类型, 旧);
    成功(res, { ok: true }, '已删除');
  }));

  路由.post(路径('/qa/clear'), 校验令牌中间件((req, res) => {
    const b = req?.body || {};
    const sc = String(b.scope || '').trim();
    const 类型 = String(b.type || '').trim();
    if (!sc || (类型 && !合法类型.has(类型))) { 失败(res, '参数不合法'); return; }
    if (类型) 依赖.写问答(sc, 类型, {});
    else for (const t of 合法类型) 依赖.写问答(sc, t, {});
    成功(res, { ok: true }, '已清空');
  }));

  /* ------------------------------------------------------------ 在线更新 */
  路由.get(路径('/update/status'), 校验令牌中间件((req, res) => {
    const 当前 = 依赖.当前版本();
    const 状态 = 更新.读状态(ctx.dataPath);
    const 配置 = 更新.读更新配置(ctx.dataPath);
    成功(res, {
      当前版本: 当前,
      最新版本: 状态.最新版本 || '',
      阶段: 状态.阶段 || '',
      进行中: !!状态.进行中,
      错误: 状态.错误 || '',
      签名: 状态.签名 || null,
      最后结果: 状态.最后结果 || null,
      源: 更新.取源(配置.源).键,
      源列表: 更新.下载源表.map((x) => ({ 键: x.键, 名: x.名 })),
      仓库: 更新.仓库,
      发布页: `https://github.com/${更新.仓库}/releases`,
    });
  }));

  路由.post(路径('/update/check'), 校验令牌中间件(async (req, res) => {
    if (更新.读状态(ctx.dataPath).进行中) { 失败(res, '已有更新任务在进行中', 409); return; }
    更新.清空发布缓存();
    const 查 = await 更新.查发布('');
    if (!查.ok) {
      更新.写状态(ctx.dataPath, { 阶段: '失败', 错误: 查.原因, 进行中: false });
      失败(res, 查.原因, 502);
      return;
    }
    const 当前 = 依赖.当前版本();
    const 有更新 = 更新.比较版本(查.版本, 当前) > 0;
    更新.写状态(ctx.dataPath, {
      阶段: '已检查', 进行中: false, 当前版本: 当前, 最新版本: 查.版本,
      有更新, 签名: 查.签名, 错误: '',
    });
    成功(res, {
      当前版本: 当前, 最新版本: 查.版本, 有更新, 标题: 查.标题, 发布时间: 查.发布时间,
      说明: 查.说明, 页面: 查.页面, 资产大小: 查.资产大小, 签名: 查.签名,
    });
  }));

  路由.post(路径('/update/source'), 校验令牌中间件((req, res) => {
    const 键 = String(req?.body?.source || '').trim();
    if (!更新.下载源表.some((x) => x.键 === 键)) { 失败(res, '未知的下载源'); return; }
    更新.写更新配置(ctx.dataPath, { 源: 键 });
    成功(res, { 源: 键, 源列表: 更新.下载源表.map((x) => ({ 键: x.键, 名: x.名 })) }, '下载源已保存');
  }));

  let 更新中 = false;
  路由.post(路径('/update/install'), 校验令牌中间件(async (req, res) => {
    if (更新中 || 更新.读状态(ctx.dataPath).进行中) { 失败(res, '已有更新任务在进行中', 409); return; }
    const b = req?.body || {};
    const 目标版本 = String(b.version || '').replace(/^v/i, '').trim();
    const 源键 = String(b.source || '').trim() || 更新.取源(更新.读更新配置(ctx.dataPath).源).键;
    const 接受风险 = b.acceptRisk === true;
    const 当前 = 依赖.当前版本();
    if (目标版本 && 更新.比较版本(目标版本, 当前) <= 0) {
      失败(res, `目标版本 v${目标版本} 不高于当前版本 v${当前}；每次更新都必须升版本号`, 400);
      return;
    }
    const 安装源 = 更新.解析安装源目录(ctx);
    const 插件目录 = String(ctx.pluginPath || '').trim();
    if (!插件目录 || !fs.existsSync(插件目录)) { 失败(res, '识别不到运行中的插件目录', 500); return; }
    if (!安装源) { 失败(res, '识别不到安装源目录 plugins/GF-plugin-wenda，已取消更新（否则运行副本会被旧文件覆盖回去）', 500); return; }
    更新中 = true;
    try {
      const 结果 = await 更新.执行更新({
        插件目录, 安装源目录: 安装源, dataPath: ctx.dataPath, 目标版本, 源键, 允许无签名: 接受风险,
      });
      if (!结果.ok) {
        失败(res, 结果.原因, 结果.需要风险确认 ? 409 : 500, {
          阶段: 结果.阶段, 需要风险确认: !!结果.需要风险确认, 签名: 结果.签名 || null,
        });
        return;
      }
      成功(res, 结果, `已更新到 v${结果.新版本}`);
      setTimeout(async () => {
        try {
          const pm = ctx.pluginManager;
          if (pm && typeof pm.reloadPlugin === 'function') await pm.reloadPlugin(更新.插件ID);
          else ctx.logger?.warn?.('[wenda] 宿主未提供 pluginManager.reloadPlugin，请手动重载插件');
        } catch (e) { ctx.logger?.error?.('[wenda] 自更新后重载失败:', e); }
      }, 2500);
    } finally {
      更新中 = false;
    }
  }));

  /* ---------------------------------------------------------- 控制台页面 */
  if (typeof 路由.page === 'function') {
    try {
      路由.page({
        path: 'admin',
        kind: 'module',
        title: '问答系统 · 管理控制台',
        icon: 'message-square',
        description: '问答管理 · 在线更新 · 官方签名验证',
        module: 'webui/remote.js',
      });
    } catch (e) { ctx.logger?.warn?.('[wenda] page() 注册失败:', e); }
  }
  ctx.logger?.info?.('[wenda] 网页控制台已注册：/wenda/*');
  return true;
}
