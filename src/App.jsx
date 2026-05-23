import { useState, useEffect } from 'react';
import './App.css';

// 健康経営・いきいき職場づくりアンケート
const QUESTIONS = [
  {
    id: 'intro',
    type: 'info',
    title: '従業員健康・いきいき職場づくりアンケート',
    subtitle: 'より快適な職場づくりのための健康調査にご協力ください',
    description: `皆様が日々の業務を心身ともに健やかな状態で、いきいきと進められる環境を整えるため、健康調査を実施いたします。
本アンケートは、出勤していても体調不良により本領発揮が難しい状態（プレゼンティーイズム）を把握し、具体的な改善策（設備投資や専門家によるサポート）を検討するためのものです。
【プライバシー】回答は統計的に処理され、個別の相談内容が上司や人事評価に伝わることはありません。`,
    buttonLabel: 'アンケートを開始する'
  },
  {
    id: 'q_id',
    type: 'text',
    title: '基本情報',
    subtitle: 'あなたに割り当てられた従業員ID（英数字）を入力してください',
    description: '※定期的なアンケートによる体調変化を追跡するために使用します。',
    placeholder: '例: EMP-001'
  },
  {
    id: 'q_dept',
    type: 'choice',
    title: '基本情報',
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
    subtitle: '心身の健康に全く問題がない時の仕事の出来を10点とした場合、過去4週間の自分の出来は実際には何点でしたか？',
    description: '0点：全く仕事にならなかった ～ 10点：最高の出来だった',
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
    subtitle: 'Q2. 症状の特定：現在、仕事に一番影響をもたらしている健康問題を選択してください。',
    options: [
      { id: 'symp1', label: '首・肩・腰の痛み' },
      { id: 'symp2', label: '目の疲れ' },
      { id: 'symp3', label: '睡眠不足・眠気' },
      { id: 'symp4', label: 'だるさ' },
      { id: 'symp5', label: '心の不調' },
      { id: 'symp6', label: '女性特有の不調' },
      { id: 'symp7', label: 'その他' },
      { id: 'symp8', label: '特になし' },
    ]
  },
  {
    id: 'q3',
    type: 'number',
    title: 'Q3. 症状の頻度',
    subtitle: '過去3か月の間に、その症状があったのは合計で何日くらいですか？',
    description: '（0日〜90日の間で入力してください）',
    min: 0,
    max: 90,
    unit: '日',
    defaultValue: 0
  },
  {
    id: 'q4',
    type: 'scale',
    title: 'Q4. 仕事の「量」への影響（10段階）',
    subtitle: '症状がある時、仕事の量は本来の何割程度こなせていますか？',
    description: '1：全く不可 ～ 10：いつも通り',
    min: 1,
    max: 10,
    step: 1,
    unit: '割',
    defaultValue: 10
  },
  {
    id: 'q5',
    type: 'scale',
    title: 'Q5. 仕事の「質」への影響（10段階）',
    subtitle: '症状がある時、仕事の質は本来の何割程度ですか？',
    description: '1：全く不可 ～ 10：いつも通り',
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
    subtitle: '作業環境（机・椅子・PC・照明等）に不快感や改善の必要を感じますか？',
    options: [
      { id: 'env_yes', label: '(1) はい' },
      { id: 'env_no', label: '(2) いいえ' },
    ]
  },
  {
    id: 'q6_1',
    type: 'textarea',
    title: 'Q6-1. 具体的な改善の要望',
    subtitle: '具体的な不快な箇所や、改善してほしい内容を自由にご記入ください。',
    description: '（例：椅子が低くて腰が痛い、照明が反射して画面が見えにくい、周囲の音が気になり集中できない 等）',
    placeholder: 'ここに入力してください...'
  },
  {
    id: 'q7',
    type: 'multi',
    title: 'Q7. 専門家介入の希望',
    subtitle: '現在抱えている課題について、専門家による具体的なサポートを希望しますか？（複数選択可）',
    options: [
      { id: 'exp1', label: '【身体の痛み・姿勢】 　腰痛・肩こり・眼精疲労対策、デスクや作業環境調整' },
      { id: 'exp2', label: '【生活習慣・数値改善】 　血圧・血糖値等の健康相談、受診勧奨、健康診断結果の解説、生活習慣改善' },
      { id: 'exp3', label: '【食事・栄養】 　食事栄誉相談、ダイエット・活力向上支援' },
      { id: 'exp4', label: '【心の健康・ストレス】 メンタルカウンセリング、不眠相談' },
      { id: 'exp5', label: '【女性の健康】 女性特有のバイオリズムや更年期に関する専門相談' },
      { id: 'none', label: '特に希望しない' },
    ]
  },
  {
    id: 'q8',
    type: 'textarea',
    title: 'Q8. 自由記載欄',
    subtitle: 'その他、職場環境や健康についての要望、悩みなどがあればご自由にお書きください。',
    placeholder: 'ここに入力してください...'
  }
];

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxQHCZPOYZPHlLPtTd2NfjZpp8_rF9rUwmPw2SJiI-p70_vsc73v3sxQOl6fIRcKVoAmg/exec"; 

