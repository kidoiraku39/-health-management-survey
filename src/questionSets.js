// 質問セット（企業ごとに質問を変えるための定義）
//
// ・BASE_QUESTIONS … 標準の質問すべて。ここを直すと、標準の質問セットを使うすべての企業に反映される。
// ・QUESTION_SETS   … 質問セットの一覧。企業マスタの「質問セット」列に、ここのキー（例：standard）を書くと、その企業に適用される。
//                     列が空の企業は 'standard' になる。
//
// 質問セットの書き方（questions の配列。上から順に表示される）
//   'q7'                       標準の質問をそのまま使う
//   { base: 'q7', title: … }   標準の質問の文言だけを変える（変えられるのは title / subtitle / description / placeholder / buttonLabel）
//   { base: 'q_dept', options: [{ id, label }, …] }   部署の選択肢を、その企業用に変える
//   { id: 'x_xxx', type: 'choice', … }   その企業だけの追加質問（id は x_ で始める）。回答はスプレッドシートの「カスタム回答」列に保存される
//
// 守るべき決まり（validateQuestionSets() で検査する。tests/ でも検査する）
//   ・最初は 'intro'、損失率の質問 'q1' は必ず入れる（損失率は q1 だけから計算するため。q1 の文言は変えられない）
//   ・q2 / q2_sub / q6 / q7 の選択肢は変えられない（スプレッドシートの専用の列に保存するため。
//     別の選択肢で聞きたいときは、追加質問 x_… として作る）
//   ・追加質問は、集計画面には出ない（スプレッドシートの「カスタム回答」列で確認する）

// 症状が「なし」の人には、症状の詳しい質問（副症状・頻度・量・質）を出さない
function hasSymptom(answers) {
  return answers['q2']?.id !== 'symp_none';
}
// 作業環境に改善点がある人にだけ、具体的な要望を聞く
function hasEnvIssue(answers) {
  return answers['q6']?.id === 'env_yes';
}

