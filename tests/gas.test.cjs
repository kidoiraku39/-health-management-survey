const vm = require('vm');
const fs = require('fs');
const assert = require('assert');

function makeEnv(adminToken) {
  const sheets = {};
  const mkSheet = (name) => {
    const rows = [];
    const sh = {
      name, rows,
      getLastRow: () => rows.length,
      getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
      appendRow: (r) => { rows.push(r.slice()); },
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValue: () => { const row = rows[r - 1] || []; return row[c - 1] === undefined ? '' : row[c - 1]; },
        setValue: (v) => { rows[r - 1] = rows[r - 1] || []; rows[r - 1][c - 1] = v; return { setFontWeight: () => {} }; },
        getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
        setValues: (v) => { v.forEach((vr, i) => { rows[r - 1 + i] = rows[r - 1 + i] || []; vr.forEach((x, j) => { rows[r - 1 + i][c - 1 + j] = x; }); }); return { setFontWeight: () => {} }; },
      }),
    };
    return sh;
  };
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = mkSheet(n)),
  };
  let slept = 0;
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => t }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'ADMIN_TOKEN' ? adminToken : null) }) },
    Utilities: { sleep: () => { slept++; }, getUuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () => ((Math.random() * 16) | 0).toString(16)) },
    Logger: { log: () => {} },
    JSON, Object, Array, Math, String, Date, parseInt, parseFloat, isNaN,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('' + require('path').join(__dirname, '..', 'src', 'Code.gs') + '', 'utf8'), ctx);
  const call = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }));
  return { ctx, ss, sheets, call, getSlept: () => slept };
}

const TOKEN = 'a'.repeat(32);
const results = [];
function t(name, fn) { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + e.message]); } }

const goodAnswers = (o = {}) => Object.assign({
  q1: 7, q2: { id: 'symp_back', label: 'x' }, q2_sub: ['symp_eye', 'evil_id'], q3: 10, q4: 8, q5: 9,
  q6: { id: 'env_yes' }, q6_1: '椅子が合わない', q7: ['exp_body', 'bogus'], q8: '特になし',
}, o);
const submit = (env, o = {}) => env.call(Object.assign({
  action: 'submit', company: 'abc123', consent: true, consentVersion: 'v1',
  employeeId: 'EMP-1', department: '営業・企画', answers: goodAnswers(),
}, o));

function seeded() {
  const env = makeEnv(TOKEN);
  env.ctx.initialSetup();
  env.sheets['企業マスタ'].appendRow(['abc123', 'A社', true]);
  env.sheets['企業マスタ'].appendRow(['off999', '停止中社', false]);
  env.sheets['企業マスタ'].appendRow(['bcd456', 'B社', 'TRUE']);
  return env;
}

