/**
 * Googleスライドを自動生成するスクリプト（メソッド名バグ修正版）
 * 
 * 【使い方】
 * 1. Googleドライブ等からApps Scriptを開きます（スプレッドシートから開いても、直接開いてもOKです）。
 * 2. 既存のコードをすべて消去し、このコードを貼り付けます。
 * 3. 画面上部にある「保存（フロッピーディスクのアイコン）」をクリックします。
 * 4. 保存後、実行する関数が「createPresentationSlides」になっていることを確認し、「実行」をクリックします。
 */
function createPresentationSlides() {
  try {
    // プレゼンテーションの新規作成
    const presentation = SlidesApp.create("【提案書】健康経営プレゼンティーズム調査モニター募集");
    const slides = presentation.getSlides();
    
    // テーマカラーの設定
    const COLOR_BG = "#0f172a";      // Slate 900 (ダークネイビーの背景)
    const COLOR_TEXT = "#f8fafc";    // Slate 50 (白に近いテキスト)
    const COLOR_MUTED = "#94a3b8";   // Slate 400 (グレー of サブテキスト)
    const COLOR_ACCENT = "#f97316";  // Orange 500 (オレンジのアクセントカラー)
    
    // --- 1. タイトルスライド（表紙）の作成 ---
    const slide1 = slides[0];
    applyBackground(slide1, COLOR_BG);
    
    // 表紙の枠とテキスト
    const box1 = slide1.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 150, 860, 260);
    box1.getBorder().setTransparent();
    box1.getFill().setTransparent();
    
    const textRange1 = box1.getText();
    textRange1.setText("隠れた生産性損失を「円」で見える化する\n健康経営プレゼンティーズム調査（QQ-method）\n\nーー 無料実証実験（モニター）導入のご提案 ーー");
    
    // 表紙の文字装飾
    textRange1.getStyle().setFontFamily("Arial");
    textRange1.getParagraphs()[0].getRange().getStyle().setFontSize(22).setFontColor(COLOR_MUTED);
    textRange1.getParagraphs()[1].getRange().getStyle().setFontSize(36).setFontColor(COLOR_ACCENT).setBold(true);
    textRange1.getParagraphs()[3].getRange().getStyle().setFontSize(20).setFontColor(COLOR_TEXT);

    // --- 2. スライド2：背景の作成 ---
    createStandardSlide(presentation, "背景：なぜ今、健康経営なのか？", 
      "■ 見えない損失「プレゼンティーズム」の存在\n" +
      " ・アブセンティイズム（欠勤・休職）: 表面化するため、対策を打ちやすい。\n" +
      " ・プレゼンティーズム（疾病就業）: 体調不良のまま出勤し、作業能率が落ちている状態。\n" +
      "   （肩こり、腰痛、目の疲れ、睡眠不足、プチメンタル不調など）\n" +
      " ※見えないため対策が難しく、実は健康関連コストの約70%を占めます。\n\n" +
      "■ 本調査の目的\n" +
      " 従業員の「隠れた不調」と、それがもたらす「損失額」を明確にし、効果的な環境投資・支援策を特定します。",
      COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_ACCENT
    );

    // --- 3. スライド3：サービスの特徴 ---
    createStandardSlide(presentation, "サービスの特徴（他社サーベイとの違い）", 
      "■ 特徴①：損失額を「円」で算出（経営陣・CFOに響く説得力）\n" +
      " 厚生労働省が推奨する「QQ-method（Quantity and Quality法）」の公式算定式に完全準拠し、従業員一人ひとりの症状に紐づくリアルな年間損失額を算出します。\n\n" +
      "■ 特徴②：圧倒的な回答体験（UI/UXの高さ）\n" +
      " スマートフォンやPCから、プログレスバーや直感的なスライダーを使って、わずか2〜3分で手軽に回答が完了します。\n\n" +
      "■ 特徴③：プライバシーへの配慮（高い回答率の確保）\n" +
      " 回答は統計的に処理され、上司や役員へ個人の回答が生データで開示されることはありません。従業員IDの入力も「任意（スキップ可能）」として心理的安全性を確保しています。",
      COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_ACCENT
    );

    // --- 4. スライド4：得られるアウトプット ---
    createStandardSlide(presentation, "得られるアウトプット（個人向け・組織向け）", 
      "■ 1. 従業員向け：個人健康診断レポート\n" +
      " ・損失の見える化: 主症状による個別損失額と、全体パフォーマンス低下による損失額を算出。\n" +
      " ・改善アドバイス: 回答内容に基づき、環境改善や専門家ケア（整体、カウンセリング等）を自動レコメンド。\n\n" +
      "■ 2. 人事・経営者向け：組織集計ダッシュボード\n" +
      " ・リアルタイム連動: 従業員の回答が即座にダッシュボードに反映（デモデータではありません）。\n" +
      " ・部署別分析: どの部署にどれくらいの損失コスト（％）が発生しているかをグラフで一目で把握。\n" +
      " ・環境改善要望の集計: 「椅子が合わない」「照明が反射する」などの従業員のリアルな要望をテキスト集計。",
      COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_ACCENT
    );

    // --- 5. スライド5：無料モニター特典 ---
    createStandardSlide(presentation, "無料モニター企業様への3大特典", 
      "実証実験（モニター）期間中、以下のサポートを完全無料で提供いたします。\n\n" +
      "① 「組織健康診断レポート」の無料作成・贈呈\n" +
      " 通常のコンサルティングで提供される、組織全体の健康リスク・損失額をまとめた分析報告書を無料で作成します。\n\n" +
      "② エルゴノミクス（作業環境）投資の最適化アドバイス\n" +
      " 従業員が求めている具体的なオフィス改善要望（机、椅子、照明等）を集計し、優先すべき環境投資をアドバイスします。\n\n" +
      "③ 課題に合わせた専門家介入（改善施策）のロードマップ提案\n" +
      " 分析で明らかになった最大のリスクに対し、どのような外部支援（ストレッチ指導、睡眠改善等）を行うべきか、ROI（投資対効果）を意識したロードマップを提案します。",
      COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_ACCENT
    );

    // --- 6. スライド6：スケジュール ---
    createStandardSlide(presentation, "実施スケジュール（導入からレポート提出まで）", 
      "■ ステップ1：準備・キックオフ（1週間）\n" +
      " 貴社専用の回答URLの発行、社内告知用テキスト（メールひな形）の提供。\n\n" +
      "■ ステップ2：アンケートの実施（1〜2週間）\n" +
      " 従業員様へURLを配信。スマホやPCから2〜3分で回答していただきます。（回収率70%以上を目指します）\n\n" +
      "■ ステップ3：ダッシュボード確認 ＆ 診断（即時）\n" +
      " 回答が完了した時点で、ダッシュボードにてリアルタイムの集計数値を確認できます。\n\n" +
      "■ ステップ4：分析レポートのご提出（実施後1週間）\n" +
      " 弊社より、分析結果に基づいた「健康経営診断報告書」を提出し、改善のご提案を行います。",
      COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_ACCENT
    );

    // ドライブに作成されたスライドのURLをログ出力
    Logger.log("✅ スライドの作成に成功しました！");
    Logger.log("スライドのURL: " + presentation.getUrl());

    // スプレッドシートから開かれたGAS（コンテナバインド）の場合のみ、画面上にアラートを表示
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        ui.alert(
          "🎉 スライドの自動作成が完了しました！\n\n" +
          "Googleドライブ（マイドライブ）のトップに「【提案書】健康経営プレゼンティーズム調査モニター募集」というGoogleスライドが作成されましたので、ご確認ください。\n\n" +
          "スライドのURL:\n" + presentation.getUrl()
        );
      }
    } catch (uiError) {
      // スプレッドシートに紐づいていない「スタンドアロンGAS」の場合は、この処理をスキップします
    }

  } catch (e) {
    Logger.log("⚠️ エラーが発生しました: " + e.toString());
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        ui.alert("⚠️ エラーが発生しました:\n" + e.toString());
      }
    } catch (uiError) {
      // UIが使えない場合はログのみ
    }
  }
}

