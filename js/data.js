// 永豐 AI 對練 — 內容資料
// 示範資料依信貸電銷（複訪／議價）與客服話務（銀行／信用卡）兩份業務需求重寫；正式版不內建場景，皆由系統設定建立。
'use strict';

export const CAT_LIST = [
    {id:'all', label:'全部場景'}, {id:'credit', label:'信貸電銷'}, {id:'service', label:'客服話務'},
  ];

export const SCENARIOS = (() => {
const I = {
      coin:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="#D81E26" stroke-width="1.8"/><path d="M12 7v10M9.3 9.2c0-1 1.2-1.6 2.7-1.6s2.7.6 2.7 1.6-1 1.5-2.7 1.7c-1.7.2-2.7.7-2.7 1.7s1.2 1.6 2.7 1.6 2.7-.6 2.7-1.6" stroke="#D81E26" stroke-width="1.6" stroke-linecap="round"/></svg>',
      card:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2.4" stroke="#2D6CC0" stroke-width="1.8"/><path d="M3 10h18M6.5 14.5h4" stroke="#2D6CC0" stroke-width="1.8" stroke-linecap="round"/></svg>',
      shield:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 2.5v5.6c0 4.4-3 7.6-7 9.4-4-1.8-7-5-7-9.4V5.5L12 3z" stroke="#009E96" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12l2 2 4-4.2" stroke="#009E96" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      chat:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4V7a2 2 0 012-2z" stroke="#E0882E" stroke-width="1.8" stroke-linejoin="round"/></svg>',
      user:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.6" stroke="#6A5BC4" stroke-width="1.8"/><path d="M5.5 19.5a6.5 6.5 0 0113 0" stroke="#6A5BC4" stroke-width="1.8" stroke-linecap="round"/></svg>',
      umbrella:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3v2m0 0c-4.5 0-8 3-8 7h16c0-4-3.5-7-8-7zM12 12v6.5a2.2 2.2 0 01-4.4 0" stroke="#1F8FA0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    return [
      { id:'credit-revisit', cat:'credit', catCn:'信貸電銷 · Telesales', cn:'複訪（促成進件）', en:'Loan Follow-up Call', icon:I.card, tint:'#E4ECF7', c1:'#5C95D6', c2:'#2D6CC0', tag:'複訪', tagKind:'blue',
        desc:'客戶曾留資料或表達興趣但未送件；化解疑慮、補齊搜身資訊、促成進件。', duration:'3–8′', sessions:'真實場景', diffs:['L1','L2','L3'],
        youRole:{cn:'電銷專員', en:'Telesales Agent'},
        personas:[
          {id:'a1', name:'複訪 A1 · 上班族拖延 李先生', en:'Procrastinating Office Worker', init:'李', col:'#E0882E', risk:'受薪階級 · 年收入 80 萬', mood:'客氣、反覆拖延', temper:'35 歲上班族，國語。前次已留資料未送件，慣用「我再想想」「你 LINE 給我就好」。缺口：首通僅取得年收入，未問房貸與信用卡循環。', diff:'L2'},
          {id:'a2', name:'複訪 A2 · 台語疑似詐騙 陳先生', en:'Suspicious Senior Business Owner', init:'陳', col:'#D81E26', risk:'自營商 · 中高齡', mood:'高度懷疑、須家人參與', temper:'58 歲自營商，台語。懷疑來電是詐騙、要打去總行問，決策須與兒子討論。缺口：記得利率 2.6%，誤以為是保證核准條件。', diff:'L3'},
        ] },
      { id:'credit-bargain', cat:'credit', catCn:'信貸電銷 · Telesales', cn:'議價（守住定價、保住案件）', en:'Loan Pricing Negotiation', icon:I.coin, tint:'#FCE7E6', c1:'#EE6A60', c2:'#D81E26', tag:'議價', tagKind:'red',
        desc:'客戶已進件或核准但對利率、額度、費用不滿；在定價政策內說服接受並促成撥款。', duration:'3–8′', sessions:'真實場景', diffs:['L1','L2','L3'],
        youRole:{cn:'電銷專員', en:'Telesales Agent'},
        personas:[
          {id:'b1', name:'議價 B1 · 精算比價 林小姐', en:'Rate Comparison Shopper', init:'林', col:'#2D6CC0', risk:'已核准 80 萬 · 他行 2.5%', mood:'理性、逐項比對', temper:'32 歲，國語。手上有他行核准條件，逐項比對利率、開辦費與違約金。缺口：兩週內換工作年資歸零，尚未告知。', diff:'L2'},
          {id:'b2', name:'議價 B2 · 情緒施壓 王先生', en:'Pressuring Long-time Customer', init:'王', col:'#D81E26', risk:'往來 12 年 · 薪轉戶', mood:'施壓、威脅撤件', temper:'45 歲，台語國語混用。以往來年資與客訴威脅要求讓利，要求「幫我跟主管喬」。缺口：期間新增一張信用卡，負債比變動。', diff:'L3'},
        ] },
      { id:'cs-bank', cat:'service', catCn:'客服話務 · Service', cn:'銀行話務', en:'Banking Service Call', icon:I.chat, tint:'#FFF4E8', c1:'#F0A34A', c2:'#E0882E', tag:'話務', tagKind:'orange',
        desc:'網銀登入、轉帳限額、拒訪登記等銀行話務；一支 Agent 依意圖識別路由話務。', duration:'5–8′', sessions:'真實場景', diffs:['normal','complaint'],
        youRole:{cn:'客服專員', en:'Customer Service Specialist'},
        personas:[
          {id:'c1', name:'高齡客戶 · 何爺爺', en:'Senior Customer', init:'何', col:'#009E96', risk:'網銀登入 · 高齡', mood:'聽不懂術語、需多次說明', temper:'78 歲。網路銀行登不進去，不熟悉驗證碼與 OTP，需要白話、分步驟、多次說明。', diff:'normal'},
          {id:'c2', name:'咆哮取消電銷 · 黃先生', en:'Furious Do-not-call Request', init:'黃', col:'#D81E26', risk:'拒訪登記 · 不配合核身', mood:'憤怒、咆哮', temper:'來電要求取消電話行銷並列入拒訪，不願配合核身，提及要向金管會申訴。', diff:'complaint'},
        ] },
      { id:'cs-card', cat:'service', catCn:'客服話務 · Service', cn:'信用卡話務', en:'Credit Card Service Call', icon:I.user, tint:'#E9E6F6', c1:'#9485D2', c2:'#6A5BC4', tag:'話務', tagKind:'purple',
        desc:'臨時額度調整、帳單與年費、分期手續費等信用卡話務。', duration:'5–8′', sessions:'真實場景', diffs:['normal','complaint'],
        youRole:{cn:'客服專員', en:'Customer Service Specialist'},
        personas:[
          {id:'d1', name:'臨調額度 · 陳大明先生', en:'Temporary Limit Request', init:'陳', col:'#D81E26', risk:'刷卡失敗 · 櫃檯前', mood:'焦慮、激動', temper:'25 歲，人在櫃檯刷不過，描述不清，需用封閉式問題收斂並管理期待。', diff:'complaint'},
          {id:'d2', name:'帳單疑問 · 林小芬小姐', en:'Statement Inquiry', init:'林', col:'#009E96', risk:'年費 · 分期手續費', mood:'謹慎、重複確認', temper:'50 歲。詢問年費為何入帳、分期手續費怎麼算，會重複確認細節。', diff:'normal'},
        ] },
    ];
})();

