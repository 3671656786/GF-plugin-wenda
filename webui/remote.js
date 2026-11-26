/* ============================================================
 * 问答系统 · 控制台内嵌页面（webui/remote.js）
 * 仿照 GF-plugin-xjyl / GF-kzt 的 React 模块契约：
 *   import React from 'react'（宿主 importmap 注入同实例）
 *   export default function({ apiBase, fetch, ... }) { ... }
 * 无第三方 UI 库，仅用 React + 内联样式 + 自注入 CSS。
 * ============================================================ */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const h = React.createElement;
const 令牌键 = 'wenda-token';

function 注入样式() {
  if (document.getElementById('wenda-console-style')) return;
  const s = document.createElement('style');
  s.id = 'wenda-console-style';
  s.textContent = `
.wd{--bg:#f6f8fb;--card:#fff;--line:#e4e9f0;--txt:#1f2937;--sub:#64748b;--accent:#0f766e;--accent2:#14b8a6;--danger:#dc2626;--warn:#d97706;--ok:#059669;
  box-sizing:border-box;color:var(--txt);background:var(--bg);min-height:100%;font-size:13px;line-height:1.55;padding:0 0 32px}
.wd *{box-sizing:border-box}
.wd .head{display:flex;align-items:center;gap:12px;padding:16px 20px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff}
.wd .head h1{font-size:17px;font-weight:700;margin:0}
.wd .head .sub{font-size:11px;opacity:.85}
.wd .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#ffffff2e;font-size:11px}
.wd .tabs{display:flex;gap:4px;padding:10px 16px 0;border-bottom:1px solid var(--line);background:#fff;flex-wrap:wrap}
.wd .tab{padding:8px 14px;border:0;background:transparent;color:var(--sub);cursor:pointer;border-bottom:2px solid transparent;font-size:13px}
.wd .tab.on{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}
.wd .wrap{padding:16px 20px;max-width:1180px;margin:0 auto}
.wd .grid{display:grid;gap:12px}
.wd .cols4{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.wd .cols2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
.wd .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px #0f172a08}
.wd .card h3{margin:0 0 10px;font-size:13px;font-weight:700;color:var(--txt)}
.wd .k{font-size:11px;color:var(--sub)}
.wd .v{font-size:18px;font-weight:700;color:var(--accent);margin-top:3px;word-break:break-all}
.wd .btn{border:1px solid var(--line);background:#fff;color:var(--txt);padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;transition:.15s}
.wd .btn:hover{border-color:var(--accent);color:var(--accent)}
.wd .btn:disabled{opacity:.5;cursor:not-allowed}
.wd .primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:0;font-weight:600}
.wd .danger{color:var(--danger);border-color:#fecaca}
.wd .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.wd .grow{flex:1;min-width:0}
.wd input,.wd select,.wd textarea{border:1px solid var(--line);border-radius:8px;padding:7px 9px;font-size:12px;background:#fff;color:var(--txt);font-family:inherit}
.wd input:focus,.wd select:focus,.wd textarea:focus{outline:2px solid #14b8a644;border-color:var(--accent)}
.wd textarea{width:100%;min-height:84px;resize:vertical}
.wd .tablewrap{overflow:auto;border:1px solid var(--line);border-radius:10px;background:#fff}
.wd table{width:100%;border-collapse:collapse;font-size:12px}
.wd th,.wd td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.wd th{background:#f8fafc;color:var(--sub);font-weight:600;position:sticky;top:0}
.wd tr:last-child td{border-bottom:0}
.wd .tag{padding:1px 7px;border-radius:6px;background:#eef2f7;color:var(--sub);font-size:11px}
.wd .ok{color:var(--ok)}.wd .warn{color:var(--warn)}.wd .err{color:var(--danger)}
.wd .note{background:#f8fafc;border-left:3px solid var(--accent2);padding:8px 10px;color:var(--sub);border-radius:4px;font-size:11px}
.wd .mask{position:fixed;inset:0;background:#0f172a55;display:flex;align-items:center;justify-content:center;z-index:50}
.wd .modal{background:#fff;border-radius:14px;padding:20px;width:min(640px,94vw);max-height:88vh;overflow:auto;box-shadow:0 20px 60px #0f172a33}
.wd .modal h3{margin:0 0 14px;font-size:15px}
.wd label{display:block;font-size:11px;color:var(--sub);margin:10px 0 4px}
.wd .login{max-width:380px;margin:60px auto}
.wd .spin{display:inline-block;width:12px;height:12px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:wdspin .8s linear infinite}
@keyframes wdspin{to{transform:rotate(360deg)}}
.wd pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:11px;color:var(--sub);margin:0}
`;
  document.head.appendChild(s);
}

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
  const [错误, set错误] = useState('');
  const [提示, set提示] = useState('');
  const [忙, set忙] = useState(false);
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

  const api = useCallback(async (路径, 方法 = 'GET', body = undefined) => {
    const headers = { 'Content-Type': 'application/json' };
    if (令牌) headers['X-Wenda-Token'] = 令牌;
    const res = await 请求(base + 路径, {
      method: 方法,
      headers,
      credentials: 'include',
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
    } catch (e) { set错误(e.message); }
  }, [api, 已登录, 页签, 范围]);

  useEffect(() => {
    let 活 = true;
    (async () => {
      try {
        const d = await api('/auth/status');
        if (!活) return;
        set默认密码(!!d.默认密码);
        set已登录(!!d.已登录);
        if (d.已登录) 刷新();
      } catch (e) { if (活) set错误(e.message); }
    })();
    return () => { 活 = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (已登录) 刷新(); }, [页签, 范围, 刷新]);

  async function 执行(fn, 成功提示 = '') {
    set忙(true); set错误(''); set提示('');
    try { await fn(); if (成功提示) set提示(成功提示); }
    catch (e) { set错误(e.message || String(e)); }
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

  async function 检查更新() {
    await 执行(async () => {
      const d = await api('/update/check', 'POST', {});
      set检查结果(d); set接受风险(false);
    }, '检查完成');
  }

  async function 安装更新() {
    await 执行(async () => {
      const d = await api('/update/install', 'POST', {
        version: 检查结果 && 检查结果.最新版本,
        acceptRisk: 接受风险,
      });
      set更新态(await api('/update/status'));
      setTimeout(() => api('/update/status').then(set更新态).catch(() => {}), 3000);
      set提示(`已更新到 v${d.新版本}，正在重载插件`);
    });
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
      await api('/qa/delete', 'POST', { scope: 编辑范围(q), type: q._type, question: q.question });
      set问答(await api(`/qa/list${范围 ? `?scope=${encodeURIComponent(范围)}` : ''}`));
    }, '已删除');
  }

  function 编辑范围(q) { return q._scope || 范围 || '全局'; }

  const 条目 = useMemo(() => {
    if (!问答 || !问答.数据) return [];
    const out = [];
    for (const sc of Object.keys(问答.数据)) {
      if (范围 && sc !== 范围) continue;
      const 桶 = 问答.数据[sc][类型] || [];
      for (const x of 桶) out.push({ ...x, _scope: sc, _type: 类型 });
    }
    const kw = 搜索.trim().toLowerCase();
    return kw ? out.filter(x => x.question.toLowerCase().includes(kw) || x.answer.toLowerCase().includes(kw)) : out;
  }, [问答, 范围, 类型, 搜索]);

  if (!已登录) {
    return h('div', { className: 'wd' },
      h('div', { className: 'head' }, h('h1', null, '问答系统 · 管理控制台')),
      h('div', { className: 'wrap' },
        h('div', { className: 'card login' },
          h('h3', null, '🔐 登录'),
          h('p', { className: 'k' }, '初始密码 12345678，登录后请立即修改。'),
          h('label', null, '控制台密码'),
          h('input', { type: 'password', value: 密码, placeholder: '请输入密码', style: { width: '100%' }, onChange: e => set密码(e.target.value), onKeyDown: e => { if (e.key === 'Enter') 登录(); } }),
          h('div', { style: { marginTop: 12 } }, h('button', { className: 'btn primary', disabled: 忙 || !密码, onClick: 登录 }, 忙 ? '登录中…' : '登录')),
          错误 ? h('p', { className: 'err' }, 错误) : null,
        )
      )
    );
  }

  const 签 = 检查结果 && 检查结果.签名;

  return h('div', { className: 'wd' },
    h('div', { className: 'head' },
      h('div', null,
        h('h1', null, '💬 问答系统 · 管理控制台'),
        h('div', { className: 'sub' }, `插件 ID：GF-plugin-wenda · 当前 v${(总览 && 总览.当前版本) || (更新态 && 更新态.当前版本) || '—'}`)
      ),
      h('span', { className: 'badge' }, '在线更新 · 官方签名验证')
    ),
    h('div', { className: 'tabs' },
      [['overview', '📊 概览'], ['qa', '📚 问答管理'], ['update', '🔄 在线更新'], ['security', '🔐 安全']].map(([k, n]) =>
        h('button', { key: k, className: `tab ${页签 === k ? 'on' : ''}`, onClick: () => set页签(k) }, n))
    ),
    h('div', { className: 'wrap' },
      错误 ? h('div', { className: 'card err', style: { marginBottom: 12 } }, 错误) : null,
      提示 ? h('div', { className: 'card ok', style: { marginBottom: 12 } }, String(提示)) : null,

      页签 === 'overview' ? h('div', { className: 'grid cols4' }, [
        ['当前版本', `v${(总览 && 总览.当前版本) || '—'}`],
        ['问答条数', (总览 && 总览.问答数) || 0],
        ['范围数量', (总览 && 总览.范围数) || 0],
        ['主人数量', (总览 && 总览.主人数量) || 0],
      ].map(([k, v]) => h('div', { className: 'card', key: k }, h('div', { className: 'k' }, k), h('div', { className: 'v' }, v)))
        .concat([
          h('div', { className: 'card', style: { gridColumn: '1/-1' }, key: 'info' },
            h('h3', null, '插件信息'),
            h('div', { className: 'row' },
              h('span', { className: 'k' }, '固定操作者：'), h('code', null, (总览 && 总览.固定操作者) || '—')),
            h('div', { className: 'row', style: { marginTop: 8 } },
              h('span', { className: 'k' }, '下载源：'), h('code', null, (总览 && 总览.下载源) || 'direct')),
            h('div', { className: 'note', style: { marginTop: 10 } },
              `仓库：${(总览 && 总览.仓库) || '3671656786/GF-plugin-wenda'}　发布页：${(总览 && 总览.发布页) || 'https://github.com/3671656786/GF-plugin-wenda/releases'}`),
          )
        ])) : null,

      页签 === 'qa' ? h('div', null,
        h('div', { className: 'card' },
          h('div', { className: 'row' },
            h('div', null, h('label', null, '范围'), h('select', { value: 范围, onChange: e => set范围(e.target.value) },
              h('option', { value: '' }, '全部范围'),
              ((问答 && 问答.范围) || ['全局', '私聊']).map(x => h('option', { key: x, value: x }, x))
            )),
            h('div', null, h('label', null, '类型'), h('select', { value: 类型, onChange: e => set类型(e.target.value) },
              类型选项.map(x => h('option', { key: x, value: x }, x))
            )),
            h('div', { className: 'grow' }, h('label', null, '搜索'), h('input', { value: 搜索, placeholder: '问题或答案关键词', style: { width: '100%' }, onChange: e => set搜索(e.target.value) })),
            h('button', { className: 'btn primary', style: { alignSelf: 'end' }, onClick: () => set编辑({ scope: 范围 || '全局', type: 类型, question: '', answer: '', delay: '', at: '' }) }, '＋ 新增问答'),
          )
        ),
        h('div', { className: 'tablewrap', style: { marginTop: 12 } },
          h('table', null,
            h('thead', null, h('tr', null,
              ['范围', '类型', '问题', '答案', '延迟', '艾特', '操作'].map(x => h('th', { key: x }, x)))),
            h('tbody', null,
              条目.length === 0 ? h('tr', null, h('td', { colSpan: 7, className: 'k' }, '暂无数据')) : 条目.map(x =>
                h('tr', { key: `${x._scope}|${x._type}|${x.question}` },
                  h('td', null, h('span', { className: 'tag' }, x._scope)),
                  h('td', null, x._type),
                  h('td', null, x.question),
                  h('td', null, h('pre', null, x.answer.length > 100 ? x.answer.slice(0, 100) + '…' : x.answer)),
                  h('td', null, x.delay || '—'),
                  h('td', null, x.at === undefined ? '默认' : (x.at ? '艾特' : '纯文本')),
                  h('td', null, h('div', { className: 'row' },
                    h('button', { className: 'btn', onClick: () => set编辑({ scope: x._scope, type: x._type, question: x.question, answer: x.answer, delay: x.delay, at: x.at === undefined ? '' : (x.at ? '1' : '0'), _old: x.question }) }, '编辑'),
                    h('button', { className: 'btn danger', onClick: () => 删除问答(x) }, '删除')
                  ))
                )
              )
            )
          )
        ),
        h('div', { className: 'note', style: { marginTop: 10 } },
          '答案格式与聊天指令一致：[img:文件名] 表示图片；编辑时填写正文即可，延迟与艾特单独设置。网页新增的问答会立即被机器人读取。')
      ) : null,

      页签 === 'update' ? h('div', { className: 'grid cols2' }, [
        h('div', { className: 'card' },
          h('h3', null, '版本检查'),
          h('div', { className: 'row' },
            h('span', { className: 'k' }, '当前版本'), h('code', null, `v${(更新态 && 更新态.当前版本) || '—'}`),
            h('span', { className: 'k' }, '最新版本'), h('code', null, 检查结果 ? `v${检查结果.最新版本}` : ((更新态 && 更新态.最新版本) || '—'))
          ),
          h('div', { className: 'row', style: { marginTop: 10 } },
            h('button', { className: 'btn primary', disabled: 忙, onClick: 检查更新 }, 忙 ? '检查中…' : '🔍 检查更新'),
            h('button', { className: 'btn', disabled: 忙 || !检查结果, onClick: 安装更新 }, '⬆️ 安装更新'),
          ),
          h('div', { className: 'note', style: { marginTop: 10 } },
            `状态：${(更新态 && 更新态.阶段) || '未开始'}　${(更新态 && 更新态.进行中) ? '（进行中）' : ''}　${(更新态 && 更新态.错误) || ''}`),
          检查结果 ? h('div', { style: { marginTop: 10 } },
            h('div', { className: 'row' },
              h('span', { className: 'k' }, 'Release：'),
              h('a', { href: 检查结果.页面, target: '_blank', rel: 'noreferrer' }, 检查结果.页面)),
            h('pre', { style: { marginTop: 8, maxHeight: 150, overflow: 'auto' } }, 检查结果.说明 || '（无更新说明）')
          ) : null
        ),
        h('div', { className: 'card' },
          h('h3', null, '🔒 官方签名'),
          签 ? h('div', null,
            h('div', { className:签.官方已验证 ? 'ok' : 'warn' }, 签.官方已验证 ? '✅ GitHub 已验证官方签名' : '⚠️ 官方签名未通过'),
            h('p', { className: 'k' }, 签.原因),
            h('div', { className: 'row' }, h('span', { className: 'k' }, '提交：'), h('code', null, String(签.提交 || '').slice(0, 12))),
            h('div', { className: 'row' }, h('span', { className: 'k' }, '作者：'), h('code', null, 签.作者登录 || 签.作者邮箱 || '未知'))
          ) : h('div', { className: 'k' }, '点「检查更新」后显示签名信息。'),
          签 && !签.官方已验证 ? h('div', { style: { marginTop: 10, border: '1px solid #fcd34d', background: '#fffbeb', padding: 10, borderRadius: 8 } },
            h('label', { className: 'row', style: { color: '#92400e' } },
              h('input', { type: 'checkbox', checked: 接受风险, onChange: e => set接受风险(e.target.checked) }),
              '我已了解风险，仍要继续安装（包可能不是官方发布）')
          ) : null
        ),
        h('div', { className: 'card' },
          h('h3', null, '🌐 下载源'),
          h('div', { className: 'row' },
            h('select', { value: (更新态 && 更新态.源) || 'direct', onChange: e => 执行(() => api('/update/source', 'POST', { source: e.target.value }).then(刷新), '下载源已保存') },
              源选项.map(x => h('option', { key: x.k, value: x.k }, `${x.n}（${x.k}）`))),
          ),
          h('p', { className: 'k', style: { marginTop: 8 } }, '首选源不通时会自动依次降级到其余下载源。')
        ),
        h('div', { className: 'card' },
          h('h3', null, '📦 更新记录'),
          更新态 && 更新态.最后结果 ? h('pre', null, JSON.stringify(更新态.最后结果, null, 2).slice(0, 3000)) : h('div', { className: 'k' }, '暂无更新记录。')
        ),
      ]) : null,

      页签 === 'security' ? h('div', { className: 'grid cols2' }, [
        h('div', { className: 'card' },
          h('h3', null, '修改控制台密码'),
          h('label', null, '原密码'), h('input', { type: 'password', value: 旧密码, style: { width: '100%' }, onChange: e => set旧密码(e.target.value) }),
          h('label', null, '新密码'), h('input', { type: 'password', value: 新密码, style: { width: '100%' }, onChange: e => set新密码(e.target.value) }),
          h('p', { className: 'k' }, '需 8–64 位，含大小写字母、数字与特殊符号。'),
          h('button', { className: 'btn primary', style: { marginTop: 6 }, disabled: 忙 || !旧密码 || !新密码, onClick: 改密码 }, '保存新密码')
        ),
        h('div', { className: 'card' },
          h('h3', null, '安全说明'),
          h('div', { className: 'note' },
            '密码只以 scrypt 哈希保存在插件数据目录；会话令牌 7 天有效；连续输错 5 次会锁定 24 小时。'),
          h('button', { className: 'btn', style: { marginTop: 10 }, onClick: () => 执行(() => api('/auth/logout', 'POST', {}).then(() => {
            try { localStorage.removeItem(令牌键); } catch { /* ignore */ }
            set令牌(''); set已登录(false);
          })) }, '退出登录')
        ),
      ]) : null
    ),

    编辑 ? h('div', { className: 'mask', onClick: () => set编辑(null) },
      h('div', { className: 'modal', onClick: e => e.stopPropagation() },
        h('h3', null, 编辑._old ? '编辑问答' : '新增问答'),
        h('label', null, '范围'),
        h('input', { value: 编辑.scope || '', placeholder: '全局 / 私聊 / 群号', onChange: e => set编辑({ ...编辑, scope: e.target.value }) }),
        h('label', null, '类型'),
        h('select', { value: 编辑.type, onChange: e => set编辑({ ...编辑, type: e.target.value }) }, 类型选项.map(x => h('option', { key: x, value: x }, x))),
        h('label', null, '问题'),
        h('input', { value: 编辑.question, style: { width: '100%' }, onChange: e => set编辑({ ...编辑, question: e.target.value }) }),
        h('label', null, '答案（支持 [img:文件名]）'),
        h('textarea', { value: 编辑.answer, onChange: e => set编辑({ ...编辑, answer: e.target.value }) }),
        h('div', { className: 'cols2 grid', style: { marginTop: 8 } },
          h('div', null, h('label', null, '延迟（秒 / 毫秒）'), h('input', { value: 编辑.delay || '', placeholder: '无则留空', onChange: e => set编辑({ ...编辑, delay: e.target.value }) })),
          h('div', null, h('label', null, '艾特模式'), h('select', { value: String(编辑.at ?? ''), onChange: e => set编辑({ ...编辑, at: e.target.value }) },
            h('option', { value: '' }, '默认'), h('option', { value: '1' }, '艾特'), h('option', { value: '0' }, '纯文本')))
        ),
        h('label', { className: 'row', style: { marginTop: 10 } },
          h('input', { type: 'checkbox', checked: 覆盖, onChange: e => set覆盖(e.target.checked) }), '覆盖已有问题'),
        h('div', { className: 'row', style: { marginTop: 14, justifyContent: 'flex-end' } },
          h('button', { className: 'btn', onClick: () => set编辑(null) }, '取消'),
          h('button', { className: 'btn primary', disabled: 忙, onClick: 保存问答 }, '保存'))
      )
    ) : null
  );
}
