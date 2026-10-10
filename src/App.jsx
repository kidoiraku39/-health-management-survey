import { useState, useEffect, useMemo } from 'react';
import './App.css';
import AdminPage from './AdminPage.jsx';
import { gasPost, OPERATOR, isAppConfigured, CONSENT_VERSION, CONSENT_SECTIONS } from './config.js';
import { getQuestions, visibleQuestions, finalizeAnswers, customAnswers } from './questionSets.js';

// 質問は questionSets.js で定義する（厚生労働省・経済産業省推奨のQQ-methodおよびSPQに準拠。企業ごとに質問セットを選べる）

// 企業コード（URLの ?c=xxxx）。企業ごとの専用URLで配布する
function getCompanyCode() {
  return (new URLSearchParams(window.location.search).get('c') || '').trim();
}

function Survey() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState(null);

  // 企業コードの確認（checking → ok / invalid / error）
  const [companyCode] = useState(getCompanyCode);
  const [companyState, setCompanyState] = useState(companyCode ? 'checking' : 'invalid');
  const [companyName, setCompanyName] = useState('');
  const [questionSetId, setQuestionSetId] = useState('standard');
  const [companyRetry, setCompanyRetry] = useState(0);

  // 同意画面（intro → consent → 質問）
  const [stage, setStage] = useState('survey');
  const [consentChecked, setConsentChecked] = useState(false);

  // 送信状況（idle → sending → done / error）
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [submitError, setSubmitError] = useState('');

  // 個人結果のシミュレーション用
  const [simAnnualSalary, setSimAnnualSalary] = useState(6000000);
  const [simWorkDays, setSimWorkDays] = useState(240);
  const [simWorkHours, setSimWorkHours] = useState(8);

  // その企業の質問セット（見つからない・誤っている場合は null）と、いま表示する質問
  const questions = useMemo(() => getQuestions(questionSetId), [questionSetId]);
  const visible = useMemo(() => (questions ? visibleQuestions(questions, answers) : []), [questions, answers]);
  const currentQuestion = visible[currentIdx] || visible[0];
  const progressPercentage = visible.length > 1 ? (currentIdx / (visible.length - 1)) * 100 : 0;
  const hasQuestion = (id) => Boolean(questions && questions.some((q) => q.id === id));

  useEffect(() => {
    if (!companyCode || !isAppConfigured) return;
    let cancelled = false;
    gasPost({ action: 'company', company: companyCode })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setCompanyName(res.name);
          setQuestionSetId(res.questionSet || 'standard');
          setCompanyState('ok');
        } else {
          setCompanyState('invalid');
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setCompanyState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [companyCode, companyRetry]);

  const handleNext = () => {
    // イントロ → 同意画面（同意するまで質問には進めない）
    if (currentQuestion.id === 'intro') {
      setStage('consent');
      return;
    }

    // 従業員ID入力画面で、空欄でも許可する
    if (currentQuestion.id === 'q_id' && !answers['q_id']) {
      setAnswers({ ...answers, 'q_id': '匿名希望' });
    }

    // 表示する質問の並びで、次へ進む（症状なし・環境の不満なしの場合の省略は、各質問の showIf で決まる）
    if (currentIdx < visible.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      calculateResults();
    }
  };

  const handleBack = () => {
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
    // 表示した質問の回答にそろえる（省略した質問は既定値、質問セットにない質問は含めない）
    const data = finalizeAnswers(questions, answers);

    // 1. 全体パフォーマンス損失率（SPQ/HPQベース）
    const q1Score = data['q1'] !== undefined ? data['q1'] : 10;
    const spqLossRatio = (10 - q1Score) / 10;

    // 2. 主症状による個別生産性低下割合（QQ-method）
    const qty = data['q4'] !== undefined ? data['q4'] : 10;
    const qlt = data['q5'] !== undefined ? data['q5'] : 10;
    const qqLossRatio = 1 - ((qty * qlt) / 100);

    // 有症状日数（年間換算）※Q3は過去3ヶ月なので4倍
    const q3Days = data['q3'] || 0;
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
    await submitResponses();
  };

  // 回答をGASへ送る。失敗した場合は画面に表示し、再送できるようにする
  const submitResponses = async () => {
    const data = finalizeAnswers(questions, answers);
    setSubmitStatus('sending');
    setSubmitError('');
    try {
      const res = await gasPost({
        action: 'submit',
        company: companyCode,
        consent: consentChecked,
        consentVersion: CONSENT_VERSION,
        employeeId: data['q_id'] || '匿名希望',
        department: data['q_dept']?.label || '未設定',
        answers: data,
        extra: customAnswers(questions, answers), // この企業だけの追加質問の回答
      });
      if (!res.ok) throw new Error(res.error || 'submit_failed');
      setSubmitStatus('done');
    } catch (err) {
      console.error(err);
      setSubmitError(err.message);
      setSubmitStatus('error');
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
    return hasEnvIssue && hasBodyPain && hasQuestion('q7');
  };

  // 運営者情報・GASのURLが未設定のまま公開されることを防ぐ（企業コードの確認より先に判定する）
  if (!isAppConfigured) {
    return (
      <div className="app-container">
        <div className="survey-card animate-fade-in">
          <h2 className="question-title">アンケートは準備中です</h2>
          <p className="question-subtitle">現在回答を受け付けていません。担当者からの案内をお待ちください。</p>
        </div>
      </div>
    );
  }

  if (companyState !== 'ok') {
    return <CompanyGate state={companyState} onRetry={() => { setCompanyState('checking'); setCompanyRetry((n) => n + 1); }} />;
  }

  // この企業に設定された質問セットが、コードにない・誤っている場合は、回答を受け付けない
  if (!questions) {
    return <CompanyGate state="unavailable" />;
  }

  if (stage === 'consent') {
    return (
      <ConsentScreen
        companyName={companyName}
        checked={consentChecked}
        onToggle={setConsentChecked}
        onBack={() => setStage('survey')}
        onAgree={() => {
          setStage('survey');
          setCurrentIdx(1);
        }}
      />
    );
  }

  if (isCompleted) {
    // 1. 全般的な損失（SPQベース・実年収ベースでの算出）
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

            {submitStatus === 'sending' && <div className="submit-status">回答を送信しています...</div>}
            {submitStatus === 'done' && <div className="submit-status ok">回答を送信しました。ご協力ありがとうございました。</div>}
            {submitStatus === 'error' && (
              <div className="error-banner">
                回答の送信に失敗しました。この画面を閉じずに、通信状況を確認して再送してください。
                {submitError && <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>（エラー内容：{submitError}）</div>}
                <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => submitResponses()}>再送する</button>
              </div>
            )}
            
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
              <div className="detail-item-group" style={{ display: 'grid', gridTemplateColumns: hasQuestion('q3') && hasQuestion('q4') && hasQuestion('q5') ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                {hasQuestion('q4') && hasQuestion('q5') && hasQuestion('q3') && (
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
                )}
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
              <button className="btn btn-secondary" style={{flex: 1}} onClick={() => { setCurrentIdx(0); setAnswers({}); setIsCompleted(false); setSubmitStatus('idle'); setConsentChecked(false); }}>最初からやり直す</button>
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
          {currentQuestion.id === 'intro' && companyName && <div className="company-banner">{companyName} 様向け</div>}
          <h2 className="question-title">{currentQuestion.title}</h2>
          {currentQuestion.subtitle && <p className="question-subtitle" dangerouslySetInnerHTML={{ __html: currentQuestion.subtitle }}></p>}
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
            <div className="step-counter">{currentIdx} / {visible.length - 1}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// 企業コードの確認中／無効／通信エラー時の画面
function CompanyGate({ state, onRetry }) {
  return (
    <div className="app-container">
      <div className="survey-card animate-fade-in">
        {state === 'checking' && (
          <div className="loading-container"><div className="loader"></div><p>確認しています...</p></div>
        )}
        {state === 'invalid' && (
          <>
            <h2 className="question-title">専用のURLからアクセスしてください</h2>
            <p className="question-subtitle">
              このアンケートは、企業ごとにご案内している専用のURL（またはQRコード）からのみ回答できます。
              ご案内の内容をご確認ください。
            </p>
          </>
        )}
        {state === 'unavailable' && (
          <>
            <h2 className="question-title">アンケートは準備中です</h2>
            <p className="question-subtitle">現在回答を受け付けていません。担当者からの案内をお待ちください。</p>
          </>
        )}
        {state === 'error' && (
          <>
            <h2 className="question-title">接続できませんでした</h2>
            <p className="question-subtitle">通信状況を確認して、もう一度お試しください。</p>
            <button className="btn btn-primary full-width" onClick={onRetry}>再読み込み</button>
          </>
        )}
      </div>
    </div>
  );
}

// 同意画面（チェックを入れるまで先に進めない）
function ConsentScreen({ companyName, checked, onToggle, onBack, onAgree }) {
  return (
    <div className="app-container">
      <div className="survey-card animate-fade-in">
        <div className="question-header">
          {companyName && <div className="company-banner">{companyName} 様向け</div>}
          <h2 className="question-title">回答の前に：個人情報の取り扱いについて</h2>
          <p className="question-subtitle">内容をお読みいただき、ご同意のうえでご回答ください。</p>
        </div>

        <div className="consent-box">
          {CONSENT_SECTIONS.map((section) => (
            <div className="consent-section" key={section.title}>
              <h4>{section.title}</h4>
              <p>{typeof section.body === 'function' ? section.body() : section.body}</p>
            </div>
          ))}
          <p className="note">運営者：{OPERATOR.name}</p>
        </div>

        <label className="consent-check">
          <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
          <span>上記の内容を読み、同意して回答します</span>
        </label>

        <button className="btn btn-primary full-width" style={{ marginTop: '1.5rem' }} disabled={!checked} onClick={onAgree}>
          同意して回答を始める
        </button>
        <div className="nav-controls">
          <button className="btn-nav secondary" onClick={onBack}>戻る</button>
        </div>
      </div>
    </div>
  );
}

// 管理者用URL（?admin=true）はログイン画面へ。それ以外は従業員向けアンケート
export default function App() {
  const isAdminPage = new URLSearchParams(window.location.search).get('admin') === 'true';
  return isAdminPage ? <AdminPage /> : <Survey />;
}
