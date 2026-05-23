// GETリクエスト（doGet）が来てもエラーにならないように追加
function doGet(e) {
  return ContentService.createTextOutput("GETリクエストを受け取りました。アンケートはPOSTで送信してください。");
}

function doPost(e) {
  try {
    const contents = e.postData.contents;
    const params = JSON.parse(contents);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("スプレッドシートが見つかりません。");
    
    let sheet = ss.getSheetByName("回答一覧");
    if (!sheet) {
      sheet = ss.insertSheet("回答一覧");
      // 先頭に「従業員ID」の列を追加
      const headers = ["タイムスタンプ", "従業員ID", "部署", "損失率(%)", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q6-1", "Q7", "Q8"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    }

    const answers = params.answers || {};
    // params.employeeId を追加
    const row = [
      params.timestamp || new Date().toISOString(),
      params.employeeId || "未設定",
      params.department || "未設定",
      params.lossPercentage || 0,
      answers['q1'] || 0,
      answers['q2']?.label || "なし",
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
    // エラー時は「デバッグ用」シートに書き込む
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      let debugSheet = ss.getSheetByName("デバッグ用");
      if (!debugSheet) debugSheet = ss.insertSheet("デバッグ用");
      debugSheet.appendRow([new Date(), "doPost Error: " + error.toString()]);
    }
    return ContentService.createTextOutput("Error: " + error.toString());
  }
}

function formatMultiChoice(selectedIds) {
  if (!selectedIds || !Array.isArray(selectedIds)) return "";
  const optionsMap = {
    'exp1': '身体の痛み・姿勢',
    'exp2': '生活習慣・数値改善',
    'exp3': '食事・栄養',
    'exp4': '心の健康・ストレス',
    'exp5': '女性の健康',
    'none': '希望しない'
  };
  return selectedIds.map(id => optionsMap[id] || id).join(", ");
}
