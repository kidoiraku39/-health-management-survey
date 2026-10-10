/**
 * 健康経営サーベイ GAS バックエンド
 *
 * 公開エンドポイントは doGet / doPost の2つだけ。すべて doPost の action で分岐する。
 *   - company  : 企業コードの検証（公開）。会社名だけを返す
 *   - submit   : 回答の保存（公開）。企業コードと同意が必須
 *   - dashboard: 集計の取得（管理者のみ）。Script Properties の ADMIN_TOKEN が必要
 *
 * 初期設定は README.md の「GASの設定手順」を参照。
 * 秘密情報（ADMIN_TOKEN）はコードに書かず、Script Properties に保存する。
 */

// ===== 設定 =====
const SHEET_RESPONSES = '回答一覧';
const SHEET_COMPANIES = '企業マスタ';
const SHEET_DEBUG = 'デバッグ用';
const COMPANY_HEADERS = ['企業コード', '会社名', '有効(TRUE/FALSE)', '質問セット（空欄=標準）'];

// 集計を表示する最小の回答者数。これ未満のグループは個人が推測されうるため返さない。
const MIN_GROUP_SIZE = 5;

const RESPONSE_HEADERS = [
  'タイムスタンプ', '従業員ID', '部署', '損失率(%)', 'Q1', 'Q2', 'Q2-sub(副症状)',
  'Q3', 'Q4', 'Q5', 'Q6', 'Q6-1', 'Q7', 'Q8', '企業コード', '同意バージョン',
  '質問セット', 'カスタム回答'
];
const COL_DEPT = 2;      // 0始まりの列位置
const COL_LOSS = 3;
const COL_COMPANY = 14;

// 部署名は、企業ごとの質問セットで変えられる。長さだけ制限して、そのまま集計に使う
const MAX_DEPARTMENT_CHARS = 30;
const MAX_CUSTOM_ITEMS = 30;

const SYMPTOM_LABELS = {
  symp_allergy: 'アレルギーによる不調',
  symp_skin: '皮膚の病気・かゆみ',
  symp_infect: '感染症による不調',
  symp_stomach: '胃腸に関する不調',
  symp_joint: '関節の痛みや不自由さ',
  symp_back: '腰痛',
  symp_shoulder: '首の不調や肩のこり',
  symp_headache: '頭痛',
  symp_teeth: '歯の不調',
  symp_mental: '精神に関する不調',
  symp_sleep: '睡眠に関する不調',
  symp_fatigue: '全身の倦怠感・疲労感',
  symp_eye: '眼の不調',
  symp_women: '女性特有の不調',
  symp_other: 'その他の健康上の問題',
  symp_none: '特に健康上の問題はない'
};

const ENV_LABELS = {
  env_yes: 'はい（改善してほしい点がある）',
  env_no: 'いいえ（特に不満はない）'
};

const EXPERT_LABELS = {
  exp_body: '身体の痛み・姿勢改善',
  exp_lifestyle: '生活習慣病・数値改善',
  exp_nutrition: '食事・栄養指導',
  exp_mental: '心の健康・ストレスケア',
  exp_sleep: '睡眠・休息改善',
  exp_women: '女性の健康サポート',
  exp_smoking: '禁煙サポート',
  exp_none: '希望しない'
};

const MAX_PAYLOAD_CHARS = 50000;
const MAX_TEXT_CHARS = 1000;

// ===== エントリポイント =====

// GETは動作確認用。データは一切返さない。
function doGet() {
  return json_({ ok: true, service: 'health-management-survey' });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > MAX_PAYLOAD_CHARS) return json_({ ok: false, error: 'bad_request' });

    const params = JSON.parse(raw);
    switch (params.action) {
      case 'company':
        return json_(handleCompany_(params));
      case 'submit':
        return json_(handleSubmit_(params));
      case 'dashboard':
        return json_(handleDashboard_(params));
      default:
        return json_({ ok: false, error: 'bad_request' });
    }
  } catch (error) {
    logError_('doPost: ' + error);
    return json_({ ok: false, error: 'server_error' });
  }
}

