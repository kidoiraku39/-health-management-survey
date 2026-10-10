// 質問セットの検査。npm test で実行する
import assert from 'node:assert';
import {
  BASE_QUESTIONS, QUESTION_SETS, buildQuestions, validateQuestionSets, getQuestions,
  visibleQuestions, finalizeAnswers, customAnswers,
} from '../src/questionSets.js';

const results = [];
function t(name, fn) {
  try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + e.message]); }
}
const ids = (qs) => qs.map((q) => q.id);
const mk = (questions) => ({ standard: QUESTION_SETS.standard, t: { label: 't', questions } });
const build = (questions) => buildQuestions('t', mk(questions));

t('登録されているすべての質問セットが正しい（standard を含む）', () => {
  assert.deepStrictEqual(validateQuestionSets(), []);
  assert.ok(QUESTION_SETS.standard);
});
t('standard は、これまでと同じ質問・順番', () => {
  assert.deepStrictEqual(ids(getQuestions('standard')), ['intro', 'q_id', 'q_dept', 'q1', 'q2', 'q2_sub', 'q3', 'q4', 'q5', 'q6', 'q6_1', 'q7', 'q8']);
  assert.deepStrictEqual(ids(getQuestions(undefined)), ids(getQuestions('standard')));
});
t('未知の質問セットは null（アンケートを出さない）', () => {
  const orig = console.error; console.error = () => {};
  assert.strictEqual(getQuestions('nope'), null);
  console.error = orig;
});
t('標準の質問の文言だけを変えられる', () => {
  const qs = build(['intro', { base: 'q8', subtitle: '新しい文言' }, 'q1']);
  assert.strictEqual(qs.find((q) => q.id === 'q8').subtitle, '新しい文言');
  assert.strictEqual(BASE_QUESTIONS.find((q) => q.id === 'q8').subtitle !== '新しい文言', true); // 元は変わらない
});
t('q1（損失率の質問）は必須。なければ誤り', () => {
  assert.throws(() => build(['intro', 'q8']), /q1/);
});
t('q1 は文言も変えられない', () => {
  assert.throws(() => build(['intro', { base: 'q1', title: 'x' }]), /q1/);
});
t('最初は intro', () => {
  assert.throws(() => build(['q1', 'intro']), /intro/);
});
t('q2 / q2_sub / q6 / q7 の選択肢は変えられない', () => {
  for (const id of ['q2', 'q2_sub', 'q6', 'q7']) {
    assert.throws(() => build(['intro', 'q1', { base: id, options: [{ id: 'a', label: 'a' }] }]), /選択肢|変えられません/);
  }
});
t('部署の選択肢は変えられる。ただし1〜12個・id と label が必要', () => {
  const ok = build(['intro', { base: 'q_dept', options: [{ id: 'd1', label: '製造部' }, { id: 'd2', label: '事務部' }] }, 'q1']);
  assert.strictEqual(ok[1].options[0].label, '製造部');
  assert.throws(() => build(['intro', { base: 'q_dept', options: [] }, 'q1']));
  assert.throws(() => build(['intro', { base: 'q_dept', options: [{ id: 'd1' }] }, 'q1']));
  assert.throws(() => build(['intro', { base: 'q_dept', options: [{ id: 'd1', label: 'あ'.repeat(31) }] }, 'q1']));
});
t('上書きできない項目（min・type など）は誤り', () => {
  for (const key of ['min', 'max', 'type', 'id', 'showIf', 'hiddenValue']) {
    assert.throws(() => build(['intro', 'q1', { base: 'q4', [key]: 1 }]), /変えられません/);
  }
});
t('追加質問：id は x_ で始まる・type と title が必要・選択肢は2つ以上', () => {
  const good = { id: 'x_commute', type: 'choice', title: '通勤', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] };
  assert.ok(build(['intro', 'q1', good]).some((q) => q.id === 'x_commute'));
  assert.throws(() => build(['intro', 'q1', { ...good, id: 'commute' }]), /x_/);
  assert.throws(() => build(['intro', 'q1', { ...good, id: 'x_Bad' }]), /x_/);
  assert.throws(() => build(['intro', 'q1', { ...good, type: 'radio' }]), /type/);
  assert.throws(() => build(['intro', 'q1', { ...good, title: '' }]), /title/);
  assert.throws(() => build(['intro', 'q1', { ...good, options: [{ id: 'a', label: 'A' }] }]), /選択肢/);
  assert.throws(() => build(['intro', 'q1', { id: 'x_n', type: 'number', title: 'n' }]), /min/);
});
t('質問の id は重複できない', () => {
  assert.throws(() => build(['intro', 'q1', 'q1']), /重複/);
});
t('存在しない標準の質問は誤り', () => {
  assert.throws(() => build(['intro', 'q1', 'q99']), /q99/);
  assert.throws(() => build(['intro', 'q1', { base: 'q99' }]), /q99/);
});