export const BASE_QUESTIONS = [
  {
    id: 'intro',
    type: 'info',
    title: '従業員健康・いきいき職場づくりアンケート',
    subtitle: 'より快適な職場づくりのための健康調査にご協力ください',
    description: `皆様が日々の業務を心身ともに健やかな状態で、いきいきと進められる環境を整えるため、健康調査を実施いたします。本アンケートは、出勤していても体調不良により本領発揮が難しい状態（プレゼンティーズム）を把握し、具体的な改善策（設備投資や専門家によるサポート）を検討するためのものです。【プライバシー】回答データは集計の際、個人が直接特定されないように統計的に処理され、個別の相談内容が上司や人事評価に直接伝わることはありません。`,
    buttonLabel: 'アンケートを開始する'
  },
  {
    id: 'q_id',
    type: 'text',
    title: '基本情報（従業員IDの入力）',
    subtitle: 'あなたに割り当てられた従業員ID（英数字）を入力してください',
    description: '※定期的なアンケートによる体調変化を組織統計として追跡するために使用します。個人名などの個人情報とは紐付きません。スキップ（空欄）のまま「次へ進む」を押すことも可能です。',
    placeholder: '例：EMP-001（空欄スキップ可）'
  },
  {
    id: 'q_dept',
    type: 'choice',
    title: '基本情報（部署の選択）',
    subtitle: '所属部署を選択してください',
    options: [
      { id: 'dept_sales', label: '営業・企画' },
      { id: 'dept_eng', label: '開発・技術' },
      { id: 'dept_admin', label: '総務・人事・経理' },
      { id: 'dept_other', label: 'その他' },
    ]
  },
  {
    id: 'q1',
    type: 'scale',
    title: 'カテゴリ1：現在のパフォーマンス（SPQベース）',
    subtitle: '心身の健康に全く問題がない時の仕事を10点とした場合、過去4週間のご自身の仕事の出来は実際には何点でしたか？',
    description: '0点：全く仕事にならなかった 〜 10点：最高の出来だった',
    min: 0,
    max: 10,
    step: 1,
    unit: '点',
    defaultValue: 10
  },
  {
    id: 'q2',
    type: 'choice',
    title: 'カテゴリ2：健康問題の詳細（QQメソッド）',
    subtitle: 'Q2. <strong style="color: #e63946; font-size: 1.1em; text-decoration: underline;">主症状</strong>の特定：現在、仕事に一番影響をもたらしている健康問題（主症状）を<strong style="color: #e63946; font-size: 1.1em; text-decoration: underline;">1つだけ</strong>選択してください。',
    options: [
      { id: 'symp_allergy', label: 'アレルギーによる不調（花粉症・鼻炎・結膜炎など）' },
      { id: 'symp_skin', label: '皮膚の病気・かゆみ（湿疹、アトピーなど）' },
      { id: 'symp_infect', label: '感染症による不調（風邪、インフルエンザ、胃腸炎など）' },
      { id: 'symp_stomach', label: '胃腸に関する不調（繰り返す下痢、便秘、胃の不快感など）' },
      { id: 'symp_joint', label: '関節の痛みや不自由さ（肩こり・腰痛以外の関節痛など）' },
      { id: 'symp_back', label: '腰痛' },
      { id: 'symp_shoulder', label: '首の不調や肩のこり' },
      { id: 'symp_headache', label: '頭痛（偏頭痛、緊張性頭痛など）' },
      { id: 'symp_teeth', label: '歯の不調（歯痛など）' },
      { id: 'symp_mental', label: '精神に関する不調（強いストレス、気分の落ち込みなど）' },
      { id: 'symp_sleep', label: '睡眠に関する不調（不眠、中途覚醒など）' },
      { id: 'symp_fatigue', label: '全身の倦怠感、疲労感（慢性的なだるさなど）' },
      { id: 'symp_eye', label: '眼の不調（眼精疲労、ドライアイなど）' },
      { id: 'symp_women', label: '女性特有の不調（生理痛、PMSなど）' },
      { id: 'symp_other', label: 'その他の健康上の問題' },
      { id: 'symp_none', label: '特に健康上の問題はない' }
    ]
  },
  {
    id: 'q2_sub',
    showIf: hasSymptom,
    hiddenValue: [],
    type: 'multi',
    title: 'カテゴリ2：その他の気になる症状',
    subtitle: 'Q2-sub. 副症状の特定：<strong style="color: #e63946; font-size: 1.1em; text-decoration: underline;">主症状以外</strong>で、現在仕事や生活に影響している不調があれば<strong style="color: #e63946; font-size: 1.1em; text-decoration: underline;">すべて</strong>選択してください。（複数選択可能）',
    options: [
      { id: 'symp_allergy', label: 'アレルギーによる不調（花粉症・鼻炎・結膜炎など）' },
      { id: 'symp_skin', label: '皮膚の病気・かゆみ（湿疹、アトピーなど）' },
      { id: 'symp_infect', label: '感染症による不調（風邪、インフルエンザ、胃腸炎など）' },
      { id: 'symp_stomach', label: '胃腸に関する不調（繰り返す下痢、便秘、胃の不快感など）' },
      { id: 'symp_joint', label: '関節の痛みや不自由さ（肩こり・腰痛以外の関節痛など）' },
      { id: 'symp_back', label: '腰痛' },
      { id: 'symp_shoulder', label: '首の不調や肩のこり' },
      { id: 'symp_headache', label: '頭痛（偏頭痛、緊張性頭痛など）' },
      { id: 'symp_teeth', label: '歯の不調（歯痛など）' },
      { id: 'symp_mental', label: '精神に関する不調（強いストレス、気分の落ち込みなど）' },
      { id: 'symp_sleep', label: '睡眠に関する不調（不眠、中途覚醒など）' },
      { id: 'symp_fatigue', label: '全身の倦怠感、疲労感（慢性的なだるさなど）' },
      { id: 'symp_eye', label: '眼の不調（眼精疲労、ドライアイなど）' },
      { id: 'symp_women', label: '女性特有の不調（生理痛、PMSなど）' },
      { id: 'symp_other', label: 'その他の健康上の問題' }
    ]
  },
  {
    id: 'q3',
    showIf: hasSymptom,
    hiddenValue: 0,
    type: 'number',
    title: 'Q3. 症状の頻度（過去3ヶ月）',
    subtitle: '過去3か月の間に、その健康問題（主症状）があった日は合計で何日くらいですか？',
    description: '0日〜90日の間で入力してください。',
    min: 0,
    max: 90,
    unit: '日',
    defaultValue: 0
  },
  {
    id: 'q4',
    showIf: hasSymptom,
    hiddenValue: 10,
    type: 'scale',
    title: 'Q4. 仕事の「量」への影響（QQメソッド）',
    subtitle: 'その健康問題（主症状）がある時、こなせる仕事の「量」は、健康な状態を10割とすると何割程度ですか？',
    description: '1割：ほとんどこなせない 〜 10割：健康時と全く変わらずいつも通りこなせる',
    min: 1,
    max: 10,
    step: 1,
    unit: '割',
    defaultValue: 10
  },
  {
    id: 'q5',
    showIf: hasSymptom,
    hiddenValue: 10,
    type: 'scale',
    title: 'Q5. 仕事の「質」への影響（QQメソッド）',
    subtitle: 'その健康問題（主症状）がある時、仕事の「質」や集中力は、健康な状態を10割とすると何割程度ですか？',
    description: '1割：ミスが多発し著しく質が下がる 〜 10割：いつも通りの高い質を維持できる',
    min: 1,
    max: 10,
    step: 1,
    unit: '割',
    defaultValue: 10
  },
  {
    id: 'q6',
    type: 'choice',
    title: 'Q6. 作業環境について',
    subtitle: 'オフィスの物理的環境（机・椅子・PC・照明・空調・騒音など）に不快感や改善の必要性を感じていますか？',
    options: [
      { id: 'env_yes', label: 'はい（改善してほしい点がある）' },
      { id: 'env_no', label: 'いいえ（特に不満はない）' },
    ]
  },
  {
    id: 'q6_1',
    showIf: hasEnvIssue,
    type: 'textarea',
    title: 'Q6-1. 具体的な改善の要望',
    subtitle: 'オフィスの物理的環境について、具体的な不快な箇所や改善してほしい内容をご自由にご記入ください。',
    description: '例：椅子が合わなくて腰が痛い、照明の反射で画面が見づらい、周囲の話し声が気になって集中できない等',
    placeholder: '改善要望をここに入力してください...'
  },
  {
    id: 'q7',
    type: 'multi',
    title: 'Q7. 専門家介入の希望',
    subtitle: '現在抱えている課題について、外部の専門家による具体的なサポート（介入）を希望しますか？（複数選択可能）',
    options: [
      { id: 'exp_body', label: '【身体の痛み・姿勢改善】 腰痛・肩こり対策、運動指導・ストレッチ指導など' },
      { id: 'exp_lifestyle', label: '【生活習慣病・数値改善】 血圧・脂質健康相談、重症化予防指導など' },
      { id: 'exp_nutrition', label: '【食事・栄養指導】 メタボ改善、食事バランス、ダイエット支援など' },
      { id: 'exp_mental', label: '【心の健康・ストレスケア】 メンタルカウンセリング、ストレスマネジメントなど' },
      { id: 'exp_sleep', label: '【睡眠・休息改善】 不眠・睡眠の質の向上、快眠プログラムなど' },
      { id: 'exp_women', label: '【女性の健康サポート】 生理痛・更年期障害・ライフステージ相談など' },
      { id: 'exp_smoking', label: '【禁煙サポート】 禁煙指導、ニコチン離脱支援など' },
      { id: 'exp_none', label: '特に希望しない' }
    ]
  },
  {
    id: 'q8',
    type: 'textarea',
    title: 'Q8. 自由記載欄',
    subtitle: 'その他、職場環境やご自身の健康、受けたい支援などについてご自由にお書きください。',
    placeholder: 'ご意見や悩みなどをここに入力してください...'
  }
];

