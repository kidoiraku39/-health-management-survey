import { useState, useEffect } from 'react';
import './App.css';

// 厚生労働省・経済産業省推奨のQQ-methodおよびSPQ（全体パフォーマンス評価）に準拠した調査
const QUESTIONS = [
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
    subtitle: 'Q2. 主症状の特定：現在、仕事に一番影響をもたらしている健康問題（主症状）を1つ選択してください。',
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
    type: 'multi',
    title: 'カテゴリ2：その他の気になる症状',
    subtitle: 'Q2-sub. 副症状の特定：主症状以外で、現在仕事や生活に影響している不調があればすべて選択してください。（複数選択可能）',
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
      { id: 'exp_body', label: '【身体の痛み・姿勢改善】 腰痛・肩こり対策、整体・ストレッチ指導など' },
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

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyjArFJ9OwG1YMkhb6121oMmgf0FJJ8zqlJ2WbASNIrFmlHdY7k_HDN8urYKjZrhR5Iyw/exec"; 

function App() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [viewMode, setViewMode] = useState('survey'); 

  // ダッシュボード用のリアルタイムデータ状態
  const [dbData, setDbData] = useState(null);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  // 個人結果のシミュレーション用
  const [simAnnualSalary, setSimAnnualSalary] = useState(6000000);
  const [simWorkDays, setSimWorkDays] = useState(240);
  const [simWorkHours, setSimWorkHours] = useState(8);

  const currentQuestion = QUESTIONS[currentIdx];
  const progressPercentage = (currentIdx / (QUESTIONS.length - 1)) * 100;

  // ダッシュボードデータの取得
  useEffect(() => {
    if (viewMode === 'dashboard') {
      fetchDashboardData();
    }
  }, [viewMode]);

  const fetchDashboardData = async () => {
    setIsDbLoading(true);
    setDbError(null);
    try {
      const response = await fetch(GAS_WEB_APP_URL);
      if (!response.ok) throw new Error("データの取得に失敗しました。");
      const data = await response.json();
      setDbData(data);
    } catch (err) {
      console.error(err);
      setDbError("スプレッドシートとの連携エラーが発生しました。デモデータを表示します。");
      // フォールバックデモデータ
      setDbData({
        totalRespondents: 12,
        averageLossPercentage: 27,
        totalAnnualLoss: 22356000,
        departmentStats: {
          "営業・企画": { count: 4, averageLossPercentage: 24 },
          "開発・技術": { count: 5, averageLossPercentage: 34 },
          "総務・人事・経理": { count: 3, averageLossPercentage: 16 },
          "その他": { count: 0, averageLossPercentage: 0 }
        }
      });
    } finally {
      setIsDbLoading(false);
    }
  };

  const handleNext = () => {
    // 従業員ID入力画面で、空欄でも許可する
    if (currentQuestion.id === 'q_id') {
      if (!answers['q_id']) {
        setAnswers({ ...answers, 'q_id': '匿名希望' });
      }
    }

    // 不調なし（symp_none）を選択した場合は、Q3, Q4, Q5（症状詳細）をスキップしてQ6へ進む
    if (currentQuestion.id === 'q2' && answers['q2']?.id === 'symp_none') {
      setAnswers(prev => ({
        ...prev,
        'q2_sub': [],
        'q3': 0,
        'q4': 10,
        'q5': 10
      }));
      // q2 (index 4) -> q6 (index 9) にジャンプ
      setCurrentIdx(9); 
      return;
    }

    // 環境問題なし（env_no）を選択した場合は、Q6-1をスキップしてQ7へ進む
    if (currentQuestion.id === 'q6' && answers['q6']?.id === 'env_no') {
      setCurrentIdx(currentIdx + 2); 
      return;
    }

    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      calculateResults();
    }
  };

  const handleBack = () => {
    // スキップ分岐の戻り処理
    if (currentQuestion.id === 'q6' && answers['q2']?.id === 'symp_none') {
      setCurrentIdx(4); // q2 (index 4) に戻る
      return;
    }
    if (currentQuestion.id === 'q7' && answers['q6']?.id === 'env_no') {
      setCurrentIdx(9); // q6 (index 9) に戻る
      return;
    }

    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSelectOption = (option) => {
    setAnswers({ ...answers, [currentQuestion.id]: option });
  };

  const handleToggleMulti = (optionId) => {
    const current = answers[currentQuestion.id] || [];
    let updated = current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId];
    setAnswers({ ...answers, [currentQuestion.id]: updated });
  };

  const handleValueChange = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const calculateResults = async () => {
    // 1. 全体パフォーマンス損失率（SPQ/HPQベース）
    const q1Score = answers['q1'] !== undefined ? answers['q1'] : 10;
    const spqLossRatio = (10 - q1Score) / 10;

    // 2. 主症状による個別生産性低下割合（QQ-method）
    const qty = answers['q4'] !== undefined ? answers['q4'] : 10;
    const qlt = answers['q5'] !== undefined ? answers['q5'] : 10;
    const qqLossRatio = 1 - ((qty * qlt) / 100); 

    // 有症状日数（年間換算）※Q3は過去3ヶ月なので4倍
    const q3Days = answers['q3'] || 0;
    const annualSymptomDays = q3Days * 4;

    const lossPercentage = Math.round(spqLossRatio * 100);

    setResult({
      spqLossRatio: spqLossRatio, // 全般の損失率
      qqLossRatio: qqLossRatio, // 主症状の損失率
      lossPercentage: lossPercentage, // 総合表示用の％
      annualSymptomDays: annualSymptomDays,
      level: lossPercentage > 30 ? '危険' : lossPercentage > 15 ? '注意' : '良好'
    });
    setIsCompleted(true);
    await submitToGAS(answers, lossPercentage);
  };

  const submitToGAS = async (data, loss) => {
    if (GAS_WEB_APP_URL === "") return;
    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          employeeId: data['q_id'] || '匿名希望',
          department: data['q_dept']?.label || '未設定',
          lossPercentage: loss,
          answers: data
        })
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // 作業環境と不調のレコメンド連動
  const shouldRecommendErgonomics = () => {
    const hasEnvIssue = answers['q6']?.id === 'env_yes';
    const hasBodyPain = answers['q2']?.id === 'symp_back' || 
                        answers['q2']?.id === 'symp_shoulder' || 
                        answers['q2']?.id === 'symp_joint' ||
                        answers['q2']?.id === 'symp_eye' ||
                        (answers['q2_sub'] || []).some(id => ['symp_back', 'symp_shoulder', 'symp_joint', 'symp_eye'].includes(id));
    return hasEnvIssue && hasBodyPain;
  };

  if (viewMode === 'dashboard') {
    return (
      <div className="app-container dashboard-view">
        <div className="dashboard-header">
          <h1>健康経営ダッシュボード (実回答連動)</h1>
          <button className="btn btn-secondary" onClick={() => setViewMode('survey')}>戻る</button>
        </div>
        
        {isDbLoading ? (
          <div className="loading-container"><div className="loader"></div><p>リアルタイムデータを集計中...</p></div>
        ) : dbError ? (
          <div className="dashboard-content">
            <div className="error-banner">{dbError}</div>
            {/* デモデータを表示 */}
            {dbData && renderDashboardContent(dbData)}
          </div>
        ) : (
          <div className="dashboard-content">
            {dbData && renderDashboardContent(dbData)}
          </div>
        )}
      </div>
    );
  }

  function renderDashboardContent(data) {
    return (
      <>
        <div className="dashboard-card">
          <h3>部署別 プレゼンティーズム平均損失率 (%)</h3>
          <div className="mock-chart">
            {Object.keys(data.departmentStats).map(dept => {
              const stats = data.departmentStats[dept];
              return (
                <div className="bar-row" key={dept}>
                  <span className="label">{dept} ({stats.count}名)</span>
                  <div className="bar-wrapper">
                    <div className="bar" style={{width: `${Math.max(stats.averageLossPercentage, 5)}%`}}>
                      {stats.averageLossPercentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="dashboard-card">
          <h3>組織全体の推定損失額 (年間)</h3>
          <div className="total-loss">¥{data.totalAnnualLoss.toLocaleString()}</div>
          <p className="note">
            ※現在登録されている全{data.totalRespondents}名のデータに基づく実数値試算です。<br />
            （想定平均年収6,000,000円、社会保険料等加味15%）
          </p>
        </div>
      </>
    );
  }

  if (isCompleted) {
    // 1. 全般的な損失（SPQベース・実年収ベースでの算出）
    const hourlyCost = (simAnnualSalary / (simWorkDays * simWorkHours)) * 1.15;
    const spqAnnualLoss = Math.floor(simAnnualSalary * 1.15 * result.spqLossRatio);

    // 2. 主症状による個別損失（QQ-method公式・標準人件費単価3,300円ベース）
    // 生産性損失額/年 = 3,300円 * 8時間 * 生産性低下割合 * 有症状日数
    const qqStandardHourlyRate = 3300;
    const qqAnnualLoss = Math.floor(qqStandardHourlyRate * 8 * result.qqLossRatio * result.annualSymptomDays);

    return (
      <div className="app-container">
        <div className="survey-card animate-fade-in">
          <div className="completion-screen">
            <div className="success-icon">
              {result.level === '良好' ? '✨' : result.level === '注意' ? '⚠️' : '🚨'}
            </div>
            <h1 className="question-title">あなた個人の健康診断レポート</h1>
            
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">全体パフォーマンス低下率</span>
                <span className="stat-value">{result.lossPercentage}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">健康リスク判定</span>
                <span className={`stat-value ${result.level === '良好' ? 'good' : result.level === '注意' ? 'warning' : 'danger'}`}>
                  {result.level}
                </span>
              </div>
            </div>

            {shouldRecommendErgonomics() && (
              <div className="recommendation-banner alert-box" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '8px', color: '#856404' }}>
                <strong>💡 改善アドバイス（作業環境の最適化）</strong><br />
                あなたの身体的な不調（首・肩・腰・眼など）は、オフィスの作業環境が影響している可能性が高いです。Q7にて「【身体の痛み・姿勢改善】」サポートを希望することをお勧めします。
              </div>
            )}

            <div className="analysis-details" style={{ marginTop: '2rem' }}>
              <div className="detail-item-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="detail-card" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>①主症状による年間損失額<br />(公式QQ-method準拠)</h4>
                  <span className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>
                    ¥{qqAnnualLoss.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6c757d' }}>/ 年</span>
                  </span>
                  <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', color: '#6c757d', lineHeight: '1.3' }}>
                    ※最も影響度の高い健康課題「{answers['q2']?.label}」に特化した学術的損失推計値です。<br />
                    （標準単価3,300円/時×8時間×症状時の低下割合×年間有症状日数）
                  </p>
                </div>
                <div className="detail-card" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>②全体パフォーマンス損失額<br />(SPQ基準・個別年収ベース)</h4>
                  <span className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>
                    ¥{spqAnnualLoss.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6c757d' }}>/ 年</span>
                  </span>
                  <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', color: '#6c757d', lineHeight: '1.3' }}>
                    ※直近4週間全体の心身不調に伴う全般的な生産性低下による損失額です。<br />
                    （入力された年収・社保加味をベースに算出）
                  </p>
                </div>
              </div>
            </div>

            <div className="simulation-section" style={{ marginTop: '2rem' }}>
              <h2 className="sim-title">②の年収ベース損失シミュレーション</h2>
              <div className="sim-inputs">
                <div className="input-group">
                  <label>個人の年収 (円)</label>
                  <input type="number" value={simAnnualSalary} onChange={(e) => setSimAnnualSalary(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label>年間労働日数 (日)</label>
                  <input type="number" value={simWorkDays} onChange={(e) => setSimWorkDays(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label>1日の労働時間 (h)</label>
                  <input type="number" value={simWorkHours} onChange={(e) => setSimWorkHours(Number(e.target.value))} />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" style={{flex: 1}} onClick={() => { setCurrentIdx(0); setAnswers({}); setIsCompleted(false); }}>最初からやり直す</button>
              <button className="btn btn-primary" style={{flex: 1}} onClick={() => setViewMode('dashboard')}>ダッシュボード</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="survey-card animate-fade-in" key={currentQuestion.id}>
        {currentQuestion.id !== 'intro' && (
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        )}
        
        <div className="question-header">
          <h2 className="question-title">{currentQuestion.title}</h2>
          {currentQuestion.subtitle && <p className="question-subtitle">{currentQuestion.subtitle}</p>}
        </div>

        {currentQuestion.type === 'info' && (
          <div className="info-view">
            <div className="description">{currentQuestion.description}</div>
            <button className="btn btn-primary full-width" onClick={handleNext}>{currentQuestion.buttonLabel}</button>
          </div>
        )}

        {(currentQuestion.type === 'choice' || currentQuestion.type === 'multi') && (
          <div className="options-grid">
            {currentQuestion.options.map((option) => {
              const isSelected = currentQuestion.type === 'choice' 
                ? answers[currentQuestion.id]?.id === option.id
                : (answers[currentQuestion.id] || []).includes(option.id);
              return (
                <button
                  key={option.id}
                  className={`option-button ${isSelected ? 'selected' : ''}`}
                  onClick={() => currentQuestion.type === 'choice' ? handleSelectOption(option) : handleToggleMulti(option.id)}
                >
                  <div className={`option-indicator ${currentQuestion.type === 'multi' ? 'multi' : ''}`}></div>
                  <span className="label">{option.label}</span>
                </button>
              );
            })}
            <button className="btn btn-primary full-width" onClick={handleNext} style={{ marginTop: '1.5rem' }} disabled={currentQuestion.type === 'choice' && !answers[currentQuestion.id]}>
              次へ進む
            </button>
          </div>
        )}

        {currentQuestion.type === 'scale' && (
          <div className="scale-container">
            <div className="scale-display">
              <span className="value">{answers[currentQuestion.id] ?? currentQuestion.defaultValue}</span>
              <span className="unit">{currentQuestion.unit}</span>
            </div>
            <input type="range" min={currentQuestion.min} max={currentQuestion.max} step={currentQuestion.step} value={answers[currentQuestion.id] ?? currentQuestion.defaultValue} onChange={(e) => handleValueChange(parseInt(e.target.value))} className="range-slider" />
            <div className="scale-labels"><span>{currentQuestion.min}{currentQuestion.unit}</span><span>{currentQuestion.max}{currentQuestion.unit}</span></div>
            <p className="description" style={{ textAlign: 'center' }}>{currentQuestion.description}</p>
            <button className="btn btn-primary full-width" onClick={handleNext} style={{ marginTop: '2rem' }}>次へ進む</button>
          </div>
        )}

        {currentQuestion.type === 'text' && (
          <div className="text-input-container" style={{ marginTop: '1rem' }}>
            <input type="text" className="custom-text-input" placeholder={currentQuestion.placeholder} value={answers[currentQuestion.id] || ''} onChange={(e) => handleValueChange(e.target.value)} />
            <p className="description" style={{ textAlign: 'center', marginTop: '1rem' }}>{currentQuestion.description}</p>
            <button className="btn btn-primary full-width" onClick={handleNext} style={{ marginTop: '2rem' }}>次へ進む</button>
          </div>
        )}

        {currentQuestion.type === 'number' && (
          <div className="number-container">
            <div className="number-input-wrapper">
              <input type="number" min={currentQuestion.min} max={currentQuestion.max} value={answers[currentQuestion.id] ?? currentQuestion.defaultValue} onChange={(e) => handleValueChange(parseInt(e.target.value))} className="large-number-input" />
              <span className="unit">{currentQuestion.unit}</span>
            </div>
            <p className="description" style={{ textAlign: 'center', marginTop: '1rem' }}>{currentQuestion.description}</p>
            <button className="btn btn-primary full-width" onClick={handleNext} style={{ marginTop: '2rem' }}>次へ進む</button>
          </div>
        )}

        {currentQuestion.type === 'textarea' && (
          <div className="textarea-container">
            <textarea className="custom-textarea" placeholder={currentQuestion.placeholder} value={answers[currentQuestion.id] || ''} onChange={(e) => handleValueChange(e.target.value)} rows={5}></textarea>
            <p className="description" style={{ textAlign: 'center', marginTop: '1rem' }}>{currentQuestion.description}</p>
            <button className="btn btn-primary full-width" onClick={handleNext} style={{ marginTop: '2rem' }}>次へ進む</button>
          </div>
        )}

        {currentQuestion.id !== 'intro' && (
          <div className="nav-controls">
            <button className="btn-nav secondary" onClick={handleBack}>戻る</button>
            <div className="step-counter">{currentIdx} / {QUESTIONS.length - 1}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