// ===== action: company =====

function handleCompany_(params) {
  const company = findCompany_(params.company);
  if (!company) return { ok: false, error: 'invalid_company' };
  return { ok: true, name: company.name, questionSet: company.questionSet };
}

// ===== action: submit =====

function handleSubmit_(params) {
  const company = findCompany_(params.company);
  if (!company) return { ok: false, error: 'invalid_company' };
  if (params.consent !== true) return { ok: false, error: 'consent_required' };

  const answers = params.answers && typeof params.answers === 'object' ? params.answers : {};

  const q1 = clampInt_(answers.q1, 0, 10, 10);
  // Q3〜Q5 は、その企業の質問セットにない場合は空欄にする（聞いていないことを回答として書かない）
  const q3 = optInt_(answers.q3, 0, 90);
  const q4 = optInt_(answers.q4, 1, 10);
  const q5 = optInt_(answers.q5, 1, 10);
  // 損失率はクライアント送信値を信用せず、Q1から再計算する
  const lossPercentage = Math.round(((10 - q1) / 10) * 100);

  const department = sanitizeCell_(String(params.department || '').trim().slice(0, MAX_DEPARTMENT_CHARS)) || '未設定';
  const employeeId = sanitizeCell_(String(params.employeeId || '匿名希望').trim().slice(0, 50)) || '匿名希望';

  const q2Id = answers.q2 && answers.q2.id;
  const q6Id = answers.q6 && answers.q6.id;

  const sheet = getResponseSheet_();
  sheet.appendRow([
    new Date(),
    employeeId,
    department,
    lossPercentage,
    q1,
    q2Id ? (SYMPTOM_LABELS[q2Id] || 'なし') : '',
    mapIds_(answers.q2_sub, SYMPTOM_LABELS),
    q3,
    q4,
    q5,
    q6Id ? (ENV_LABELS[q6Id] || 'なし') : '',
    sanitizeCell_(answers.q6_1),
    mapIds_(answers.q7, EXPERT_LABELS),
    sanitizeCell_(answers.q8),
    company.code,
    sanitizeCell_(String(params.consentVersion || '').slice(0, 30)),
    company.questionSet,
    formatCustomAnswers_(params.extra)
  ]);
  return { ok: true };
}

// ===== action: dashboard（管理者のみ）=====

function handleDashboard_(params) {
  if (!verifyAdmin_(params.token)) return { ok: false, error: 'unauthorized' };

  const rows = readResponseRows_();
  const companies = listCompanies_();

  // 企業ごとの回答数（管理者の選択肢用）
  const countByCode = {};
  rows.forEach(function (r) {
    const code = String(r[COL_COMPANY] || '');
    countByCode[code] = (countByCode[code] || 0) + 1;
  });
  const options = companies.map(function (c) {
    return { code: c.code, name: c.name, count: countByCode[c.code] || 0 };
  });
  if (countByCode['']) options.push({ code: '__legacy__', name: '（企業コードなしの旧データ）', count: countByCode[''] });

  // 対象の絞り込み
  const selected = String(params.company || '');
  let target;
  if (selected === '__all__') {
    target = rows;
  } else if (selected === '__legacy__') {
    target = rows.filter(function (r) { return !r[COL_COMPANY]; });
  } else {
    target = rows.filter(function (r) { return String(r[COL_COMPANY]) === selected; });
  }

  return { ok: true, companies: options, stats: buildStats_(target) };
}

/**
 * 集計を作る。MIN_GROUP_SIZE 未満のグループは平均値を返さない。
 * 部署別は、5名未満の部署を隣り合う小さい部署と合算していき、全グループが5名以上になった場合のみ返す。
 */