t('doGetはデータを返さない', () => {
  const env = seeded();
  const out = JSON.parse(env.ctx.doGet());
  assert.deepStrictEqual(Object.keys(out).sort(), ['ok', 'service']);
});
t('company: 有効コードは会社名を返す', () => { assert.deepStrictEqual(seeded().call({ action: 'company', company: 'abc123' }), { ok: true, name: 'A社', questionSet: 'standard' }); });
t('company: 未知・空・無効(FALSE)は拒否', () => {
  const env = seeded();
  assert.strictEqual(env.call({ action: 'company', company: 'zzz' }).ok, false);
  assert.strictEqual(env.call({ action: 'company', company: '' }).ok, false);
  assert.strictEqual(env.call({ action: 'company', company: 'off999' }).ok, false);
});
t('submit: 同意なしは拒否・保存されない', () => {
  const env = seeded();
  assert.strictEqual(submit(env, { consent: false }).error, 'consent_required');
  assert.strictEqual(submit(env, { consent: 'true' }).error, 'consent_required');
  assert.strictEqual(env.sheets['回答一覧'].rows.length, 1);
});
t('submit: 無効な企業コードは拒否', () => { const env = seeded(); assert.strictEqual(submit(env, { company: 'nope' }).error, 'invalid_company'); });
t('submit: 正常保存（18列・企業コード・同意バージョン・質問セット・サーバ側損失率）', () => {
  const env = seeded();
  assert.strictEqual(submit(env, { lossPercentage: 99 }).ok, true);
  const row = env.sheets['回答一覧'].rows[1];
  assert.strictEqual(row.length, 18);
  assert.strictEqual(row[3], 30); // Q1=7 → 30%、クライアント送信の99は無視
  assert.strictEqual(row[14], 'abc123');
  assert.strictEqual(row[15], 'v1');
  assert.strictEqual(row[16], 'standard');
  assert.strictEqual(row[17], '');
  assert.strictEqual(row[5], '腰痛');
  assert.strictEqual(row[6], '眼の不調'); // 不正IDは捨てる
  assert.strictEqual(row[12], '身体の痛み・姿勢改善');
});
t('submit: 範囲外・不正な数値はクランプ/既定値', () => {
  const env = seeded();
  submit(env, { answers: goodAnswers({ q1: 99, q3: -5, q4: 'abc', q5: 0 }) });
  const r = env.sheets['回答一覧'].rows[1];
  assert.deepStrictEqual([r[4], r[7], r[8], r[9], r[3]], [10, 0, '', 1, 0]); // 数値でない q4 は空欄
});
t('submit: 数式として解釈される文字列を無害化', () => {
  const env = seeded();
  submit(env, { employeeId: '=1+1', answers: goodAnswers({ q6_1: '=HYPERLINK("http://evil","x")', q8: '+cmd|calc' }) });
  const r = env.sheets['回答一覧'].rows[1];
  assert.ok(r[1].startsWith("'="));
  assert.ok(r[11].startsWith("'="));
  assert.ok(r[13].startsWith("'+"));
});
t('submit: 長文は1000字に切り詰め', () => {
  const env = seeded();
  submit(env, { answers: goodAnswers({ q8: 'あ'.repeat(5000) }) });
  assert.strictEqual(env.sheets['回答一覧'].rows[1][13].length, 1000);
});
t('submit: 部署は企業ごとの名称をそのまま保存（30字まで・空は未設定・数式は無害化）', () => {
  const env = seeded();
  submit(env, { department: '製造部' });
  submit(env, { department: '' });
  submit(env, { department: 'あ'.repeat(100) });
  submit(env, { department: '=1+1' });
  const rows = env.sheets['回答一覧'].rows;
  assert.strictEqual(rows[1][2], '製造部');
  assert.strictEqual(rows[2][2], '未設定');
  assert.strictEqual(rows[3][2].length, 30);
  assert.ok(rows[4][2].startsWith("'="));
});
t('submit: 巨大ペイロードは拒否', () => { const env = seeded(); assert.strictEqual(submit(env, { junk: 'x'.repeat(60000) }).error, 'bad_request'); });
t('dashboard: トークン無し/誤りは拒否（誤りは遅延あり）', () => {
  const env = seeded();
  assert.strictEqual(env.call({ action: 'dashboard' }).error, 'unauthorized');
  assert.strictEqual(env.call({ action: 'dashboard', token: 'wrong' }).error, 'unauthorized');
  assert.ok(env.getSlept() >= 2);
});
t('dashboard: ADMIN_TOKEN未設定・短い場合は常に拒否', () => {
  for (const tok of [undefined, '', 'short']) {
    const env = makeEnv(tok); env.ctx.initialSetup();
    assert.strictEqual(env.call({ action: 'dashboard', token: tok || '' }).error, 'unauthorized');
    if (tok) assert.strictEqual(env.call({ action: 'dashboard', token: tok }).error, 'unauthorized');
  }
});
t('dashboard: 未知のactionは拒否', () => { assert.strictEqual(seeded().call({ action: 'dump' }).error, 'bad_request'); });

function fill(env, company, dept, n, q1 = 7) {
  for (let i = 0; i < n; i++) submit(env, { company, department: dept, answers: goodAnswers({ q1 }) });
}
const dash = (env, company) => env.call({ action: 'dashboard', token: TOKEN, company });

