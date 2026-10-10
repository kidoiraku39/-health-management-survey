import { useState, useEffect } from 'react';
import { gasPost } from './config.js';
import './App.css';

const TOKEN_KEY = 'adminToken';

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function saveToken(value) {
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 保存できない環境（プライベートモード等）では、毎回入力してもらう
  }
}

// 管理者ダッシュボード。認証はGAS側で行う（このページを開けるだけではデータは見えない）
export default function AdminPage() {
  const [token, setToken] = useState(readToken);
  const [passwordInput, setPasswordInput] = useState('');
  const [company, setCompany] = useState('__all__');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readToken()));
  const [error, setError] = useState('');

  // 取得処理。読み込み中の表示（loading）とエラーのリセットは、操作した側（ログイン・企業切替）で行う
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await gasPost({ action: 'dashboard', token, company });
        if (cancelled) return;
        if (res.ok) {
          setData(res);
        } else if (res.error === 'unauthorized') {
          saveToken('');
          setToken('');
          setData(null);
          setError('パスワードが正しくありません。');
        } else {
          setError('集計の取得に失敗しました。時間をおいて再度お試しください。');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('サーバーに接続できませんでした。ネットワークとGASの公開設定を確認してください。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, company]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!passwordInput) return;
    setLoading(true);
    setError('');
    saveToken(passwordInput);
    setToken(passwordInput);
    setPasswordInput('');
  };

  const handleLogout = () => {
    saveToken('');
    setToken('');
    setData(null);
    setCompany('__all__');
  };

  if (!token) {
    return (
      <div className="app-container">
        <form className="survey-card animate-fade-in" onSubmit={handleLogin}>
          <h2 className="question-title">管理者ログイン</h2>
          <p className="question-subtitle">集計を見るには、管理者パスワードが必要です。</p>
          {error && <div className="error-banner">{error}</div>}
          <input
            type="password"
            className="custom-text-input"
            placeholder="管理者パスワード"
            autoComplete="current-password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary full-width" style={{ marginTop: '1.5rem' }} disabled={!passwordInput}>
            ログイン
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container dashboard-view">
      <div className="dashboard-header">
        <h1>健康経営ダッシュボード（管理者）</h1>
        <button className="btn btn-secondary" onClick={handleLogout}>ログアウト</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {data && (
        <div className="dashboard-card">
          <h3>表示する企業</h3>
          <select className="custom-text-input" value={company} onChange={(e) => { setLoading(true); setError(''); setCompany(e.target.value); }}>
            <option value="__all__">全社の合計</option>
            {data.companies.map((c) => (
              <option key={c.code} value={c.code}>{c.name}（{c.count}件）</option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="loading-container"><div className="loader"></div><p>集計中...</p></div>
      )}

      {!loading && data && <Stats stats={data.stats} />}
    </div>
  );
}

function Stats({ stats }) {
  if (stats.suppressed) {
    return (
      <div className="dashboard-card">
        <h3>集計を表示できません</h3>
        <p className="note">
          回答数が{stats.totalRespondents}名のため、集計は表示されません。
          個人が推測されることを防ぐため、{stats.minGroupSize}名以上になると表示されます。
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-card">
        <h3>部署別 プレゼンティーズム平均損失率 (%)</h3>
        {stats.departmentStats ? (
          <>
            <div className="mock-chart">
              {stats.departmentStats.map((d) => (
                <div className="bar-row" key={d.label}>
                  <span className="label">{d.label}{d.merged ? '（合算）' : ''} ({d.count}名)</span>
                  <div className="bar-wrapper">
                    <div className="bar" style={{ width: `${Math.max(d.averageLossPercentage, 5)}%` }}>
                      {d.averageLossPercentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {stats.departmentStats.some((d) => d.merged) && (
              <p className="note">※各グループが{stats.minGroupSize}名以上になるよう、回答の少ない部署を合算しています。</p>
            )}
          </>
        ) : (
          <p className="note">
            部署別は表示しません。{stats.minGroupSize}名以上のグループを作れないため、個人が推測される恐れがあります。
          </p>
        )}
      </div>

      <div className="dashboard-card">
        <h3>全体の平均損失率</h3>
        <div className="total-loss">{stats.averageLossPercentage}%</div>
        <p className="note">回答者 {stats.totalRespondents}名の平均です。</p>
      </div>

      <div className="dashboard-card">
        <h3>推定損失額 (年間)</h3>
        <div className="total-loss">¥{stats.totalAnnualLoss.toLocaleString()}</div>
        <p className="note">
          ※回答者{stats.totalRespondents}名の平均損失率に基づく概算です。<br />
          （想定平均年収6,000,000円、社会保険料等加味15%。実際の年収ではなく仮定値です）
        </p>
      </div>
    </>
  );
}