const BASE_BY_ID = Object.fromEntries(BASE_QUESTIONS.map((q) => [q.id, q]));

// 上書きできる項目（標準の質問の文言だけ）
const OVERRIDABLE_KEYS = ['title', 'subtitle', 'description', 'placeholder', 'buttonLabel'];
// 選択肢を変えられない標準の質問（専用の列に保存するため）
const OPTION_LOCKED = ['q2', 'q2_sub', 'q6', 'q7'];
// 文言も変えられない質問（損失率の計算に使う）
const LOCKED = ['q1'];
const CUSTOM_ID = /^x_[a-z0-9_]{1,30}$/;
const CUSTOM_TYPES = ['choice', 'multi', 'text', 'textarea', 'number', 'scale'];

export const QUESTION_SETS = {
  // 標準：これまでと同じ質問
  standard: {
    label: '標準',
    questions: ['intro', 'q_id', 'q_dept', 'q1', 'q2', 'q2_sub', 'q3', 'q4', 'q5', 'q6', 'q6_1', 'q7', 'q8'],
  },

  // 例：ここに、企業ごとの質問セットを足していく。
  // 企業マスタの「質問セット」列に、キー（下の例なら short）を書くと、その企業に適用される。
  //
  // short: {
  //   label: '短縮版（症状の詳細を省略）',
  //   questions: [
  //     'intro', 'q_id',
  //     { base: 'q_dept', options: [{ id: 'dept_1', label: '製造部' }, { id: 'dept_2', label: '事務部' }] },
  //     'q1', 'q2',
  //     { id: 'x_commute', type: 'choice', title: '通勤について', subtitle: '通勤時間はどのくらいですか？',
  //       options: [{ id: 'c1', label: '30分未満' }, { id: 'c2', label: '30分以上' }] },
  //     { base: 'q8', subtitle: '職場の健康づくりについて、ご意見をお書きください。' },
  //   ],
  // },
};