t('集計: 5名未満は平均を返さない', () => {
  const env = seeded(); fill(env, 'abc123', '営業・企画', 4);
  const s = dash(env, 'abc123').stats;
  assert.strictEqual(s.suppressed, true);
  assert.strictEqual(s.averageLossPercentage, undefined);
  assert.strictEqual(s.departmentStats, undefined);
});
t('集計: 5名ちょうどで表示、1部署のみ', () => {
  const env = seeded(); fill(env, 'abc123', '営業・企画', 5);
  const s = dash(env, 'abc123').stats;
  assert.strictEqual(s.suppressed, false);
  assert.strictEqual(s.averageLossPercentage, 30);
  assert.strictEqual(s.departmentStats.length, 1);
  assert.strictEqual(s.departmentStats[0].merged, false);
});
t('集計: 少数部署は合算（8/5/2 → 「その他・総務」を合算）', () => {
  const env = seeded();
  fill(env, 'abc123', '営業・企画', 8); fill(env, 'abc123', '開発・技術', 5); fill(env, 'abc123', 'その他', 2);
  const d = dash(env, 'abc123').stats.departmentStats;
  assert.ok(d.every((g) => g.count >= 5));
  assert.strictEqual(d.reduce((a, g) => a + g.count, 0), 15);
  assert.ok(d.some((g) => g.merged && g.label.includes('その他')));
});
t('集計: 5名以上のグループを作れなければ部署別は出さない（6/3/1）', () => {
  const env = seeded();
  fill(env, 'abc123', '営業・企画', 6); fill(env, 'abc123', '開発・技術', 3); fill(env, 'abc123', 'その他', 1);
  const s = dash(env, 'abc123').stats;
  assert.strictEqual(s.suppressed, false);
  assert.strictEqual(s.departmentStats, null);
});
t('集計: どの部署も小さければ部署別なし（3/3/3）', () => {
  const env = seeded();
  fill(env, 'abc123', '営業・企画', 3); fill(env, 'abc123', '開発・技術', 3); fill(env, 'abc123', 'その他', 3);
  assert.strictEqual(dash(env, 'abc123').stats.departmentStats, null);
});
t('集計: 企業ごとに分離される（A社5名・B社3名）', () => {
  const env = seeded(); fill(env, 'abc123', '営業・企画', 5, 10); fill(env, 'bcd456', '営業・企画', 3, 0);
  assert.strictEqual(dash(env, 'abc123').stats.totalRespondents, 5);
  assert.strictEqual(dash(env, 'abc123').stats.averageLossPercentage, 0);
  assert.strictEqual(dash(env, 'bcd456').stats.suppressed, true);
  const all = dash(env, '__all__').stats;
  assert.strictEqual(all.totalRespondents, 8);
  const opts = dash(env, '__all__').companies;
  assert.deepStrictEqual(opts.map((o) => [o.code, o.count]), [['abc123', 5], ['off999', 0], ['bcd456', 3]].filter((x) => x[0] !== 'off999'));
});
t('集計: 企業コードなしの旧データは別枠', () => {
  const env = seeded();
  const rows = env.sheets['回答一覧'].rows;
  for (let i = 0; i < 5; i++) rows.push(['2026-01-01', 'OLD', '営業・企画', 20, 8, '', '', 0, 10, 10, '', '', '', '']); // 14列の旧形式
  const r = dash(env, '__legacy__');
  assert.strictEqual(r.stats.totalRespondents, 5);
  assert.ok(r.companies.some((c) => c.code === '__legacy__'));
  assert.strictEqual(dash(env, 'abc123').stats.totalRespondents, 0);
});
t('集計: 存在しない企業コードの指定は0件扱い', () => { assert.strictEqual(dash(seeded(), 'zzz').stats.totalRespondents, 0); });
t('集計: 損失額 = n×600万×1.15×平均', () => {
  const env = seeded(); fill(env, 'abc123', '営業・企画', 5); // 30%
  assert.strictEqual(dash(env, 'abc123').stats.totalAnnualLoss, Math.floor(5 * 6000000 * 1.15 * 0.30));
});
t('既存14列の回答一覧シートに見出しが補われる', () => {
  const env = makeEnv(TOKEN);
  const sh = env.ss.insertSheet('回答一覧');
  sh.rows.push(['タイムスタンプ', '従業員ID', '部署', '損失率(%)', 'Q1', 'Q2', 'Q2-sub(副症状)', 'Q3', 'Q4', 'Q5', 'Q6', 'Q6-1', 'Q7', 'Q8']);
  env.ctx.initialSetup();
  assert.strictEqual(sh.rows[0].length, 18);
  assert.strictEqual(sh.rows[0][14], '企業コード');
  assert.strictEqual(sh.rows[0][16], '質問セット');
});