function buildStats_(rows) {
  const valid = rows.filter(function (r) { return !isNaN(parseFloat(r[COL_LOSS])); });
  const n = valid.length;

  if (n < MIN_GROUP_SIZE) {
    return { suppressed: true, totalRespondents: n, minGroupSize: MIN_GROUP_SIZE };
  }

  const sum = valid.reduce(function (acc, r) { return acc + parseFloat(r[COL_LOSS]); }, 0);
  const avg = sum / n;

  // 平均年収600万円・社保等15%加味の概算（画面にも前提を表示している）
  const totalAnnualLoss = Math.floor(n * 6000000 * 1.15 * (avg / 100));

  // 部署別
  const byDept = {};
  valid.forEach(function (r) {
    const d = String(r[COL_DEPT] || '').trim() || '未設定';
    if (!byDept[d]) byDept[d] = { labels: [d], count: 0, sum: 0 };
    byDept[d].count++;
    byDept[d].sum += parseFloat(r[COL_LOSS]);
  });
  const groups = Object.keys(byDept).map(function (k) { return byDept[k]; });
  const merged = mergeSmallGroups_(groups, MIN_GROUP_SIZE);

  return {
    suppressed: false,
    totalRespondents: n,
    averageLossPercentage: Math.round(avg),
    totalAnnualLoss: totalAnnualLoss,
    minGroupSize: MIN_GROUP_SIZE,
    departmentStats: merged
      ? merged.map(function (g) {
          return {
            label: g.labels.join('・'),
            merged: g.labels.length > 1,
            count: g.count,
            averageLossPercentage: Math.round(g.sum / g.count)
          };
        })
      : null // 5名以上のグループを作れない場合は部署別を出さない
  };
}

/**
 * 最小のグループを次に小さいグループへ合算する操作を、全グループが minSize 以上になるまで繰り返す。
 * 最後の1グループになっても minSize 未満なら null を返す。
 */
function mergeSmallGroups_(groups, minSize) {
  const list = groups.map(function (g) {
    return { labels: g.labels.slice(), count: g.count, sum: g.sum };
  });
  list.sort(function (a, b) { return a.count - b.count; });

  while (list.length > 0 && list[0].count < minSize) {
    if (list.length === 1) return null;
    const small = list.shift();
    const next = list[0];
    next.labels = next.labels.concat(small.labels);
    next.count += small.count;
    next.sum += small.sum;
    list.sort(function (a, b) { return a.count - b.count; });
  }
  // 全部署が1グループに合算された場合は、全体平均と同じ情報なので部署別としては出さない
  if (list.length === 1 && list[0].labels.length > 1) return null;
  return list.sort(function (a, b) { return b.count - a.count; });
}

// ===== 認証 =====

function verifyAdmin_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  // 未設定・短すぎる場合は常に拒否（設定ミスで素通りさせない）
  if (!expected || expected.length < 16) return false;

  const given = String(token || '');
  const ok = constantTimeEquals_(given, expected);
  if (!ok) Utilities.sleep(1000); // 総当たりを遅くする
  return ok;
}

function constantTimeEquals_(a, b) {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// ===== 企業マスタ =====

function listCompanies_() {
  const sheet = getCompanySheet_();
  const last = sheet.getLastRow();
  if (last <= 1) return [];
  return sheet.getRange(2, 1, last - 1, 4).getValues()
    .map(function (r) {
      return {
        code: String(r[0]).trim(),
        name: String(r[1]).trim(),
        enabled: r[2] !== false && String(r[2]).toUpperCase() !== 'FALSE',
        // 質問セット（コード側 src/questionSets.js のキー）。空欄は標準
        questionSet: String(r[3] || '').trim().slice(0, 30) || 'standard'
      };
    })
    .filter(function (c) { return c.code && c.enabled; });
}

function findCompany_(code) {
  const given = String(code || '').trim();
  if (!given || given.length > 64) return null;
  const list = listCompanies_();
  for (let i = 0; i < list.length; i++) {
    if (list[i].code === given) return list[i];
  }
  return null;
}

// ===== シート操作 =====

function getResponseSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('スプレッドシートが見つかりません');
  let sheet = ss.getSheetByName(SHEET_RESPONSES);
  if (!sheet) sheet = ss.insertSheet(SHEET_RESPONSES);
  // 既存シート（14列）にも新しい列見出しを補う
  const current = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).getValues()[0] : [];
  if (current.join('|') !== RESPONSE_HEADERS.join('|')) {
    sheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]).setFontWeight('bold');
  }
  return sheet;
}