function App() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [viewMode, setViewMode] = useState('survey'); 

  const [simAnnualSalary, setSimAnnualSalary] = useState(6000000);
  const [simWorkDays, setSimWorkDays] = useState(240);
  const [simWorkHours, setSimWorkHours] = useState(8);

  const currentQuestion = QUESTIONS[currentIdx];
  const progressPercentage = (currentIdx / (QUESTIONS.length - 1)) * 100;

  const handleNext = () => {
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
    if (currentQuestion.id === 'q7' && answers['q6']?.id === 'env_no') {
      setCurrentIdx(currentIdx - 2); 
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
    // 生産性低下割合 ＝ 1 － {（仕事の量 0-10）×（仕事の質 0-10）/ 100}
    const qty = answers['q4'] !== undefined ? answers['q4'] : 10;
    const qlt = answers['q5'] !== undefined ? answers['q5'] : 10;
    const productivityLossRatio = 1 - ((qty * qlt) / 100); 
    
    // 有症状日数（年間換算）※Q3は過去3ヶ月なので×4
    const q3Days = answers['q3'] || 0;
    const annualSymptomDays = q3Days * 4;

    const lossPercentage = Math.round(productivityLossRatio * 100);

    setResult({
      lossPercentage: lossPercentage,
      productivityLossRatio: productivityLossRatio,
      annualSymptomDays: annualSymptomDays,
      level: lossPercentage > 30 ? '危険' : lossPercentage > 15 ? '注意' : '良好'
    });
    setIsCompleted(true);
    await submitToGAS(answers, lossPercentage);
  };

  const submitToGAS = async (data, loss) => {
    if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return;
    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          employeeId: data['q_id'] || '未設定',
          department: data['q_dept']?.label || '未設定',
          lossPercentage: loss,
          answers: data
        })
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (viewMode === 'dashboard') {
    return (
      <div className="app-container dashboard-view">
        <div className="dashboard-header">
          <h1>健康経営ダッシュボード</h1>
          <button className="btn btn-secondary" onClick={() => setViewMode('survey')}>戻る</button>
        </div>
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h3>部署別 プレゼンティーイズム損失率</h3>
            <div className="mock-chart">
              <div className="bar-row"><span className="label">営業・企画</span><div className="bar" style={{width: '60%'}}>24%</div></div>
              <div className="bar-row"><span className="label">開発・技術</span><div className="bar" style={{width: '85%'}}>34%</div></div>
              <div className="bar-row"><span className="label">総務・人事</span><div className="bar" style={{width: '40%'}}>16%</div></div>
            </div>
          </div>
          <div className="dashboard-card">
            <h3>組織全体の推定損失額（年間）</h3>
            <div className="total-loss">¥162,000,000</div>
            <p className="note">※従業員100名、平均損失率27%、平均年収600万円で試算</p>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    // 経済的損失額（年間） = 1時間あたりの人件費 × 1日の労働時間 × 生産性低下割合 × 有症状日数（年間換算）
    // 1時間あたりの人件費 = (年収 / (年間労働日数 * 1日の労働時間)) * 1.15(社会保険料分)
    const hourlyCost = (simAnnualSalary / (simWorkDays * simWorkHours)) * 1.15;
    const individualAnnualLoss = Math.floor(hourlyCost * simWorkHours * result.productivityLossRatio * result.annualSymptomDays);

    return (
      <div className="app-container">
        <div className="survey-card animate-fade-in">
          <div className="completion-screen">
            <div className="success-icon">
              {result.level === '良好' ? '✨' : result.level === '注意' ? '⚠️' : '🚨'}
            </div>
            <h1 className="question-title">あなた個人の分析レポート</h1>
            
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">生産性低下割合</span>
                <span className="stat-value">{result.lossPercentage}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">健康リスク判定</span>
                <span className={`stat-value ${result.level === '良好' ? 'good' : result.level === '注意' ? 'warning' : 'danger'}`}>
                  {result.level}
                </span>
              </div>
            </div>

            <div className="analysis-details">
              <div className="detail-item">
                <span className="label">有症状日数（年間換算）</span>
                <span className="value">{result.annualSymptomDays}日</span>
              </div>
            </div>

            <div className="simulation-section">
              <h2 className="sim-title">あなた個人の年間損失シミュレーション</h2>
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
              <div className="stat-item wide featured-sim">
                <span className="stat-label">個人の年間推定損失額</span>
                <span className="stat-value loss-amount">¥{individualAnnualLoss.toLocaleString()} <span className="unit">/ 年</span></span>
              </div>
              <p className="formula-note">※損失額 = 1時間あたりの人件費(社会保険料等15%加味) × 1日の労働時間 × 生産性低下割合 × 有症状日数(年間換算)</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" style={{flex: 1}} onClick={() => { setCurrentIdx(0); setAnswers({}); setIsCompleted(false); }}>やり直す</button>
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
            <button className="btn btn-primary full-width" onClick={handleNext} style={{ marginTop: '1.5rem' }} disabled={!answers[currentQuestion.id]}>
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
            <button className="btn btn-primary full-width" onClick={handleNext} style={{ marginTop: '2rem' }} disabled={!answers[currentQuestion.id]}>次へ進む</button>
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