/**
 * 背景色を設定する補助関数（バグ修正版）
 */
function applyBackground(slide, colorHex) {
  // スライドの標準サイズ 16:9 (960 x 540 ピクセル) の四角形を作成
  const bgShape = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, 960, 540);
  // 枠線を透明にする
  bgShape.getBorder().setTransparent();
  // 塗りつぶし色をセット（正しいAPI名：setSolidColor ではなく setSolidFill を使用）
  bgShape.getFill().setSolidFill(colorHex);
  // 四角形をスライドの最背面に送る
  bgShape.sendToBack();
}

/**
 * 標準スライドを作成する補助関数
 */
function createStandardSlide(presentation, title, bodyText, colorBg, colorText, colorMuted, colorAccent) {
  const slide = presentation.appendSlide();
  applyBackground(slide, colorBg);
  
  // タイトルテキストボックスの作成
  const titleBox = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 40, 860, 60);
  titleBox.getBorder().setTransparent();
  titleBox.getFill().setTransparent();
  const titleRange = titleBox.getText();
  titleRange.setText(title);
  titleRange.getStyle().setFontFamily("Arial").setFontSize(28).setFontColor(colorAccent).setBold(true);
  
  // 本文テキストボックスの作成
  const bodyBox = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 120, 860, 360);
  bodyBox.getBorder().setTransparent();
  bodyBox.getFill().setTransparent();
  const bodyRange = bodyBox.getText();
  bodyRange.setText(bodyText);
  bodyRange.getStyle().setFontFamily("Arial").setFontSize(15).setFontColor(colorText);
  
  // 本文の装飾（見出し等の「■」などの段落の色をアクセントカラーにする）
  const paragraphs = bodyRange.getParagraphs();
  paragraphs.forEach(p => {
    const textRange = p.getRange();
    const text = textRange.asString();
    const style = textRange.getStyle();
    
    if (text.indexOf("■") === 0 || text.indexOf("①") === 0 || text.indexOf("②") === 0 || text.indexOf("③") === 0) {
      style.setFontColor(colorAccent).setBold(true);
    } else if (text.trim().indexOf("・") === 0) {
      style.setFontColor(colorText);
    } else {
      style.setFontColor(colorMuted);
    }
  });
}
