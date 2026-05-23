import { useState } from 'react';
import './App.css';

// 質問データの定義（健康経営・産業理学療法関連）
const QUESTIONS = [
  {
    id: 'q1',
    title: '現在の従業員の健康状態について、最も課題に感じていることは何ですか？',
    subtitle: '1つだけお選びください。',
    options: [
      { id: 'opt1_1', label: '肩こり・腰痛などの身体的な痛み（プレゼンティーズム）' },
      { id: 'opt1_2', label: 'メンタルヘルスの不調' },
      { id: 'opt1_3', label: '運動不足・肥満' },
      { id: 'opt1_4', label: '慢性的な疲労感・睡眠不足' },
      { id: 'opt1_5', label: '特に課題は感じていない' },
    ]
  },
  {
    id: 'q2',
    title: '現在、貴社で行っている「健康経営」に向けた取り組みはありますか？',
    subtitle: '最も当てはまるものをお選びください。',
    options: [
      { id: 'opt2_1', label: '健康診断の受診徹底のみ行っている' },
      { id: 'opt2_2', label: 'ストレスチェックや産業医面談を実施している' },
      { id: 'opt2_3', label: '運動習慣の促進やセミナーなどを実施している' },
      { id: 'opt2_4', label: '専門家（理学療法士など）を導入している' },
      { id: 'opt2_5', label: '特に行っていない' },
    ]
  },
  {
    id: 'q3',
    title: 'もし、社内で専門家から「身体のケア（体操や姿勢指導）」を受けられるとしたら、従業員の生産性は向上すると思いますか？',
    subtitle: '直感でお答えください。',
    options: [
      { id: 'opt3_1', label: '非常に向上すると思う' },
      { id: 'opt3_2', label: 'やや向上すると思う' },
      { id: 'opt3_3', label: 'あまり変わらないと思う' },
      { id: 'opt3_4', label: '全く向上しないと思う' },
      { id: 'opt3_5', label: 'わからない' },
    ]
  }
];

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = QUESTIONS[currentStep];
  const progressPercentage = ((currentStep) / QUESTIONS.length) * 100;

  const handleSelectOption = (optionId: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionId
    });
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 完了処理
      setIsCompleted(true);
      console.log('Survey Results:', answers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isCompleted) {
    return (
      <div className="app-container">
        <div className="survey-card animate-fade-in">
          <div className="completion-screen">
            <div className="success-icon">✓</div>
            <h1 className="question-title">ご回答ありがとうございました</h1>
            <p className="question-subtitle" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
              いただいた回答は、今後の健康経営サポートサービスの向上に活用させていただきます。
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setCurrentStep(0);
                setAnswers({});
                setIsCompleted(false);
              }}
            >
              最初からやり直す
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnsweredCurrent = !!answers[currentQuestion.id];

  return (
    <div className="app-container">
      <div className="survey-card animate-fade-in" key={currentStep}>
        {/* Progress Bar */}
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Step {currentStep + 1} of {QUESTIONS.length}
        </div>

        {/* Question Header */}
        <div className="question-header">
          <h2 className="question-title">{currentQuestion.title}</h2>
          {currentQuestion.subtitle && (
            <p className="question-subtitle">{currentQuestion.subtitle}</p>
          )}
        </div>

        {/* Options Grid */}
        <div className="options-grid">
          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id] === option.id;
            return (
              <button
                key={option.id}
                className={`option-button ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectOption(option.id)}
              >
                <div className="option-indicator"></div>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="controls">
          <button 
            className="btn btn-secondary" 
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            戻る
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleNext}
            disabled={!hasAnsweredCurrent}
          >
            {currentStep === QUESTIONS.length - 1 ? '送信する' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