/** 質問セットを、画面で使う質問の配列にする。決まりに反する場合は Error を投げる */
export function buildQuestions(setId, sets = QUESTION_SETS) {
  const set = sets[setId];
  if (!set || !Array.isArray(set.questions)) throw new Error(`質問セット「${setId}」がありません`);

  const built = set.questions.map((entry) => {
    // 標準の質問をそのまま使う
    if (typeof entry === 'string') {
      const base = BASE_BY_ID[entry];
      if (!base) throw new Error(`標準の質問「${entry}」はありません`);
      return base;
    }
    if (!entry || typeof entry !== 'object') throw new Error('質問の書き方が正しくありません');

    // 標準の質問の文言・部署の選択肢を変える
    if (entry.base) {
      const base = BASE_BY_ID[entry.base];
      if (!base) throw new Error(`標準の質問「${entry.base}」はありません`);
      const changes = { ...entry };
      delete changes.base;
      for (const key of Object.keys(changes)) {
        if (key === 'options') {
          if (entry.base !== 'q_dept') throw new Error(`「${entry.base}」の選択肢は変えられません。追加質問（x_…）として作ってください`);
          if (!Array.isArray(changes.options) || changes.options.length < 1 || changes.options.length > 12) {
            throw new Error('部署の選択肢は1〜12個にしてください');
          }
          if (changes.options.some((o) => !o || !o.id || !o.label || String(o.label).length > 30)) {
            throw new Error('部署の選択肢には id と label（30文字以内）が必要です');
          }
        } else if (!OVERRIDABLE_KEYS.includes(key)) {
          throw new Error(`「${entry.base}」の「${key}」は変えられません`);
        }
      }
      if (LOCKED.includes(entry.base) && Object.keys(changes).length > 0) {
        throw new Error(`「${entry.base}」は損失率の計算に使うため、変えられません`);
      }
      if (OPTION_LOCKED.includes(entry.base) && 'options' in changes) {
        throw new Error(`「${entry.base}」の選択肢は変えられません`);
      }
      return { ...base, ...changes };
    }

    // その企業だけの追加質問
    if (!entry.id || !CUSTOM_ID.test(entry.id)) throw new Error(`追加質問の id は x_ で始まる英小文字・数字・_ にしてください（${entry.id}）`);
    if (!CUSTOM_TYPES.includes(entry.type)) throw new Error(`追加質問「${entry.id}」の type が正しくありません`);
    if (!entry.title) throw new Error(`追加質問「${entry.id}」に title がありません`);
    if ((entry.type === 'choice' || entry.type === 'multi') && (!Array.isArray(entry.options) || entry.options.length < 2)) {
      throw new Error(`追加質問「${entry.id}」には選択肢が2つ以上必要です`);
    }
    if ((entry.type === 'scale' || entry.type === 'number') && (entry.min === undefined || entry.max === undefined)) {
      throw new Error(`追加質問「${entry.id}」には min と max が必要です`);
    }
    return { ...entry };
  });

  const ids = built.map((q) => q.id);
  if (new Set(ids).size !== ids.length) throw new Error('質問の id が重複しています');
  if (ids[0] !== 'intro') throw new Error("最初の質問は 'intro' にしてください");
  if (!ids.includes('q1')) throw new Error("損失率の質問 'q1' は必ず入れてください");
  return built;
}