// 標準の質問セットでの、質問の出し分け（以前のジャンプ処理と同じ動き）
const std = getQuestions('standard');
t('症状なし（symp_none）→ 副症状・Q3・Q4・Q5 を出さない', () => {
  const v = ids(visibleQuestions(std, { q2: { id: 'symp_none' } }));
  assert.deepStrictEqual(v, ['intro', 'q_id', 'q_dept', 'q1', 'q2', 'q6', 'q7', 'q8']);
});
t('症状あり・環境に不満あり → すべて出す', () => {
  const v = ids(visibleQuestions(std, { q2: { id: 'symp_back' }, q6: { id: 'env_yes' } }));
  assert.deepStrictEqual(v, ids(std));
});
t('環境に不満なし（env_no）→ Q6-1 を出さない', () => {
  const v = ids(visibleQuestions(std, { q2: { id: 'symp_back' }, q6: { id: 'env_no' } }));
  assert.ok(!v.includes('q6_1') && v.includes('q7'));
});
t('送信する回答：症状なしなら、以前の回答が残っていても既定値にそろえる', () => {
  const out = finalizeAnswers(std, { q1: 8, q2: { id: 'symp_none' }, q2_sub: ['symp_back'], q3: 50, q4: 3, q5: 2 });
  assert.deepStrictEqual([out.q2_sub, out.q3, out.q4, out.q5], [[], 0, 10, 10]);
});
t('送信する回答：つまみを動かさなかった質問は、画面に出ていた既定値になる', () => {
  const out = finalizeAnswers(std, { q2: { id: 'symp_back' } });
  assert.deepStrictEqual([out.q1, out.q3, out.q4, out.q5], [10, 0, 10, 10]);
});
t('送信する回答：質問セットにない質問は含めない', () => {
  const qs = build(['intro', 'q1', 'q8']);
  const out = finalizeAnswers(qs, { q1: 5, q2: { id: 'symp_back' }, q3: 10, q8: 'x' });
  assert.deepStrictEqual(Object.keys(out).sort(), ['q1', 'q8']);
});
t('追加質問の回答を「質問文：回答」にそろえる（選択・複数選択・自由記述・HTMLタグ除去）', () => {
  const qs = build(['intro', 'q1',
    { id: 'x_a', type: 'choice', title: '<b>通勤</b>', options: [{ id: 'a', label: '近い' }, { id: 'b', label: '遠い' }] },
    { id: 'x_b', type: 'multi', title: '手段', options: [{ id: 'a', label: '電車' }, { id: 'b', label: '車' }, { id: 'c', label: '徒歩' }] },
    { id: 'x_c', type: 'textarea', title: '自由記述' },
    { id: 'x_d', type: 'textarea', title: '未回答' },
  ]);
  const items = customAnswers(qs, { x_a: { id: 'b', label: '遠い' }, x_b: ['a', 'c'], x_c: '意見' });
  assert.deepStrictEqual(items, [{ q: '通勤', a: '遠い' }, { q: '手段', a: '電車／徒歩' }, { q: '自由記述', a: '意見' }]);
});
t('追加質問にも showIf を付けられる（表示しないなら回答に含めない）', () => {
  const qs = build(['intro', 'q1', { id: 'x_a', type: 'textarea', title: 'a', showIf: () => false }]);
  assert.deepStrictEqual(customAnswers(qs, { x_a: 'x' }), []);
});

results.forEach(([s, n]) => console.log(s, n));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
