/* ============================================================
 * 问答系统 · 控制台内嵌页面（webui/remote.js）
 * 设计系统：与 GF-plugin-xjyl / GF-kzt 控制台同源的玻璃拟态风格
 *   · 青绿渐变底 + 半透明毛玻璃卡片 + 220px 侧边栏 + 顶部 Toast
 *   · token：--accent #0f766e / --muted #64748b / --ok / --warn / --fail
 *   · 移动端（<=820px）侧栏收起为底部 TabBar
 * 契约：React 由宿主 importmap 注入；默认导出组件收到
 *   { apiBase, moduleBase, fetch, navigate, pluginId, accountKey, pagePath }
 * 无第三方 UI 库：仅 React + 自注入 CSS。
 * ============================================================ */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const h = React.createElement;
const 令牌键 = 'wenda-token';

const CSS = `.qa-admin{--ink:#0b1220;--text:#0f172a;--heading:#1e293b;--muted:#64748b;--accent:#0f766e;--accent-2:#0d9488;--accent-soft:rgba(15,118,110,.12);--ok:#059669;--warn:#b45309;--fail:#dc2626;--card:rgba(255,255,255,.52);--line:rgba(255,255,255,.42);--radius:16px;--radius-sm:10px;--font:"Manrope","PingFang SC","Microsoft YaHei",sans-serif;--mono:ui-monospace,Consolas,monospace;--sidebar-w:220px;--mobile-nav-h:4.25rem;--safe-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box;display:flex;min-height:100%;height:100%;max-height:none;overflow:hidden;color:var(--text);font-family:var(--font);font-size:13px;line-height:1.55;background:radial-gradient(900px 520px at 8% -6%,rgba(45,212,191,.28),transparent 55%),radial-gradient(780px 480px at 96% 4%,rgba(56,189,248,.2),transparent 52%),radial-gradient(640px 420px at 70% 110%,rgba(165,243,252,.18),transparent 50%),linear-gradient(155deg,#e0f2fe,#ecfeff 42%,#e0f7f4)}
.qa-admin *,.qa-admin *:before,.qa-admin *:after{box-sizing:border-box}
.qa-admin *{scrollbar-width:none}.qa-admin *::-webkit-scrollbar{display:none}
.qa-admin .sidebar{width:var(--sidebar-w);flex-shrink:0;display:flex;flex-direction:column;gap:4px;padding:18px 12px;color:var(--heading);background:#ffffff4d;backdrop-filter:blur(16px);border-right:1px solid rgba(255,255,255,.4);overflow:auto}
.qa-admin .brand{font-family:var(--font);font-weight:800;font-size:1.35rem;padding:8px 10px 18px;line-height:1.1}
.qa-admin .brand .mark{background:linear-gradient(120deg,#0f766e 10%,#0d9488,#38bdf8);-webkit-background-clip:text;background-clip:text;color:transparent}
.qa-admin .brand small{display:block;margin-top:6px;font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#475569a6}
.qa-admin .nav-label{font-size:10px;color:#64748bd9;letter-spacing:.14em;text-transform:uppercase;padding:14px 10px 6px;font-weight:600}
.qa-admin .nav-item{display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;border-radius:12px;border:1px solid transparent;background:transparent;color:#334155d1;font:inherit;font-size:13px;font-weight:600;text-align:left;cursor:pointer;transition:.2s}
.qa-admin .nav-item:hover{background:#ffffff73;color:var(--heading)}
.qa-admin .nav-item.active{background:#14b8a633;border-color:rgba(45,212,191,.4);color:#0f766e;box-shadow:0 4px 14px #14b8a61f}
.qa-admin .main{flex:1;min-width:0;overflow:auto;padding:20px 22px 28px}
.qa-admin .page-title{margin:0 0 4px;font-weight:800;font-size:1.45rem;color:var(--heading)}
.qa-admin .page-sub{margin:0 0 16px;font-size:12px;color:var(--muted)}
.qa-admin .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px;padding:12px;border-radius:12px;background:#fff3;border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(8px);box-shadow:0 6px 18px #94a3b81f}
.qa-admin .toolbar label{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#1e293b;background:#ffffff38;border:1px solid rgba(255,255,255,.35);border-radius:10px;padding:6px 10px}
.qa-admin .btn{font:inherit;font-size:13px;font-weight:600;border-radius:var(--radius-sm);padding:9px 13px;cursor:pointer;transition:background .2s,border-color .2s,color .2s,transform .15s}
.qa-admin .btn:hover:not(:disabled){transform:translateY(-1px)}
.qa-admin .btn:disabled{opacity:.5;cursor:not-allowed}
.qa-admin .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.55);color:#0f766e}
.qa-admin .btn-ghost:hover{background:#ffffff59}
.qa-admin .btn-solid{background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;border:0;box-shadow:0 8px 20px #0f766e47}
.qa-admin .btn-secondary{background:#fff3;border:1px solid rgba(255,255,255,.4);color:var(--text)}
.qa-admin .btn-danger{background:#dc26261f;border:1px solid #dc262655;color:var(--fail)}
.qa-admin .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}
.qa-admin .stat-card,.qa-admin .panel{background:#fff3;border:1px solid rgba(255,255,255,.4);border-radius:1rem;padding:16px;backdrop-filter:blur(16px);box-shadow:0 10px 28px #94a3b82e;transition:background .25s,transform .25s,box-shadow .25s}
.qa-admin .stat-card{background:#ffffff47;display:flex;flex-direction:column;gap:4px}
.qa-admin .stat-card:hover{background:#ffffff5c;transform:translateY(-2px);box-shadow:0 14px 32px #94a3b83d}
.qa-admin .stat-card .label{color:#475569;font-size:13px;font-weight:600}
.qa-admin .stat-card .value{font-size:1.5rem;font-weight:800;color:#0d9488;font-variant-numeric:tabular-nums;line-height:1.2}
.qa-admin .stat-card .hint{color:#94a3b8;font-size:12px}
.qa-admin .panel h3{margin:0 0 12px;font-size:1.02rem;font-weight:700;color:#1e293b}
.qa-admin .quote{color:var(--muted);background:#0f172a0d;border-left:3px solid var(--accent-2);padding:8px 10px;border-radius:0 8px 8px 0;font-size:12px;line-height:1.6}
.qa-admin .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}
.qa-admin .split{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;align-items:stretch}
.qa-admin .split>.panel{display:flex;flex-direction:column;min-height:160px}
.qa-admin .chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:var(--accent-soft);color:var(--accent-2)}
.qa-admin .chip.group{background:rgba(224,242,254,.75);color:#0369a1}
.qa-admin .chip.priv{background:rgba(255,228,230,.75);color:#be123c}
.qa-admin .chip.ok{background:#0596691f;color:var(--ok)}
.qa-admin .chip.warn{background:#b453091f;color:var(--warn)}
.qa-admin .chip.fail{background:#dc26261f;color:var(--fail)}
.qa-admin input,.qa-admin select,.qa-admin textarea{border:1px solid rgba(255,255,255,.45);background:#fff3;border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;color:var(--text);outline:none}
.qa-admin input:focus,.qa-admin select:focus,.qa-admin textarea:focus{box-shadow:0 0 0 2px #14b8a647}
.qa-admin .search{min-width:180px}
.qa-admin textarea{width:100%;min-height:84px;resize:vertical}
.qa-admin .tablewrap{overflow:auto;border:1px solid rgba(255,255,255,.4);border-radius:12px;background:#ffffff26;max-height:calc(100vh - 300px)}
.qa-admin table{width:100%;min-width:760px;border-collapse:collapse;font-size:12px}
.qa-admin th,.qa-admin td{text-align:left;padding:10px 12px;border-bottom:1px solid rgba(15,23,42,.06);vertical-align:top;word-break:break-word;overflow-wrap:anywhere}
.qa-admin th{color:var(--muted);font-size:12px;font-weight:700;background:#ffffff1f;position:sticky;top:0;backdrop-filter:blur(8px)}
.qa-admin tr:last-child td{border-bottom:0}
.qa-admin .empty{padding:28px 16px;text-align:center;color:var(--muted);font-size:13px}
.qa-admin .mask{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:16px;background:#0f172a47;backdrop-filter:blur(4px)}
.qa-admin .modal{width:min(620px,96vw);max-height:88vh;overflow:auto;border-radius:16px;border:1px solid rgba(255,255,255,.45);background:#ffffffd1;backdrop-filter:blur(18px);box-shadow:0 18px 40px #0f172a2e;padding:20px}
.qa-admin .modal h3{margin:0 0 14px;font-size:1.05rem;color:var(--heading)}
.qa-admin .modal label{display:block;font-size:12px;color:var(--muted);margin:10px 0 4px;font-weight:600}
.qa-admin .toast{position:fixed;left:50%;top:max(16px,env(safe-area-inset-top,0px));transform:translate(-50%) translateY(-8px);z-index:90;background:#0b1220c7;color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;pointer-events:none;transition:opacity .22s,transform .22s;max-width:min(90vw,360px);text-align:center;backdrop-filter:blur(12px)}
.qa-admin .toast.show{opacity:1;transform:translate(-50%) translateY(0)}
.qa-admin .toast.err{background:#7f1d1dc7}
.qa-admin .mobile-tabbar{display:none}
.qa-admin .login-wrap{margin:auto;width:min(400px,94vw);padding:20px}
.qa-admin .login-card{background:#ffffff5c;border:1px solid rgba(255,255,255,.45);border-radius:1.25rem;padding:24px;backdrop-filter:blur(18px);box-shadow:0 18px 40px #0f172a2e}
.qa-admin .login-card h2{margin:0 0 6px;font-size:1.25rem;color:var(--heading)}
.qa-admin .login-card p{margin:0 0 18px;font-size:12px;color:var(--muted)}
.qa-admin .login-card input{width:100%;margin-bottom:12px}
.qa-admin .login-card .btn{width:100%}
@media(max-width:980px){.qa-admin .stats{grid-template-columns:repeat(2,1fr)}.qa-admin .split{grid-template-columns:1fr}}
@media(max-width:820px){.qa-admin{flex-direction:column;max-height:none}.qa-admin .sidebar{display:none}.qa-admin .main{padding:14px 12px calc(var(--mobile-nav-h) + var(--safe-bottom) + 1.75rem)}.qa-admin .mobile-tabbar{position:fixed;left:1rem;right:1rem;bottom:calc(.75rem + var(--safe-bottom));z-index:40;display:flex;border-radius:1.25rem;padding:.45rem;gap:.25rem;justify-content:space-around;background:#ffffff47;backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.42);box-shadow:0 16px 40px #0f172a29}.qa-admin .mobile-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid transparent;background:transparent;border-radius:.9rem;padding:.55rem .35rem;font:inherit;font-size:10px;font-weight:600;color:#64748b;cursor:pointer}.qa-admin .mobile-tab.active{color:#0f766e;background:#14b8a633;border-color:#2dd4bf66}.qa-admin .tablewrap{max-height:none}}
.qa-login-root{display:flex;min-height:100vh;color:var(--text,#0f172a);font-family:"Manrope","PingFang SC","Microsoft YaHei",sans-serif;background:radial-gradient(900px 520px at 8% -6%,rgba(45,212,191,.28),transparent 55%),linear-gradient(155deg,#e0f2fe,#ecfeff 42%,#e0f7f4)}`;