/** 登録されている質問セットがすべて正しいかを検査する（正しければ空の配列。誤りがあれば、その内容の配列） */
export function validateQuestionSets(sets = QUESTION_SETS) {
  const errors = [];
  for (const key of Object.keys(sets)) {
    if (!/^[a-z0-9_]{1,30}$/.test(key)) errors.push(`${key}: キーは英小文字・数字・_ の30文字以内にしてください`);
    try {
      buildQuestions(key, sets);
    } catch (e) {
      errors.push(`${key}: ${e.message}`);
    }
  }
  if (!sets.standard) errors.push('standard がありません');
  return errors;
}

/** 画面用。質問セットが見つからない・誤っている場合は null（その企業のアンケートは表示しない） */
export function getQuestions(setId) {
  try {
    return buildQuestions(setId || 'standard');
  } catch (e) {
    console.error(e);
    return null;
  }
}

/** 表示する質問だけに絞る（showIf を満たさない質問は出さない）。showIf は、より前の質問の回答だけを見る */
export function visibleQuestions(questions, answers) {
  return questions.filter((q) => !q.showIf || q.showIf(answers));
}

/**
 * 送信する回答を作る。
 * ・表示しなかった質問（hiddenValue がある質問）は、その値にそろえる（以前の回答が残らないように）
 * ・質問セットに含まれない質問の回答は入れない（スプレッドシートに、聞いていないことを回答として書かない）
 */
export function finalizeAnswers(questions, answers) {
  const out = {};
  for (const q of questions) {
    if (q.type === 'info') continue;
    const visible = !q.showIf || q.showIf(answers);
    if (visible) {
      if (answers[q.id] !== undefined) out[q.id] = answers[q.id];
      // つまみ・数値の質問は、画面に出ていた既定値のまま進んだ場合も、その値を回答とする
      else if (q.defaultValue !== undefined) out[q.id] = q.defaultValue;
    } else if (q.hiddenValue !== undefined) {
      out[q.id] = q.hiddenValue;
    }
  }
  return out;
}

/** 追加質問（x_…）の回答を、「質問文：回答」の形にそろえる（スプレッドシートの「カスタム回答」列に保存する） */
export function customAnswers(questions, answers) {
  const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();
  const items = [];
  for (const q of questions) {
    if (!q.id.startsWith('x_')) continue;
    if (q.showIf && !q.showIf(answers)) continue;
    const v = answers[q.id];
    if (v === undefined || v === null || v === '') continue;
    let text;
    if (q.type === 'choice') text = v.label;
    else if (q.type === 'multi') {
      const labels = (q.options || []).filter((o) => v.includes(o.id)).map((o) => o.label);
      text = labels.join('／');
    } else text = String(v);
    if (!text) continue;
    items.push({ q: stripTags(q.title), a: text });
  }
  return items;
}