function readResponseRows_() {
  const sheet = getResponseSheet_();
  const last = sheet.getLastRow();
  if (last <= 1) return [];
  return sheet.getRange(2, 1, last - 1, RESPONSE_HEADERS.length).getValues();
}

function getCompanySheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('スプレッドシートが見つかりません');
  let sheet = ss.getSheetByName(SHEET_COMPANIES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMPANIES);
    sheet.getRange(1, 1, 1, 4).setValues([COMPANY_HEADERS]).setFontWeight('bold');
  } else if (!sheet.getRange(1, 4).getValue()) {
    // 既存の企業マスタ（3列）にも、質問セット列の見出しを補う
    sheet.getRange(1, 4).setValue(COMPANY_HEADERS[3]).setFontWeight('bold');
  }
  return sheet;
}

// ===== 入力の整形・検証 =====

// 数値の質問。回答がない（質問セットにない）ときは空欄にする
function optInt_(value, min, max) {
  if (value === undefined || value === null || value === '') return '';
  return clampInt_(value, min, max, '');
}

// 追加質問の回答 [{q, a}] を、件数・長さを制限して JSON の文字列にする
function formatCustomAnswers_(extra) {
  if (!Array.isArray(extra)) return '';
  const items = extra.slice(0, MAX_CUSTOM_ITEMS).map(function (e) {
    return { q: String((e && e.q) || '').slice(0, 100), a: String((e && e.a) || '').slice(0, MAX_TEXT_CHARS) };
  }).filter(function (e) { return e.q && e.a; });
  // JSON は [ で始まるため、数式として解釈されない（途中で切ると壊れるので、長さは件数と1件の長さで制限済み）
  return items.length ? JSON.stringify(items) : '';
}

function clampInt_(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// 許可されたIDだけをラベルに変換する（未知のIDは捨てる）
function mapIds_(ids, labelMap) {
  if (!Array.isArray(ids)) return '';
  return ids
    .filter(function (id) { return Object.prototype.hasOwnProperty.call(labelMap, id); })
    .map(function (id) { return labelMap[id]; })
    .join(', ');
}

// 文字列セル用：長さ制限と、数式として解釈されないための無害化
function sanitizeCell_(value) {
  if (value === undefined || value === null) return '';
  let s = String(value).slice(0, MAX_TEXT_CHARS);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

// ===== 共通 =====

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function logError_(message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    let sheet = ss.getSheetByName(SHEET_DEBUG);
    if (!sheet) sheet = ss.insertSheet(SHEET_DEBUG);
    sheet.appendRow([new Date(), message]);
  } catch (ignore) {
    // ログ出力の失敗で本処理を止めない
  }
}

// ===== 初期設定用（GASエディタから手動で実行する）=====

/** 「企業マスタ」シートと、回答一覧の見出しを作る */
function initialSetup() {
  getCompanySheet_();
  getResponseSheet_();
}

/** 推測されにくい企業コードを1つ作ってログに出す。企業マスタのA列に貼り付けて使う */
function generateCompanyCode() {
  const code = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  Logger.log(code);
  return code;
}

/** 管理者パスワード（ADMIN_TOKEN）の候補を作ってログに出す。Script Properties に貼り付けて使う */
function generateAdminToken() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  Logger.log(token);
  return token;
}