// ===== 企業ごとの質問セット =====
t('企業マスタ: 質問セット列があれば返す。空欄は standard', () => {
  const env = seeded();
  env.sheets['企業マスタ'].appendRow(['qs111', 'C社', true, 'short']);
  env.sheets['企業マスタ'].appendRow(['qs222', 'D社', true, '']);
  assert.strictEqual(env.call({ action: 'company', company: 'qs111' }).questionSet, 'short');
  assert.strictEqual(env.call({ action: 'company', company: 'qs222' }).questionSet, 'standard');
});
t('企業マスタ: 既存の3列のシートにも、質問セット列の見出しが補われる', () => {
  const env = makeEnv(TOKEN);
  const sh = env.ss.insertSheet('企業マスタ');
  sh.rows.push(['企業コード', '会社名', '有効(TRUE/FALSE)']);
  sh.rows.push(['abc123', 'A社', true]);
  env.call({ action: 'company', company: 'abc123' });
  assert.strictEqual(sh.rows[0][3], '質問セット（空欄=標準）');
});
t('submit: 質問セットは企業マスタの値を保存する（クライアントの申告は信用しない）', () => {
  const env = seeded();
  env.sheets['企業マスタ'].appendRow(['qs111', 'C社', true, 'short']);
  submit(env, { company: 'qs111', questionSet: 'evil' });
  assert.strictEqual(env.sheets['回答一覧'].rows[1][16], 'short');
});
t('submit: 追加質問の回答（extra）を、JSONで「カスタム回答」列に保存', () => {
  const env = seeded();
  submit(env, { extra: [{ q: '通勤について', a: '30分以上' }, { q: '', a: 'x' }, { q: 'y', a: '' }] });
  const cell = env.sheets['回答一覧'].rows[1][17];
  assert.deepStrictEqual(JSON.parse(cell), [{ q: '通勤について', a: '30分以上' }]);
});
t('submit: extra は件数・長さを制限し、配列以外は無視', () => {
  const env = seeded();
  const many = Array.from({ length: 35 }, (_, i) => ({ q: 'q' + i + 'あ'.repeat(150), a: 'い'.repeat(1100) })); // 全体で5万字以内
  submit(env, { extra: many });
  submit(env, { extra: 'abc' });
  submit(env, { extra: { q: 'a', a: 'b' } });
  const rows = env.sheets['回答一覧'].rows;
  const items = JSON.parse(rows[1][17]);
  assert.strictEqual(items.length, 30);
  assert.ok(items.every((e) => e.q.length <= 100 && e.a.length <= 1000));
  assert.strictEqual(rows[2][17], '');
  assert.strictEqual(rows[3][17], '');
});
t('submit: extra の数式風の文字列は、JSONの中に入るため数式にならない', () => {
  const env = seeded();
  submit(env, { extra: [{ q: '=1+1', a: '=HYPERLINK("x")' }] });
  assert.ok(env.sheets['回答一覧'].rows[1][17].startsWith('['));
});
t('submit: 質問セットにない質問（Q3〜Q8・Q2・Q6）は空欄のまま。Q1の損失率は計算される', () => {
  const env = seeded();
  submit(env, { answers: { q1: 4 } });
  const r = env.sheets['回答一覧'].rows[1];
  assert.strictEqual(r[3], 60);
  assert.deepStrictEqual([r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13]], ['', '', '', '', '', '', '', '', '']);
});
t('集計: 企業ごとの部署名で集計し、5名未満は合算', () => {
  const env = seeded();
  fill(env, 'abc123', '製造部', 6); fill(env, 'abc123', '事務部', 3); fill(env, 'abc123', '倉庫', 2);
  const d = dash(env, 'abc123').stats.departmentStats;
  assert.ok(d.every((g) => g.count >= 5));
  assert.ok(d.some((g) => g.merged && g.label.includes('倉庫') && g.label.includes('事務部')));
});

results.forEach(([s, n]) => console.log(s, n));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
