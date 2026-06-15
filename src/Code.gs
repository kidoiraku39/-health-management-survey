// GETリクエスト！ダッシュボードへのリアルタイム集計データの返却
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("スプレッドシートが見つかりません");
    
    const sheet = ss.getSheetByName("回答一覧");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        totalRespondents: 0,
        averageLossPercentage: 0,
        totalAnnualLoss: 0,
        departmentStats: {}
      })).setMimeType(ContentService.MimeType.TEXT);
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        totalRespondents: 0,
        averageLossPercentage: 0,
        totalAnnualLoss: 0,
        departmentStats: {}
      })).setMimeType(ContentService.MimeType.TEXT);
    }
    
    // 全データ取得 (ヘッダーを除く)
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 14); // 列数は14
    const values = dataRange.getValues();
    
    let totalLossSum = 0;
    let validLossCount = 0;
    let deptMap = {};
    
    // 部署の初期化
    const depts = ["営業・企画", "開発・技術", "総務・人事・経理", "その他"];
    depts.forEach(d => {
      deptMap[d] = { count: 0, lossSum: 0 };
    });
    
    values.forEach(row => {
      const dept = row[2] || "その他";
      const loss = parseFloat(row[3]); // 損失率(%)
      
      // 部署集計
      let matchedDept = "その他";
      for (let d of depts) {
        if (dept.indexOf(d) !== -1 || d.indexOf(dept) !== -1) {
          matchedDept = d;
          break;
        }
      }
      
      if (!deptMap[matchedDept]) {
        deptMap[matchedDept] = { count: 0, lossSum: 0 };
      }
      
      if (!isNaN(loss)) {
        totalLossSum += loss;
        validLossCount++;
        deptMap[matchedDept].count++;
        deptMap[matchedDept].lossSum += loss;
      }
    });
    
    const totalRespondents = validLossCount;
    const averageLossPercentage = totalRespondents > 0 ? Math.round(totalLossSum / totalRespondents) : 0;
    
    // 組織全体の年間推定損失額の計算 (平均年収600万円、社保15%加味)
    const averageAnnualSalary = 6000000;
    const totalAnnualLoss = Math.floor(totalRespondents * averageAnnualSalary * 1.15 * (averageLossPercentage / 100));
    
    let departmentStats = {};
    for (let d in deptMap) {
      const count = deptMap[d].count;
      const avg = count > 0 ? Math.round(deptMap[d].lossSum / count) : 0;
      departmentStats[d] = {
        count: count,
        averageLossPercentage: avg
      };
    }
    
    const result = {
      totalRespondents: totalRespondents,
      averageLossPercentage: averageLossPercentage,
      totalAnnualLoss: totalAnnualLoss,
      departmentStats: departmentStats
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function doPost(e) {
  try {
    const contents = e.postData.contents;
    const params = JSON.parse(contents);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("スプレッドシートが見つかりません");
    
    let sheet = ss.getSheetByName("回答一覧");
    if (!sheet) {
      sheet = ss.insertSheet("回答一覧");
      const headers = ["タイムスタンプ", "従業員ID", "部署", "損失率(%)", "Q1", "Q2", "Q2-sub(副症状)", "Q3", "Q4", "Q5", "Q6", "Q6-1", "Q7", "Q8"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    }

    const answers = params.answers || {};
    const row = [
      params.timestamp || new Date().toISOString(),
      params.employeeId || "未設定",
      params.department || "未設定",
      params.lossPercentage || 0,
      answers['q1'] || 0,
      answers['q2']?.label || "なし",
      formatSubSymptoms(answers['q2_sub']),
      answers['q3'] || 0,
      answers['q4'] || 0,
      answers['q5'] || 0,
      answers['q6']?.label || "なし",
      answers['q6_1'] || "",
      formatMultiChoice(answers['q7']),
      answers['q8'] || ""
    ];

    sheet.appendRow(row);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
      
  } catch (error) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      let debugSheet = ss.getSheetByName("デバッグ用");
      if (!debugSheet) debugSheet = ss.insertSheet("デバッグ用");
      debugSheet.appendRow([new Date(), "doPost Error: " + error.toString()]);
    }
    return ContentService.createTextOutput("Error: " + error.toString());
  }
}

function formatSubSymptoms(selectedIds) {
  if (!selectedIds || !Array.isArray(selectedIds)) return "";
  const optionsMap = {
    'symp_allergy': 'アレルギーによる不調',
    'symp_skin': '皮膚の病気・かゆみ',
    'symp_infect': '感染症による不調',
    'symp_stomach': '胃腸に関する不調',
    'symp_joint': '関節の痛みや不自由さ',
    'symp_back': '腰痛',
    'symp_shoulder': '首 of 不調や肩 of こり',
    'symp_headache': '頭痛',
    'symp_teeth': '歯 of 不調',
    'symp_mental': '精神に関する不調',
    'symp_sleep': '睡眠に関する不調',
    'symp_fatigue': '全身 of 倦怠感・疲労感',
    'symp_eye': '眼 of 不調',
    'symp_women': '女性特有 of 不調',
    'symp_other': 'その他 of 不調'
  };
  // 'of' を 'の' に修正
  for (let key in optionsMap) {
    optionsMap[key] = optionsMap[key].replace(" of ", "の");
  }
  return selectedIds.map(id => optionsMap[id] || id).join(", ");
}

function formatMultiChoice(selectedIds) {
  if (!selectedIds || !Array.isArray(selectedIds)) return "";
  const optionsMap = {
    'exp_body': '身体の痛み・姿勢改善',
    'exp_lifestyle': '生活習慣病・数値改善',
    'exp_nutrition': '食事・栄養指導',
    'exp_mental': '心の健康・ストレスケア',
    'exp_sleep': '睡眠・休息改善',
    'exp_women': '女性の健康サポート',
    'exp_smoking': '禁煙サポート',
    'exp_none': '希望しない'
  };
  return selectedIds.map(id => optionsMap[id] || id).join(", ");
}