export const TRANSCRIPTS = {
      'credit-revisit':[
        {who:'cust', t:'喂？喔…是上次那個貸款的喔。我最近比較忙，你資料 LINE 給我就好。', emo:40, tip:'開場合規：先自報行別、姓名與員編，喚起前次接觸記憶並說明本次來電目的。'},
        {who:'agent', t:'李先生您好，我是永豐銀行信貸部專員林婉清，員編 6412。上週您留了資料說想了解結婚的資金方案，今天想用三分鐘幫您確認幾個條件，方便嗎？', emo:44},
        {who:'cust', t:'條件上次不是講過了？我再想想啦，不急。', emo:36, tip:'拖延推託：不要只回「好」，點出前次未完成的事項，給客戶一個現在談的理由。', flag:'risk'},
        {who:'agent', t:'上次只確認了您年收 80 萬，還沒問到房貸和信用卡循環，這會直接影響利率試算。先補齊，您再決定要不要送，可以嗎？', emo:46},
        {who:'cust', t:'房貸沒有，信用卡有在用循環，大概十幾萬吧。這樣是不是就過不了？', emo:42, tip:'搜身資訊：據實記錄負債狀況，不淡化也不嚇客戶，說明會如何影響核定。'},
        {who:'agent', t:'不會因為有循環就不能辦，但會納入負債比計算。以您目前狀況，利率比較可能落在 3% 到 4% 之間，不是廣告上的最低 2.68%。', emo:50},
        {who:'cust', t:'那你們利率跟別家差不多嘛，我幹嘛要跟你辦？', emo:38, tip:'異議處理：不貶低同業，用撥款時程與整合方案回應比價。'},
        {who:'agent', t:'您十月結婚要用錢，我們文件齊全 3 到 5 個工作天撥款，而且可以把信用卡循環一起整合，每月利息會比現在低。', emo:56},
        {who:'cust', t:'聯徵一查我信用會不會變差？我朋友說查多了會被拒。', emo:48, tip:'合規紅線：須告知線上申請會進行聯徵查詢，並據實說明查詢紀錄的影響。', flag:'compliance'},
        {who:'agent', t:'送件時本行會查詢聯徵，會留下一筆紀錄，但正常申辦不等於信用瑕疵，這點我必須據實告訴您。核准與否由本行保留決定權。', emo:60},
        {who:'cust', t:'好啦，那要準備什麼？你先幫我算月付金我看看。', emo:72, tip:'成交訊號：立即提供試算與文件清單，複述關鍵條件並約定送件時間。', flag:'win'},
        {who:'agent', t:'好的，我現在把試算表和應備文件傳到您手機：身分證、勞保明細、近三個月薪轉。80 萬、84 期，月付約 1.1 萬，利率依核定。明天下午我再跟您確認送件。', emo:80},
      ],

      'credit-bargain':[
        {who:'cust', t:'你們核給我 80 萬、利率 3.8%，可是○○銀行給我 2.5%，差太多了，我不想撥了。', emo:36, tip:'開場與現況確認：先確認案件狀態與客戶比較的對象，不急著讓步。'},
        {who:'agent', t:'林小姐您好，我是永豐銀行林婉清。您的案件已核准 80 萬、84 期，利率 3.8%。方便跟我說一下○○銀行的 2.5% 是前幾期的優惠利率，還是全期利率嗎？', emo:42},
        {who:'cust', t:'他們說前 3 期 2.5%，之後 3.99%。然後他們免開辦費，你們還收 5,000。', emo:40, tip:'價值說明：把對方條件換算成總費用年百分率與總利息，用同一基準比較。'},
        {who:'agent', t:'以 84 期攤還試算，對方前 3 期優惠後全期約 3.95%，加上我們的開辦費後，本行總費用年百分率約 3.93%，兩邊其實很接近，我可以把試算表傳給您。', emo:50},
        {who:'cust', t:'那利率不能降，開辦費總可以免吧？不然期數拉長，利息才會少。', emo:44, tip:'逐項殺價：區分可議與不可議項目，依權限給替代方案，不做越權承諾。', flag:'risk'},
        {who:'agent', t:'開辦費是定價政策的一部分，我沒有權限直接免除。但我可以為您申請薪轉戶方案，若把薪轉轉到本行，利率可再調降 0.2%。', emo:54},
        {who:'cust', t:'薪轉…我其實兩個禮拜前剛換工作，年資要重新算，這樣會不會影響？', emo:46, tip:'客戶條件已變動：據實告知須重新評估，不可為保住案件隱匿不報。', flag:'compliance'},
        {who:'agent', t:'謝謝您主動告知。換工作會影響年資條件，依規定我必須請審核單位重新評估，核准與否由本行保留決定權，我不會替您隱瞞這項資訊。', emo:52},
        {who:'cust', t:'那重新評估會不會核更差？我乾脆去別家算了。', emo:40, tip:'威脅撤件：接住情緒、說明時程與最壞情況，給客戶等待的理由。'},
        {who:'agent', t:'我理解您的擔心。重新評估約 1 到 2 個工作天，新工作有勞保投保紀錄就能認列；我會同步把薪轉方案掛上去，讓您看到完整條件再決定。', emo:58},
        {who:'cust', t:'好吧，那你先幫我重新送，結果出來再說。', emo:70, tip:'促成撥款：複述條件與下一步，約定回覆時間。', flag:'win'},
        {who:'agent', t:'好的。為您複述：80 萬、84 期，利率依重新核定，薪轉方案可再降 0.2%，開辦費 5,000 維持，提前清償不收違約金。後天下午前我回覆您結果。', emo:78},
      ],

      'cs-bank':[
        {who:'cust', t:'小姐啊，我那個網路銀行怎麼都進不去，它一直說什麼密碼錯誤。', emo:44, tip:'開場與核身：自報單位與姓名，用白話完成身分核對，語速放慢。'},
        {who:'agent', t:'何爺爺您好，我是永豐銀行客服林婉清。我慢慢陪您處理，先跟您核對一下身分證字號後四碼和出生年月日好嗎？', emo:50},
        {who:'cust', t:'好好好…後四碼是 3 2 1 8。我兒子幫我設的密碼我也忘了。', emo:42, tip:'問題釐清：先確認是登入密碼還是交易密碼，避免一次給太多步驟。'},
        {who:'agent', t:'謝謝爺爺。我們一步一步來，現在卡住的是登入時那組密碼對不對？不是轉帳時用的那組？', emo:54},
        {who:'cust', t:'對對，就是一開始要輸入的那個。', emo:56},
        {who:'agent', t:'好，那我幫您用「忘記密碼」重設。等一下您手機會收到一組六個數字的簡訊驗證碼，您輸入在手機畫面就好，不用告訴我。', emo:62, tip:'合規與防詐：驗證碼不得由客服索取，須主動提醒客戶不告訴任何人。', flag:'compliance'},
        {who:'cust', t:'啊？那個號碼不是要跟你講嗎？我怕我按錯。', emo:50, tip:'高齡客戶：重複、白話、分步驟說明，確認每一步客戶都跟上。'},
        {who:'agent', t:'不用跟我講喔，那是保護您的錢的。您看手機畫面上有六個格子，收到簡訊後把六個數字依序填進去，填好跟我說一聲就好。', emo:64},
        {who:'cust', t:'喔…填好了，它叫我設新密碼。要幾個字？', emo:62},
        {who:'agent', t:'要八到十二個字，英文和數字都要有。您可以用自己記得住的，設好之後請記在安全的地方，不要寫在卡片上。', emo:70, tip:'效率與完整：確認完成後主動補充安全提醒，不拖長通話。'},
        {who:'cust', t:'好了好了，進去了！謝謝你啊小姐，講得很清楚。', emo:80, tip:'收尾：確認問題解決、提供後續協助管道，確認客戶沒有其他問題。', flag:'win'},
        {who:'agent', t:'太好了爺爺。之後如果又進不去，直接打客服專線按 2 找我們就好。還有沒有其他需要幫忙的地方？', emo:84},
      ],

      'cs-card':[
        {who:'cust', t:'我刷不過啦！你們是不是把我的卡鎖了？我人就站在櫃檯前面欸。', emo:28, tip:'情緒優先：先安撫再查詢，不要一開口就要求提供一長串資料。'},
        {who:'agent', t:'陳先生別著急，我馬上幫您查。方便先跟我確認您身分證字號的後四碼嗎？', emo:34},
        {who:'cust', t:'就是不能刷啊，我哪知道什麼原因，你們系統爛掉了吧。', emo:26, tip:'客戶描述不清：用封閉式問題收斂，先確認金額與時間點。', flag:'risk'},
        {who:'agent', t:'我了解您現在很急。已經查到了，這筆金額超過您目前的信用額度，不是卡片被鎖，卡片狀態正常。', emo:40},
        {who:'cust', t:'那你幫我調高啊，現在馬上。', emo:38, tip:'期待管理：說明臨調的審核條件與時間，不要給不確定的承諾。'},
        {who:'agent', t:'臨時調高額度可以立即送件，系統審核大約 10 到 15 分鐘。我先幫您送出，但核准與否會依您的往來狀況由系統判定。', emo:46},
        {who:'cust', t:'十五分鐘？我這樣站在這裡很尷尬欸。', emo:42, tip:'提供替代方案：讓客戶當下有事情可做，而不是只能等。'},
        {who:'agent', t:'我理解。如果您急著結帳，可以先用其他方式付款；臨調核准後我會發簡訊通知您，額度會保留到本期結帳日。', emo:56},
        {who:'cust', t:'那我這次調高，下個月帳單會不會一次爆掉？', emo:62, tip:'主動揭露：說明臨調的有效期間與回復原額度的時點。', flag:'compliance'},
        {who:'agent', t:'臨調額度只到本期帳單結帳日，之後自動回復原額度，也不會改變您最低應繳金額的計算方式。', emo:70},
        {who:'cust', t:'好啦，那你幫我送出，麻煩你了。', emo:76, tip:'收尾：確認已送出、告知通知方式，並留下後續追蹤管道。', flag:'win'},
        {who:'agent', t:'已經幫您送出了。核准結果會以簡訊通知，若十五分鐘後還沒收到，歡迎再撥進來由我為您追蹤。', emo:80},
      ],
    };

