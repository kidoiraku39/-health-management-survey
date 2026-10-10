// ===== 通信先 =====
// GASを再デプロイするとURLが変わります。Vercelの環境変数 VITE_GAS_WEB_APP_URL で上書きできます。
// （環境変数を使わない場合は、下のURLを新しいものに書き換えてください）
export const GAS_WEB_APP_URL =
  import.meta.env.VITE_GAS_WEB_APP_URL ||
  'https://script.google.com/macros/s/AKfycbyjArFJ9OwG1YMkhb6121oMmgf0FJJ8zqlJ2WbASNIrFmlHdY7k_HDN8urYKjZrhR5Iyw/exec';

/**
 * GASへPOSTしてJSONを受け取る。
 * Content-Type を text/plain にしているのは、ブラウザの事前確認(preflight)を避けるため（GASの定番の方法）。
 */
export async function gasPost(body) {
  const res = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('http_' + res.status);
  return res.json();
}

// ===== 同意画面の設定 =====
// 運営者情報は環境変数（Vercelの Environment Variables）で設定します。ソースを書き換える必要はありません。
//   VITE_OPERATOR_NAME      運営者名（例：○○）
//   VITE_OPERATOR_CONTACT   問い合わせ先（メールアドレスなど）
//   VITE_OPERATOR_RETENTION 保管期間（例：回答から12か月）
// 3つとも設定されるまで、従業員の画面には「準備中」と表示され、回答できません（誤公開の防止）。
// 運営者が異なる事業で使う場合は、事業ごとにVercelのプロジェクトとGASを分けて、それぞれ設定してください。
export const OPERATOR = {
  name: import.meta.env.VITE_OPERATOR_NAME || '【要設定】運営者名',
  contact: import.meta.env.VITE_OPERATOR_CONTACT || '【要設定】問い合わせ先',
  retention: import.meta.env.VITE_OPERATOR_RETENTION || '【要設定】保管期間',
};

export const isOperatorConfigured = !Object.values(OPERATOR).some((v) => v.includes('【要設定】'));

// 同意文面を変えたら、このバージョンも変えてください（回答ごとに記録されます）
export const CONSENT_VERSION = '2026-10-v1';

export const CONSENT_SECTIONS = [
  {
    title: '1. 目的',
    body: '職場における体調不良と仕事への影響を把握し、職場環境や健康づくりの改善策を検討するために実施します。個人の評価や人事上の判断には使用しません。',
  },
  {
    title: '2. 取得する情報',
    body: '部署、従業員ID（任意・空欄可）、体調や仕事への影響に関する回答、自由記述です。健康に関する情報を含みます。',
  },
  {
    title: '3. 情報を見る人と、勤務先への提供',
    body: () =>
      `回答データを閲覧できるのは、運営者（${OPERATOR.name}）のみです。勤務先には、個人が特定されない形の集計結果のみを提供し、個別の回答は提供しません。部署別の集計は、回答者が5名以上のグループに限って作成します。`,
  },
  {
    title: '4. 保管と削除',
    body: () =>
      `回答はGoogleのクラウド（Googleスプレッドシート）に保存し、アクセス権は運営者に限ります。保管期間は「${OPERATOR.retention}」とし、期間後に削除します。`,
  },
  {
    title: '5. 任意参加と、回答後の削除のご希望',
    body: () =>
      `回答は任意で、回答しなくても不利益はありません。送信前であれば、画面を閉じることで回答を破棄できます。送信後に削除を希望する場合は、従業員IDを添えて ${OPERATOR.contact} までご連絡ください。従業員IDを入力せずに回答した場合は、どの回答か特定できず、削除できないことがあります。`,
  },
  {
    title: '6. 自由記述についてのお願い',
    body: '氏名など個人が特定できる情報や、他の方の情報は書かないでください。',
  },
  {
    title: '7. このアンケートは医療相談ではありません',
    body: '強い症状やつらい気持ちがある場合は、かかりつけ医、産業医、または公的な相談窓口にご相談ください。',
  },
];