function 注入样式() {
  if (document.getElementById('qa-admin-style')) return;
  const s = document.createElement('style');
  s.id = 'qa-admin-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const 页签项 = [
  ['overview', '📊', '概览'], ['qa', '📚', '问答管理'],
  ['update', '🔄', '在线更新'], ['security', '🔐', '安全'],
];
const 类型选项 = ['精准', '模糊', '延时精准', '延时模糊', '延时毫秒精准', '延时毫秒模糊'];
const 源选项 = [
  { k: 'direct', n: 'GitHub 直连' }, { k: 'api', n: 'GitHub 官方 API' },
  { k: 'ghproxy', n: 'gh-proxy 加速' }, { k: 'catmak', n: 'catmak 加速' },
];

export default function WendaConsole(props) {
  注入样式();
  const base = String(props.apiBase || '').replace(/\/$/, '') + '/wenda';
  const 请求 = props.fetch || fetch;
  const [令牌, set令牌] = useState(() => { try { return localStorage.getItem(令牌键) || ''; } catch { return ''; } });
  const [已登录, set已登录] = useState(false);
  const [默认密码, set默认密码] = useState(true);
  const [密码, set密码] = useState('');
  const [旧密码, set旧密码] = useState('');
  const [新密码, set新密码] = useState('');
  const [忙, set忙] = useState(false);
  const [toast, setToast] = useState(null);
  const [页签, set页签] = useState('overview');
  const [总览, set总览] = useState(null);
  const [问答, set问答] = useState(null);
  const [范围, set范围] = useState('');
  const [类型, set类型] = useState('精准');
  const [搜索, set搜索] = useState('');
  const [编辑, set编辑] = useState(null);
  const [覆盖, set覆盖] = useState(false);
  const [更新态, set更新态] = useState(null);
  const [检查结果, set检查结果] = useState(null);
  const [接受风险, set接受风险] = useState(false);
  const [令牌输入, set令牌输入] = useState('');
  const [令牌信息, set令牌信息] = useState({ 已设置: false, 掩码: '' });
  const [显示令牌, set显示令牌] = useState(false);
  const [额度, set额度] = useState(null);

  const 提示 = useCallback((文, 错误 = false) => {
    setToast({ 文: String(文 || ''), 错误 });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const api = useCallback(async (路径, 方法 = 'GET', body = undefined) => {
    const headers = { 'Content-Type': 'application/json' };
    if (令牌) headers['X-Wenda-Token'] = 令牌;
    const res = await 请求(base + 路径, {
      method: 方法, headers, credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const 文 = await res.text().catch(() => '');
    let j = null;
    try { j = 文 ? JSON.parse(文) : null; } catch { /* ignore */ }
    if (res.status === 401 && 路径 !== '/auth/login') {
      try { localStorage.removeItem(令牌键); } catch { /* ignore */ }
      set令牌(''); set已登录(false);
    }
    if (!res.ok || (j && j.code !== 0)) {
      throw new Error(String((j && j.message) || `HTTP ${res.status} ${文.slice(0, 120)}`));
    }
    return j && j.data;
  }, [base, 令牌, 请求]);

  const 刷新 = useCallback(async () => {
    if (!已登录) return;
    try {
      const [o, u] = await Promise.all([api('/overview'), api('/update/status')]);
      set总览(o); set更新态(u);
      if (页签 === 'qa') set问答(await api(`/qa/list${范围 ? `?scope=${encodeURIComponent(范围)}` : ''}`));
    } catch (e) { 提示(e.message, true); }
  }, [api, 已登录, 页签, 范围, 提示]);

  useEffect(() => {
    let 活 = true;
    (async () => {
      try {
        const d = await api('/auth/status');
        if (!活) return;
        set默认密码(!!d.默认密码); set已登录(!!d.已登录);
        if (d.已登录) 刷新();
      } catch (e) { if (活) 提示(e.message, true); }
    })();
    return () => { 活 = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (已登录) 刷新(); }, [页签, 范围, 刷新]);
  useEffect(() => {
    if (已登录 && 页签 === 'security') {
      (async () => {
        try {
          const [t, q] = await Promise.all([api('/settings/token'), api('/settings/rate-limit').catch(() => null)]);
          set令牌信息(t); set额度(q); set令牌输入(''); set显示令牌(false);
        } catch (e) { 提示(e.message, true); }
      })();
    }
  }, [已登录, 页签, api, 提示]);

  async function 执行(fn, 成功文) {
    set忙(true);
    try { await fn(); if (成功文) 提示(成功文); }
    catch (e) { 提示(e.message || String(e), true); }
    finally { set忙(false); }
  }

  async function 登录() {
    await 执行(async () => {
      const d = await api('/auth/login', 'POST', { password: 密码 });
      try { localStorage.setItem(令牌键, d.token); } catch { /* ignore */ }
      set令牌(d.token); set已登录(true); set密码('');
    }, '登录成功');
  }

  async function 改密码() {
    await 执行(async () => {
      await api('/auth/password', 'POST', { oldPassword: 旧密码, password: 新密码 });
      set旧密码(''); set新密码(''); set默认密码(false);
    }, '密码已修改');
  }

  async function 保存令牌() {
    await 执行(async () => {
      const d = await api('/settings/token', 'POST', { token: 令牌输入 });
      set令牌信息(d); set令牌输入(''); set显示令牌(false);
      set额度(await api('/settings/rate-limit').catch(() => null));
    }, 令牌输入 ? 'Token 已保存，更新走认证额度' : '已清除 Token');
  }

  async function 切换令牌显示() {
    if (显示令牌) { set显示令牌(false); set令牌输入(''); return; }
    await 执行(async () => {
      const d = await api('/settings/token?reveal=1');
      set令牌输入(d.token || ''); set显示令牌(true);
    });
  }

  async function 检查更新() {
    await 执行(async () => {
      const d = await api('/update/check', 'POST', {});
      set检查结果(d); set接受风险(false);
    }, '检查完成');
  }

  async function 安装更新() {
    await 执行(async () => {
      const d = await api('/update/install', 'POST', {
        version: 检查结果 && 检查结果.最新版本, acceptRisk: 接受风险,
      });
      set更新态(await api('/update/status'));
      setTimeout(() => api('/update/status').then(set更新态).catch(() => {}), 3000);
    }, `已更新到 v${检查结果 && 检查结果.最新版本}，正在重载`);
  }

  async function 保存问答() {
    if (!编辑) return;
    await 执行(async () => {
      await api('/qa/save', 'POST', { ...编辑, replace: 覆盖 });
      set编辑(null); set覆盖(false);
      set问答(await api(`/qa/list${范围 ? `?scope=${encodeURIComponent(范围)}` : ''}`));
    }, '已保存问答');
  }

  async function 删除问答(q) {
    if (!window.confirm(`确定删除「${q.question}」吗？`)) return;
    await 执行(async () => {
      await api('/qa/delete', 'POST', { scope: q._scope || 范围 || '全局', type: q._type, question: q.question });
      set问答(await api(`/qa/list${范围 ? `?scope=${encodeURIComponent(范围)}` : ''}`));
    }, '已删除');
  }

  const 条目 = useMemo(() => {
    if (!问答 || !问答.数据) return [];
    const out = [];
    for (const sc of Object.keys(问答.数据)) {
      if (范围 && sc !== 范围) continue;
      for (const x of (问答.数据[sc][类型] || [])) out.push({ ...x, _scope: sc, _type: 类型 });
    }
    const kw = 搜索.trim().toLowerCase();
    return kw ? out.filter(x => x.question.toLowerCase().includes(kw) || x.answer.toLowerCase().includes(kw)) : out;
  }, [问答, 范围, 类型, 搜索]);

  const Toast = h('div', { className: `toast${toast ? ' show' : ''}${toast && toast.错误 ? ' err' : ''}` }, toast ? toast.文 : '');
  const 页面标题 = (页签项.find(x => x[0] === 页签) || [])[2] || '概览';

  if (!已登录) {
    return h('div', { className: 'qa-login-root' },
      h('style', null, CSS),
      h('div', { className: 'qa-admin login-wrap', style: { display: 'flex', alignItems: 'center' } },
        h('div', { className: 'login-card' },
          h('h2', null, '💬 问答系统 · 控制台'),
          h('p', null, `初始密码 ${默认密码 ? '12345678' : '已修改'}，登录后请尽快更新。`),
          h('input', { type: 'password', value: 密码, placeholder: '请输入控制台密码', onChange: e => set密码(e.target.value), onKeyDown: e => { if (e.key === 'Enter') 登录(); } }),
          h('button', { className: 'btn btn-solid', disabled: 忙 || !密码, onClick: 登录 }, 忙 ? '登录中…' : '登录'),
        )
      ),
      Toast
    );
  }

  const 签 = 检查结果 && 检查结果.签名;

  function 侧栏() {
    return h('aside', { className: 'sidebar' },
      h('div', { className: 'brand' }, h('span', { className: 'mark' }, '问答系统'), h('small', null, 'QA CONSOLE')),
      h('div', { className: 'nav-label' }, '工作台'),
      ...页签项.map(([k, icon, 名]) => h('button', {
        key: k, className: `nav-item${页签 === k ? ' active' : ''}`, onClick: () => set页签(k),
      }, h('span', null, icon), 名)),
      h('div', { style: { marginTop: 'auto', padding: '10px', fontSize: '11px', color: '#94a3b8' } }, `v${(总览 && 总览.当前版本) || '—'} · GF-plugin-wenda`)
    );
  }

  function 概览页() {
    return h('div', null,
      h('div', { className: 'stats' }, [
        ['当前版本', `v${(总览 && 总览.当前版本) || '—'}`, '在线更新可检查新版'],
        ['问答条数', (总览 && 总览.问答数) || 0, '全部范围合计'],
        ['范围数量', (总览 && 总览.范围数) || 0, '含全局 / 私聊 / 各群'],
        ['主人数量', (总览 && 总览.主人数量) || 0, '固定操作者 + 其他主人'],
      ].map(([k, v, hint]) => h('div', { className: 'stat-card', key: k },
        h('div', { className: 'label' }, k), h('div', { className: 'value' }, v), h('div', { className: 'hint' }, hint)))),
      h('div', { className: 'panel' },
        h('h3', null, '插件信息'),
        h('div', { className: 'row' }, h('span', { className: 'chip' }, '固定操作者'), h('code', null, (总览 && 总览.固定操作者) || '—')),
        h('div', { className: 'row' }, h('span', { className: 'chip' }, '下载源'), h('code', null, (总览 && 总览.下载源) || 'direct')),
        h('div', { className: 'quote', style: { marginTop: 12 } }, `仓库：${(总览 && 总览.仓库) || '3671656786/GF-plugin-wenda'}　发布页：${(总览 && 总览.发布页) || ''}`)
      )
    );
  }

  function 问答页() {
    return h('div', null,
      h('div', { className: 'toolbar' },
        h('label', null, '范围', h('select', { value: 范围, onChange: e => set范围(e.target.value) },
          h('option', { value: '' }, '全部'),
          ((问答 && 问答.范围) || ['全局', '私聊']).map(x => h('option', { key: x, value: x }, x)))),
        h('label', null, '类型', h('select', { value: 类型, onChange: e => set类型(e.target.value) }, 类型选项.map(x => h('option', { key: x, value: x }, x)))),
        h('input', { className: 'search', value: 搜索, placeholder: '搜索问题 / 答案…', onChange: e => set搜索(e.target.value) }),
        h('button', { className: 'btn btn-solid', onClick: () => set编辑({ scope: 范围 || '全局', type: 类型, question: '', answer: '', delay: '', at: '' }) }, '＋ 新增问答')
      ),
      h('div', { className: 'tablewrap' },
        h('table', null,
          h('thead', null, h('tr', null, ['范围', '类型', '问题', '答案', '延迟', '艾特', '操作'].map(x => h('th', { key: x }, x)))),
          h('tbody', null, 条目.length === 0
            ? h('tr', null, h('td', { colSpan: 7, className: 'empty' }, '暂无数据，点右上角「新增问答」开始'))
            : 条目.map(x => h('tr', { key: `${x._scope}|${x._type}|${x.question}` },
              h('td', null, h('span', { className: `chip ${x._scope === '全局' ? 'group' : 'priv'}` }, x._scope)),
              h('td', null, x._type),
              h('td', null, x.question),
              h('td', null, x.answer.length > 100 ? x.answer.slice(0, 100) + '…' : x.answer),
              h('td', null, x.delay || '—'),
              h('td', null, x.at === undefined ? '默认' : (x.at ? '艾特' : '纯文本')),
              h('td', null, h('div', { className: 'row', style: { marginTop: 0 } },
                h('button', { className: 'btn btn-ghost', onClick: () => set编辑({ scope: x._scope, type: x._type, question: x.question, answer: x.answer, delay: x.delay, at: x.at === undefined ? '' : (x.at ? '1' : '0'), _old: x.question }) }, '编辑'),
                h('button', { className: 'btn btn-danger', onClick: () => 删除问答(x) }, '删除')
              ))
            ))
          )
        )
      ),
      h('div', { className: 'quote', style: { marginTop: 12 } }, '答案格式与聊天指令一致：[img:文件名] 表示图片；网页改动立即生效，无需重载。')
    );
  }

  function 更新页() {
    return h('div', null,
      h('div', { className: 'split' },
        h('div', { className: 'panel' },
          h('h3', null, '版本检查'),
          h('div', { className: 'row', style: { marginTop: 0 } },
            h('span', { className: 'chip' }, `当前 v${(更新态 && 更新态.当前版本) || '—'}`),
            h('span', { className: 'chip group' }, `最新 ${检查结果 ? 'v' + 检查结果.最新版本 : ((更新态 && 更新态.最新版本) || '—')}`)),
          h('div', { className: 'row' },
            h('button', { className: 'btn btn-solid', disabled: 忙, onClick: 检查更新 }, 忙 ? '检查中…' : '🔍 检查更新'),
            h('button', { className: 'btn btn-secondary', disabled: 忙 || !检查结果 || 检查结果.有更新 !== true, onClick: 安装更新 }, '⬆️ 安装更新')
          ),
          h('div', { className: 'quote', style: { marginTop: 12 } }, `阶段：${(更新态 && 更新态.阶段) || '未开始'}　${(更新态 && 更新态.错误) || ''}`),
          检查结果 ? h('div', { style: { marginTop: 10 } },
            h('a', { href: 检查结果.页面, target: '_blank', rel: 'noreferrer' }, 检查结果.页面),
            h('div', { className: 'quote', style: { marginTop: 8, maxHeight: 130, overflow: 'auto' } }, 检查结果.说明 || '（无说明）')
          ) : null
        ),
        h('div', { className: 'panel' },
          h('h3', null, '🔒 官方签名'),
          签 ? h('div', null,
            h('span', { className: `chip ${签.官方已验证 ? 'ok' : 'warn'}` }, 签.官方已验证 ? 'GitHub 已验证官方签名' : '官方签名未通过'),
            h('div', { className: 'quote', style: { marginTop: 10 } }, 签.原因),
            h('div', { className: 'row' }, h('span', { className: 'chip' }, `提交 ${String(签.提交 || '').slice(0, 7)}`), h('span', { className: 'chip' }, `作者 ${签.作者登录 || '未知'}`))
          ) : h('div', { className: 'quote' }, '点「检查更新」后显示签名信息。'),
          签 && !签.官方已验证 ? h('label', { className: 'row', style: { color: '#92400e' } },
            h('input', { type: 'checkbox', checked: 接受风险, onChange: e => set接受风险(e.target.checked) }),
            '我已了解风险，仍要继续安装')
            : null
        )
      ),
      h('div', { className: 'split' },
        h('div', { className: 'panel' },
          h('h3', null, '🌐 下载源'),
          h('select', { value: (更新态 && 更新态.源) || 'direct', onChange: e => 执行(() => api('/update/source', 'POST', { source: e.target.value }).then(刷新), '下载源已保存') },
            源选项.map(x => h('option', { key: x.k, value: x.k }, `${x.n}（${x.k}）`))),
          h('div', { className: 'quote', style: { marginTop: 10 } }, '首选源不通时自动依次降级到其余下载源。')
        ),
        h('div', { className: 'panel' },
          h('h3', null, '📦 更新记录'),
          更新态 && 更新态.最后结果
            ? h('div', { className: 'quote', style: { maxHeight: 150, overflow: 'auto' } }, JSON.stringify(更新态.最后结果, null, 2).slice(0, 3000))
            : h('div', { className: 'quote' }, '暂无更新记录。')
        )
      )
    );
  }

  function 安全页() {
    return h('div', null,
      h('div', { className: 'panel' },
        h('h3', null, '🔑 GitHub API Token'),
        h('div', { className: 'row', style: { marginTop: 0 } },
          h('span', { className: 'chip group' }, `核心 ${额度 ? 额度.核心剩余 : '—'}/${额度 ? 额度.核心上限 : '—'}`),
          h('span', { className: 'chip priv' }, `搜索 ${额度 ? 额度.搜索剩余 : '—'}/${额度 ? 额度.搜索上限 : '—'}`),
          h('span', { className: `chip ${令牌信息.已设置 ? 'ok' : 'warn'}` }, 令牌信息.已设置 ? '已设置' : '未设置')),
        h('div', { className: 'row' },
          h('input', { className: 'grow', type: 显示令牌 ? 'text' : 'password', value: 令牌输入, placeholder: 令牌信息.掩码 || '粘贴 GitHub Token（留空保存可清除）', onChange: e => set令牌输入(e.target.value), style: { flex: 1 } }),
          h('button', { className: 'btn btn-ghost', title: 显示令牌 ? '隐藏' : '显示', onClick: 切换令牌显示 }, 显示令牌 ? '🙈' : '👁'),
          h('button', { className: 'btn btn-solid', disabled: 忙, onClick: 保存令牌 }, '保存')
        ),
        h('div', { className: 'quote', style: { marginTop: 12 } },
          '填 Token 后更新检查走认证额度（核心 5000 次/小时），不再受未认证 60 次/小时限制。'),
        h('a', { href: 'https://github.com/settings/tokens', target: '_blank', rel: 'noreferrer', style: { fontSize: 12 } }, '去 github.com/settings/tokens 新建 Token（需 public_repo / Read-only）')
      ),
      h('div', { className: 'split' },
        h('div', { className: 'panel' },
          h('h3', null, '修改控制台密码'),
          h('label', { style: { fontSize: 12, color: '#64748b' } }, '原密码'),
          h('input', { type: 'password', value: 旧密码, style: { width: '100%' }, onChange: e => set旧密码(e.target.value) }),
          h('label', { style: { fontSize: 12, color: '#64748b' } }, '新密码'),
          h('input', { type: 'password', value: 新密码, style: { width: '100%' }, onChange: e => set新密码(e.target.value) }),
          h('div', { className: 'quote', style: { marginTop: 10 } }, '需 8–64 位，含大小写字母、数字与特殊符号。'),
          h('div', { className: 'row' }, h('button', { className: 'btn btn-solid', disabled: 忙 || !旧密码 || !新密码, onClick: 改密码 }, '保存新密码'))
        ),
        h('div', { className: 'panel' },
          h('h3', null, '安全说明'),
          h('div', { className: 'quote' }, '密码只以 scrypt 哈希保存在插件数据目录；会话 7 天有效；连续输错 5 次锁定 24 小时。'),
          h('div', { className: 'row' }, h('button', { className: 'btn btn-secondary', onClick: () => 执行(() => api('/auth/logout', 'POST', {}).then(() => {
            try { localStorage.removeItem(令牌键); } catch { /* ignore */ }
            set令牌(''); set已登录(false);
          })) }, '退出登录'))
        )
      )
    );
  }

  return h('div', { className: 'qa-admin' },
    侧栏(),
    h('main', { className: 'main' },
      h('h1', { className: 'page-title' }, 页面标题),
      h('p', { className: 'page-sub' }, 'GF-plugin-wenda · 问答管理 / 在线更新 / 官方签名验证'),
      页签 === 'overview' ? 概览页() : null,
      页签 === 'qa' ? 问答页() : null,
      页签 === 'update' ? 更新页() : null,
      页签 === 'security' ? 安全页() : null
    ),
    h('nav', { className: 'mobile-tabbar' }, 页签项.map(([k, icon, 名]) =>
      h('button', { key: k, className: `mobile-tab${页签 === k ? ' active' : ''}`, onClick: () => set页签(k) },
        h('span', null, icon), h('span', null, 名)))),
    编辑 ? h('div', { className: 'mask', onClick: () => set编辑(null) },
      h('div', { className: 'modal', onClick: e => e.stopPropagation() },
        h('h3', null, 编辑._old ? '编辑问答' : '新增问答'),
        h('label', null, '范围'), h('input', { value: 编辑.scope || '', placeholder: '全局 / 私聊 / 群号', style: { width: '100%' }, onChange: e => set编辑({ ...编辑, scope: e.target.value }) }),
        h('label', null, '类型'), h('select', { value: 编辑.type, onChange: e => set编辑({ ...编辑, type: e.target.value }) }, 类型选项.map(x => h('option', { key: x, value: x }, x))),
        h('label', null, '问题'), h('input', { value: 编辑.question, style: { width: '100%' }, onChange: e => set编辑({ ...编辑, question: e.target.value }) }),
        h('label', null, '答案（支持 [img:文件名]）'), h('textarea', { value: 编辑.answer, onChange: e => set编辑({ ...编辑, answer: e.target.value }) }),
        h('div', { className: 'row' },
          h('label', { style: { flex: 1 } }, '延迟（秒 / 毫秒）'), h('input', { value: 编辑.delay || '', placeholder: '留空=无延迟', onChange: e => set编辑({ ...编辑, delay: e.target.value }) }),
          h('label', { style: { flex: 1 } }, '艾特模式'), h('select', { value: String(编辑.at ?? ''), onChange: e => set编辑({ ...编辑, at: e.target.value }) },
            h('option', { value: '' }, '默认'), h('option', { value: '1' }, '艾特'), h('option', { value: '0' }, '纯文本'))
        ),
        h('label', { className: 'row' }, h('input', { type: 'checkbox', checked: 覆盖, onChange: e => set覆盖(e.target.checked) }), '覆盖已有问题'),
        h('div', { className: 'row', style: { justifyContent: 'flex-end' } },
          h('button', { className: 'btn btn-secondary', onClick: () => set编辑(null) }, '取消'),
          h('button', { className: 'btn btn-solid', disabled: 忙, onClick: 保存问答 }, '保存'))
      )
    ) : null,
    Toast
  );
}