export const REPORT_CONTENT = {
      'credit-revisit':{dims:[{cn:'搜身資訊',en:'Info Gathering',score:82,note:'補齊房貸與循環資訊，據實記錄負債狀況'},{cn:'銷售堅持',en:'Persistence',score:85,note:'客戶拖延時仍給出現在談的理由'},{cn:'需求挖掘',en:'Needs Discovery',score:80,note:'抓住結婚時程，但未確認其他資金來源'},{cn:'異議處理',en:'Objection Handling',score:84,note:'比價時以撥款時程與整合方案回應'}], strengths:['開場即喚起前次接觸記憶並說明來意，客戶沒有直接掛斷。','客戶表示有信用卡循環時據實說明對負債比的影響，沒有淡化。','主動告知聯徵查詢與核准保留權，法遵 14 項全數符合。'], improves:['客戶第一次說「我再想想」時回應略慢，可更早點出前次未完成事項。','未確認客戶是否有其他負債或保人需求，搜身資訊仍有缺口。','月付金試算可當場口頭給區間，不必等傳送試算表。']},
      'credit-bargain':{dims:[{cn:'搜身資訊',en:'Info Gathering',score:88,note:'客戶透露換工作時立即納入評估（選評）'},{cn:'銷售堅持',en:'Persistence',score:86,note:'面對撤件威脅維持守價不讓步'},{cn:'需求挖掘',en:'Needs Discovery',score:78,note:'未追問客戶對期數與月付金的真實偏好'},{cn:'異議處理',en:'Objection Handling',score:90,note:'以總費用年百分率同基準比較，化解比價'}], strengths:['把對方前 3 期優惠利率換算成全期與總費用年百分率，用同一基準比較，說服力強。','開辦費堅持不越權免除，改以薪轉方案提出替代，守住定價政策。','客戶換工作時據實告知須重新評估，沒有為保住案件隱匿。'], improves:['客戶提「期數拉長」時未展開討論，錯過了解客戶月付金承受度的機會。','重新評估的最壞情況（利率可能上調）應更明確告知，避免後續期待落差。','可補充提前清償規則與綁約期選擇，完整揭露條件。']},
      'cs-bank':{dims:[{cn:'開場與核身',en:'Opening & ID Check',score:92,note:'白話完成核身，語速合宜'},{cn:'問題釐清',en:'Clarification',score:90,note:'先區分登入密碼與交易密碼'},{cn:'解決方案正確性',en:'Resolution',score:88,note:'重設流程正確，密碼規則說明完整'},{cn:'服務態度與同理',en:'Empathy',score:94,note:'全程耐心，重複說明未急躁'},{cn:'效率',en:'Efficiency',score:84,note:'通話 6 分 12 秒，略高於話務目標'}], strengths:['客戶問「驗證碼要不要跟你講」時立即明確否定並說明原因，防詐宣導到位。','每一步都用畫面上的具體物件（六個格子）引導，高齡客戶能跟上。','收尾確認問題解決並告知後續專線，沒有其他未決事項。'], improves:['核身可一次問完兩個項目，減少來回。','可補充行動銀行遺失或換機的處理方式，高齡客戶最常再來電。','通話時長略長，可在客戶設定新密碼時同步說明安全提醒。']},
      'cs-card':{dims:[{cn:'開場與核身',en:'Opening & ID Check',score:86,note:'先安撫再核身，順序正確'},{cn:'問題釐清',en:'Clarification',score:84,note:'客戶描述不清時收斂略慢'},{cn:'解決方案正確性',en:'Resolution',score:88,note:'正確判讀為額度不足而非卡片鎖定'},{cn:'服務態度與同理',en:'Empathy',score:86,note:'面對指責系統的情緒未被激化'},{cn:'效率',en:'Efficiency',score:85,note:'通話 5 分 20 秒，符合話務目標'}], strengths:['客戶情緒高張時先安撫再查詢，沒有一開口就索取一長串資料。','快速釐清是額度不足而非卡片異常，直接消除客戶最大的誤解。','主動提供「先用其他方式付款」的替代方案，解決當下的尷尬處境。'], improves:['客戶連續兩次描述不清時，應更早改用封閉式問題收斂。','未主動說明臨調可能不核准的情形，期待管理仍有缺口。','可補充查詢臨調結果的自助管道，減少客戶再次來電。']},
    };

export const OVERALL_DIMS = [
    {cn:'搜身資訊', en:'Info Gathering', score:82, note:'補齊房貸與循環資訊，據實記錄負債狀況'},
    {cn:'銷售堅持', en:'Persistence', score:85, note:'客戶拖延時仍給出現在談的理由'},
    {cn:'需求挖掘', en:'Needs Discovery', score:80, note:'抓住結婚時程，但未確認其他資金來源'},
    {cn:'異議處理', en:'Objection Handling', score:84, note:'比價時以撥款時程與整合方案回應'},
  ];

export const ANALYTICS = {
      kpis:[
        {cn:'累計對練', en:'Total Drills', val:'42', sub:'本月 +12', up:true},
        {cn:'平均得分', en:'Avg Score', val:'87.4', sub:'較上月 +3.1', up:true},
        {cn:'練習時長', en:'Hours', val:'9.6h', sub:'本月 +2.4h', up:true},
        {cn:'達標率', en:'Pass Rate', val:'83%', sub:'目標 85%', up:false},
      ],
      trend:[{l:'第1週',v:72},{l:'第2週',v:75},{l:'第3週',v:79},{l:'第4週',v:78},{l:'第5週',v:84},{l:'第6週',v:86},{l:'第7週',v:85},{l:'第8週',v:90}],
      dist:[
        {cn:'複訪', n:14, col:'#2D6CC0'},
        {cn:'議價', n:9, col:'#D81E26'},
        {cn:'銀行話務', n:8, col:'#E0882E'},
        {cn:'信用卡話務', n:6, col:'#6A5BC4'},
      ],
      board:[
        {rank:1, name:'鄭思遠', dept:'財富管理中心', score:94.2},
        {rank:2, name:'林婉清', dept:'財富管理一部', score:91.8, me:true},
        {rank:3, name:'蘇曼', dept:'財富管理二部', score:90.5},
        {rank:4, name:'孔哲', dept:'分行通路', score:88.1},
        {rank:5, name:'范小美', dept:'電話金融', score:86.7},
      ],
      recent:[
        {sc:'複訪（促成進件）', pe:'複訪 A1 · 上班族拖延 李先生', df:'L2', score:86, date:'今天 14:32', dur:'6′12″'},
        {sc:'議價（守住定價、保住案件）', pe:'議價 B1 · 精算比價 林小姐', df:'L2', score:84, date:'今天 11:05', dur:'7′40″'},
        {sc:'銀行話務', pe:'咆哮取消電銷 · 黃先生', df:'complaint', score:79, date:'昨天 16:48', dur:'5′55″'},
        {sc:'信用卡話務', pe:'臨調額度 · 陳大明先生', df:'complaint', score:85, date:'昨天 10:20', dur:'5′20″'},
        {sc:'銀行話務', pe:'高齡客戶 · 何爺爺', df:'normal', score:90, date:'09-28', dur:'6′12″'},
      ],
    };
