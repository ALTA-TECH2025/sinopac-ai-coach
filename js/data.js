// 永豐 AI 對練 — 內容資料
// 場景、客戶畫像、逐字稿、複盤內容沿用 v1.0.3 原型，未更動文案。
'use strict';

export const CAT_LIST = [
    {id:'all', label:'全部場景'}, {id:'advisory', label:'理財顧問'}, {id:'collection', label:'信貸催收'},
    {id:'risk', label:'風控防詐'}, {id:'service', label:'客戶服務'},
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
      { id:'loan-sales-sim', cat:'credit', catCn:'信貸業務 · Credit', cn:'信貸-銷售模擬演練', en:'Loan Sales Simulation', icon:I.card, tint:'#E4ECF7', c1:'#5C95D6', c2:'#2D6CC0', tag:'真實場景', tagKind:'blue',
        desc:'依據客戶屬性與劇本難度，演練電話銷售。', duration:'8–12′', sessions:'真實場景',
        youRole:{cn:'信貸業務員', en:'Loan Officer'},
        personas:[
          {id:'p1', name:'本息攤 · 李大雄先生', en:'Installment Loan Prospect', init:'李', col:'#D81E26', risk:'受薪階級 · 年收入80萬', mood:'激動，多疑', temper:'40歲，受薪階級（非優質企業）職員，因結婚有資金需求，本行信貸新戶。拒絕理由：暫無明確拒絕理由。', diff:'hard'},
          {id:'p2', name:'本息攤 · 林小芬小姐', en:'Installment Loan Prospect', init:'林', col:'#E0882E', risk:'受薪階級 · 年收入50萬', mood:'平緩，冷淡', temper:'35歲，受薪階級（非優質企業）職員，因周轉金需求，本行信貸新戶。拒絕理由：審核速度太慢，其他銀行最快隔天即可撥款；情境：領現有報所得稅、健保投保最低。', diff:'medium'},
        ] },
      { id:'customer-service-sim', cat:'service', catCn:'客戶服務 · Service', cn:'客戶服務模擬演練', en:'Customer Service Simulation', icon:I.chat, tint:'#FFF4E8', c1:'#F0A34A', c2:'#E0882E', tag:'真實場景', tagKind:'orange',
        desc:'依據客戶屬性與話務場景，化解情緒並完成客戶諮詢服務。', duration:'6–10′', sessions:'真實場景',
        youRole:{cn:'客服專員', en:'Customer Service Specialist'},
        personas:[
          {id:'p1', name:'臨調 · 陳大明先生', en:'Temporary Limit Inquiry', init:'陳', col:'#D81E26', risk:'高情緒', mood:'焦慮、激動', temper:'25歲，配合度：描述不清，需要技巧引導。', diff:'hard'},
          {id:'p2', name:'臨調 · 林小芬小姐', en:'Temporary Limit Inquiry', init:'林', col:'#009E96', risk:'低情緒', mood:'敷衍、找藉口', temper:'50歲，配合度：謹慎，重複確認細節。', diff:'medium'},
        ] },
      { id:'wealth', cat:'advisory', catCn:'理財顧問 · Advisory', cn:'理財商品推薦', en:'Wealth Advisory', icon:I.coin, tint:'#FCE7E6', c1:'#EE6A60', c2:'#D81E26', tag:'高頻', tagKind:'red',
        desc:'依據客戶風險屬性推薦合適的理財商品，兼顧報酬說明與合規告知。', duration:'8–12′', sessions:'1,240',
        youRole:{cn:'理財專員', en:'Wealth Advisor'},
        personas:[
          {id:'p1', name:'退休教師 · 王女士', en:'Conservative Retiree', init:'王', col:'#009E96', risk:'保守型 RR2', mood:'謹慎、重視本金安全', temper:'反覆確認風險，對「虧損」二字敏感。', diff:'medium'},
          {id:'p2', name:'科技新貴 · 陳先生', en:'Aggressive Young Investor', init:'陳', col:'#D81E26', risk:'積極型 RR5', mood:'追求高報酬、缺乏耐心', temper:'頻繁打斷，質疑商品報酬率與你的專業度。', diff:'hard'},
          {id:'p3', name:'私行客戶 · 周總', en:'High-Net-Worth Client', init:'周', col:'#E0882E', risk:'平衡型 RR4', mood:'挑剔、資訊充分', temper:'比較同業商品，要求客製化方案與費率優惠。', diff:'hard'},
        ] },
      { id:'collection', cat:'collection', catCn:'信貸催收 · Collection', cn:'信用卡逾期催收', en:'Credit Card Collection', icon:I.card, tint:'#E4ECF7', c1:'#5C95D6', c2:'#2D6CC0', tag:'熱門', tagKind:'blue',
        desc:'對逾期客戶進行合規催收，化解抵觸情緒並達成還款方案。', duration:'6–10′', sessions:'2,108',
        youRole:{cn:'催收專員', en:'Collection Agent'},
        personas:[
          {id:'p1', name:'失業客戶 · 李先生', en:'Distressed Debtor', init:'李', col:'#D81E26', risk:'高情緒', mood:'焦慮、迴避', temper:'訴說困難、請求減免，情緒易激動。', diff:'hard'},
          {id:'p2', name:'拖延客戶 · 張女士', en:'Evasive Payer', init:'張', col:'#E0882E', risk:'中情緒', mood:'敷衍、找藉口', temper:'承諾還款卻反覆拖延，需要技巧引導。', diff:'medium'},
          {id:'p3', name:'配合客戶 · 趙先生', en:'Cooperative', init:'趙', col:'#009E96', risk:'低情緒', mood:'配合、忘記還款', temper:'態度良好，確認帳單後願意還款。', diff:'easy'},
        ] },
      { id:'antifraud', cat:'risk', catCn:'風控防詐 · Risk', cn:'大額轉帳核實', en:'Transfer Verification', icon:I.shield, tint:'#DCF0EE', c1:'#3CC0B4', c2:'#009E96', tag:'合規', tagKind:'teal',
        desc:'辨識潛在電信詐騙，引導客戶暫停可疑大額轉帳並核實身分。', duration:'5–8′', sessions:'864',
        youRole:{cn:'風控專員', en:'Risk Officer'},
        personas:[
          {id:'p1', name:'受騙客戶 · 孫阿姨', en:'Scam Victim', init:'孫', col:'#D81E26', risk:'高風險', mood:'急切、被操控', temper:'堅持轉帳、不願透露用途，抗拒勸阻。', diff:'hard'},
          {id:'p2', name:'真實交易 · 吳先生', en:'Legit Customer', init:'吳', col:'#2D6CC0', risk:'低風險', mood:'不耐煩', temper:'正常購屋付款，被核實感到被冒犯。', diff:'medium'},
          {id:'p3', name:'猶豫客戶 · 鄭女士', en:'Uncertain', init:'鄭', col:'#E0882E', risk:'中風險', mood:'半信半疑', temper:'已起疑心，需要你協助確認真偽。', diff:'easy'},
        ] },
      { id:'complaint', cat:'service', catCn:'客戶服務 · Service', cn:'客戶投訴處理', en:'Complaint Handling', icon:I.chat, tint:'#FAEBD9', c1:'#EBA85C', c2:'#E0882E', tag:'進階', tagKind:'amber',
        desc:'安撫不滿客戶，釐清訴求並在權限內提供補償方案、重建信任。', duration:'7–10′', sessions:'1,536',
        youRole:{cn:'客服專員', en:'Service Rep'},
        personas:[
          {id:'p1', name:'憤怒客戶 · 黃先生', en:'Furious Customer', init:'黃', col:'#D81E26', risk:'高情緒', mood:'被亂扣費、要投訴', temper:'語氣激烈、威脅向主管機關申訴，要求立即處理。', diff:'hard'},
          {id:'p2', name:'委屈客戶 · 劉女士', en:'Upset Customer', init:'劉', col:'#E0882E', risk:'中情緒', mood:'失望、被忽視', temper:'感到不被重視，需要被傾聽與真誠道歉。', diff:'medium'},
          {id:'p3', name:'理性客戶 · 錢先生', en:'Reasonable', init:'錢', col:'#2D6CC0', risk:'低情緒', mood:'就事論事', temper:'清楚陳述問題，期待合理解決方案。', diff:'easy'},
        ] },
      { id:'onboard', cat:'service', catCn:'客戶服務 · Service', cn:'新戶開戶引導', en:'Account Onboarding', icon:I.user, tint:'#E9E6F6', c1:'#9485D2', c2:'#6A5BC4', tag:'基礎', tagKind:'purple',
        desc:'引導新客戶完成開戶，說明商品權益並完成身分核驗與風險告知。', duration:'6–9′', sessions:'1,012',
        youRole:{cn:'臨櫃專員', en:'Onboarding Rep'},
        personas:[
          {id:'p1', name:'年長客戶 · 何爺爺', en:'Senior Newcomer', init:'何', col:'#E0882E', risk:'低數位素養', mood:'不熟悉流程', temper:'對行動銀行陌生，需要耐心多次說明。', diff:'medium'},
          {id:'p2', name:'忙碌客戶 · 馮女士', en:'Busy Professional', init:'馮', col:'#2D6CC0', risk:'時間敏感', mood:'趕時間', temper:'希望最快辦完，想略過商品介紹。', diff:'medium'},
          {id:'p3', name:'好奇客戶 · 沈同學', en:'Curious Student', init:'沈', col:'#009E96', risk:'問題多', mood:'第一次開戶', temper:'對每項費用與權益都追問細節。', diff:'easy'},
        ] },
      { id:'insurance', cat:'advisory', catCn:'理財顧問 · Advisory', cn:'保險商品介紹', en:'Insurance Advisory', icon:I.umbrella, tint:'#DEEFF1', c1:'#56B5C4', c2:'#1F8FA0', tag:'進階', tagKind:'cyan',
        desc:'結合家庭保障缺口介紹保險方案，完整說明條款、猶豫期與除外責任。', duration:'9–13′', sessions:'742',
        youRole:{cn:'保險顧問', en:'Insurance Advisor'},
        personas:[
          {id:'p1', name:'排斥客戶 · 譚先生', en:'Skeptical', init:'譚', col:'#D81E26', risk:'抵觸', mood:'反感推銷', temper:'認為保險是騙局，一開口就想掛斷。', diff:'hard'},
          {id:'p2', name:'新手父母 · 許女士', en:'New Parent', init:'許', col:'#009E96', risk:'有需求', mood:'關注孩子保障', temper:'有保障意識但預算有限，擔心買錯。', diff:'medium'},
          {id:'p3', name:'比價客戶 · 袁先生', en:'Comparison Shopper', init:'袁', col:'#E0882E', risk:'理性', mood:'已做功課', temper:'拿著競品條款逐條比較，問除外責任細節。', diff:'hard'},
        ] },
    ];
})();

const TRANSCRIPT_WEALTH = [
      {who:'cust', t:'喂，你好，我接到電話說有個什麼新的理財商品報酬挺高的？', emo:38, tip:'開場建立信任：先自報單位與員編，說明本次通話目的與時長。'},
      {who:'agent', t:'王女士您好，我是您的專屬理財專員林婉清，員編 8821。今天大約佔用您 5 分鐘，為您介紹一檔穩健型商品，可以嗎？', emo:46},
      {who:'cust', t:'穩健？上次你們推薦的基金我都虧了，現在一聽到理財我就緊張。', emo:30, tip:'客戶情緒下降：先同理再導正，不要急著反駁「虧損」。', flag:'risk'},
      {who:'agent', t:'非常理解您的顧慮，本金安全確實最重要。我今天推薦的並非基金，而是一檔 RR2 低風險商品，我們先看它的風險等級好嗎？', emo:44},
      {who:'cust', t:'那它到底保不保本？你直接說能不能保證不虧。', emo:35, tip:'合規紅線：不得承諾保本保息，須據實說明風險。', flag:'compliance'},
      {who:'agent', t:'依主管機關規定，理財商品不得承諾保本保息。不過這檔商品歷史年化約 3.2%，以高評級債券為主，波動很小，我把風險預告書傳給您參考。', emo:52},
      {who:'cust', t:'嗯…這樣聽起來好像還行。那期限呢？我錢可能急著用。', emo:58, tip:'發掘需求：確認資金靈活度偏好，匹配持有期限。'},
      {who:'agent', t:'您的資金靈活度很關鍵。這檔最短持有 90 天，到期自動贖回；如果您可能隨時要用，我也可以為您配置一部分活存。', emo:64},
      {who:'cust', t:'那你幫我看看，先放一小部分試試，多少錢起申購？', emo:72, tip:'成交訊號：客戶意願上升，明確最低申購金額並複述要點。', flag:'win'},
      {who:'agent', t:'1 萬元起申購，我建議先配置 5 萬元體驗。為您複述一下：RR2 風險、年化約 3.2%、持有 90 天、不保本但波動較低。確認無誤我就為您寄送電子合約。', emo:76},
      {who:'cust', t:'好，那就按你說的辦吧，麻煩你了。', emo:80, tip:'臨門一腳：完成風險告知與錄音存證提示，致謝並預約回訪。', flag:'win'},
      {who:'agent', t:'好的王女士，稍後會進行風險告知與全程錄音存證，請您配合確認。感謝信任，三個月後我再為您做一次資產檢視。', emo:82},
    ];

export const TRANSCRIPTS = {
      wealth: TRANSCRIPT_WEALTH,

      'loan-sales-sim':[
        {who:'cust', t:'你們哪裡拿到我電話的？我沒有申請什麼貸款。', emo:30, tip:'開場合規：先自報行別與姓名，說明資料來源與本次來電目的。'},
        {who:'agent', t:'李先生您好，我是永豐銀行信貸部專員，員編 6412。您先前在本行留有往來資料，今天想用兩分鐘為您說明一個資金方案，方便嗎？', emo:36},
        {who:'cust', t:'利率多少？你先講數字，不要繞。', emo:34, tip:'客戶直接要價：先給區間並說明個人化定價依據，不要拿最低標當承諾。'},
        {who:'agent', t:'本息攤還專案年利率 2.68% 起。實際適用利率會依您的年資、收入與聯徵狀況核定，我可以先幫您試算月付金。', emo:42},
        {who:'cust', t:'2.68% 是給誰的？我這種一般上班族根本拿不到吧。', emo:33, tip:'合規紅線：不得以最優惠利率誤導，須誠實說明適用條件。', flag:'compliance'},
        {who:'agent', t:'您說得對，最低利率有其適用條件。以您年收 80 萬、目前無其他信貸來看，較可能落在 3% 到 4% 之間，我不會給您做不到的承諾。', emo:48},
        {who:'cust', t:'我要 80 萬，辦下來要多久？我十月結婚就要用。', emo:58, tip:'發掘需求：確認金額、期數與撥款時程，對齊客戶的時間壓力。'},
        {who:'agent', t:'80 萬分 84 期，月付約 1.1 萬。文件齊全的話，送件到撥款大約 3 到 5 個工作天，十月前來得及。', emo:64},
        {who:'cust', t:'要準備什麼？查聯徵會不會影響我的信用？', emo:66, tip:'誠實揭露：聯徵查詢紀錄要據實說明，不要淡化。', flag:'risk'},
        {who:'agent', t:'身分證、勞保投保明細與近三個月薪轉。查詢聯徵會留下紀錄，但正常申辦不等於信用瑕疵，這點我必須據實告訴您。', emo:72},
        {who:'cust', t:'那你先幫我試算，我看看月付金能不能接受。', emo:78, tip:'成交訊號：立即提供試算與文件清單，並複述關鍵條件。', flag:'win'},
        {who:'agent', t:'好的，我現在發送試算表與應備文件到您手機。為您複述重點：80 萬、84 期、利率依核定、提前清償不收違約金。', emo:80},
      ],

      'customer-service-sim':[
        {who:'cust', t:'我刷不過啦！你們是不是把我的卡鎖了？我人就站在櫃檯前面欸。', emo:28, tip:'情緒優先：先安撫再查詢，不要一開口就要求提供一長串資料。'},
        {who:'agent', t:'陳先生別著急，我馬上幫您查。方便先跟我確認您身分證字號的後四碼嗎？', emo:34},
        {who:'cust', t:'就是不能刷啊，我哪知道什麼原因，你們系統爛掉了吧。', emo:26, tip:'客戶描述不清：用封閉式問題收斂，先確認金額與時間點。', flag:'risk'},
        {who:'agent', t:'我了解您現在很急。已經查到了，這筆金額超過您目前的信用額度，不是卡片被鎖，卡片狀態正常。', emo:40},
        {who:'cust', t:'那你幫我調高啊，現在馬上。', emo:38, tip:'期待管理：說明臨調的審核條件與時間，不要給不確定的承諾。'},
        {who:'agent', t:'臨時調高額度可以立即送件，系統審核大約 10 到 15 分鐘。我先幫您送出，但核准與否會依您的往來狀況由系統判定。', emo:46, },
        {who:'cust', t:'十五分鐘？我這樣站在這裡很尷尬欸。', emo:42, tip:'提供替代方案：讓客戶當下有事情可做，而不是只能等。'},
        {who:'agent', t:'我理解。如果您急著結帳，可以先用其他方式付款；臨調核准後我會發簡訊通知您，額度會保留到本期結帳日。', emo:56},
        {who:'cust', t:'那我這次調高，下個月帳單會不會一次爆掉？', emo:62, tip:'主動揭露：說明臨調的有效期間與回復原額度的時點。', flag:'compliance'},
        {who:'agent', t:'臨調額度只到本期帳單結帳日，之後自動回復原額度，也不會改變您最低應繳金額的計算方式。', emo:70},
        {who:'cust', t:'好啦，那你幫我送出，麻煩你了。', emo:76, tip:'收尾：確認已送出、告知通知方式，並留下後續追蹤管道。', flag:'win'},
        {who:'agent', t:'已經幫您送出了。核准結果會以簡訊通知，若十五分鐘後還沒收到，歡迎再撥進來由我為您追蹤。', emo:80},
      ],

      collection:[
        {who:'cust', t:'我知道帳單逾期了，但這兩天真的不方便處理。', emo:40, tip:'開場合規：表明單位與來電目的，全程不得使用恐嚇或不當言詞。'},
        {who:'agent', t:'張女士您好，我是永豐銀行客戶服務部專員。今天想與您確認一筆信用卡帳款的還款安排。', emo:46},
        {who:'cust', t:'你們不要一直打電話，我下週應該就會處理。', emo:36, tip:'避免空泛承諾：引導客戶說出具體日期與金額。', flag:'risk'},
        {who:'agent', t:'我們會依約定的時間再聯繫。為了避免影響您的信用紀錄，可以先確認一個您做得到的日期嗎？', emo:48},
        {who:'cust', t:'你們是不是要告我？我朋友說會被告。', emo:32, tip:'合規紅線：不得暗示訴訟或施加恐懼，應據實說明後續程序。', flag:'compliance'},
        {who:'agent', t:'目前沒有這件事。逾期會產生循環利息與違約金，並回報聯徵中心，這是我需要據實告知您的部分。', emo:50},
        {who:'cust', t:'下週三我可能只能先還一半。', emo:58, tip:'務實協商：接受部分還款，把剩餘金額安排成可執行的方案。'},
        {who:'agent', t:'可以。若下週三前入帳一半，我可以協助登記分期，剩餘金額分兩期，這樣每期負擔會比較平均。', emo:66},
        {who:'cust', t:'分期會不會又多算我利息？', emo:62, tip:'費用揭露：主動說明分期手續費與總費用年百分率。', flag:'compliance'},
        {who:'agent', t:'會有分期手續費。我把每期金額與總費用年百分率完整算給您聽，您確認可以接受我再送出。', emo:72},
        {who:'cust', t:'好，那就先還一半，剩下的分兩期。', emo:80, tip:'落地確認：發送書面還款計畫，並提示錄音存證。', flag:'win'},
        {who:'agent', t:'收到，我會發送還款計畫簡訊，請您確認後依約繳款。本次通話全程錄音存證，謝謝您的配合。', emo:84},
      ],

      antifraud:[
        {who:'cust', t:'我現在必須馬上轉八十萬過去，對方說再晚帳戶就會被凍結。', emo:30, tip:'攔阻優先：先降低急迫感取得對話空間，不要一開口就說「您被騙了」。'},
        {who:'agent', t:'孫阿姨，我先幫您確認這筆交易。可以請問對方是哪個單位、要求您轉到哪個帳戶嗎？', emo:34},
        {who:'cust', t:'他說是檢察官，案件不能外洩，我也不能跟家人講。', emo:28, tip:'典型話術：指出「禁止告知家人」正是詐騙特徵，而非案件保密。', flag:'risk'},
        {who:'agent', t:'我了解您很緊張。不過真正的司法機關不會要求私下轉帳，也不會禁止您向銀行或家人求證。', emo:40},
        {who:'cust', t:'可是他知道我的身分證和地址，還說不配合就會被抓。', emo:26, tip:'破除信任基礎：說明個資外洩很常見，知道資料不等於身分為真。', flag:'risk'},
        {who:'agent', t:'這些資料在外流的個資裡很常見，不能證明對方的身分。我們先暫停這筆交易，我陪您撥 165 反詐騙專線確認。', emo:44},
        {who:'cust', t:'那我如果不轉，錢真的不會被凍結嗎？', emo:52, tip:'正面回答疑慮：明確保證暫停轉帳不會導致帳戶受處分。'},
        {who:'agent', t:'不會。銀行不會因為您暫停轉帳而處分帳戶，您的資金目前是安全的。', emo:60},
        {who:'cust', t:'可是他等一下又會打來，我不知道怎麼講。', emo:58, tip:'降低後續風險：提供可執行的保護措施，而不只是勸阻。'},
        {who:'agent', t:'您可以不用接。我會為您建立疑似詐騙通報紀錄，並在帳戶加註臨時控管，對方無法從您這裡取得任何款項。', emo:70},
        {who:'cust', t:'好…那我先不要轉，我等一下打給我兒子。', emo:78, tip:'完成攔阻：安排後續關懷追蹤，確認客戶沒有再被聯繫上。', flag:'win'},
        {who:'agent', t:'這樣最好。我也會請分行同仁今天下午與您聯繫，確認狀況，您有任何疑問都可以直接找我。', emo:82},
      ],

      complaint:[
        {who:'cust', t:'你們又亂扣費，客服講法每次都不一樣，我今天一定要投訴。', emo:24, tip:'先致歉再查證：承接情緒，不要在客戶說完前急著解釋制度。'},
        {who:'agent', t:'黃先生，我先為造成您的困擾致歉。我會完整查明這筆扣款的來源，今天給您明確的處理結論。', emo:32},
        {who:'cust', t:'我不要再聽制式回答，你直接說能不能退。', emo:28, tip:'避免罐頭話術：改用具體動作與時間點回應。', flag:'risk'},
        {who:'agent', t:'我理解您希望立刻確認。我現在核對交易明細，若屬於誤扣，會立即為您申請退回。', emo:40},
        {who:'cust', t:'已經拖兩週了，再不處理我就去金管會申訴。', emo:26, tip:'合規紅線：不得阻擋或勸退客戶的申訴權利，應主動告知管道。', flag:'compliance'},
        {who:'agent', t:'您有權向主管機關申訴，這是您的權利。同時我會把案件升級為優先處理，今天十八點前回覆進度。', emo:44},
        {who:'cust', t:'那你把承諾寫下來，我要有紀錄。', emo:48, tip:'具體承諾：給出案件編號、處理時限與回覆窗口，讓客戶可以追蹤。'},
        {who:'agent', t:'可以。我會把案件編號、處理時限與回覆窗口發送到您的手機，方便您後續追蹤。', emo:58},
        {who:'cust', t:'那這次到底是什麼費用？講清楚。', emo:62, tip:'釐清根因：說明費用性質與觸發條件，並承認說明不足之處。'},
        {who:'agent', t:'是帳戶管理費。您上個月的平均餘額低於免收門檻，系統自動計收。這部分我們事前說明不夠清楚，我會為您申請退還。', emo:70},
        {who:'cust', t:'好，那我先看你們怎麼處理。', emo:76, tip:'重建信任：給出退費時程並承諾親自回電確認。', flag:'win'},
        {who:'agent', t:'謝謝您給我們處理的機會。退費會在三個工作天內入帳，我也會親自回電向您確認。', emo:80},
      ],

      onboard:[
        {who:'cust', t:'我第一次辦這個行動銀行，密碼跟憑證我有點搞不清楚。', emo:48, tip:'步驟拆解：一次只講一個動作，確認完成再進下一步。'},
        {who:'agent', t:'何爺爺沒關係，我一步一步帶您完成。我們先確認身分證件跟您的手機號碼就好。', emo:56},
        {who:'cust', t:'這個驗證碼是不是要告訴你？', emo:44, tip:'防詐宣導：明確告知驗證碼不得提供給任何人，包含銀行行員。', flag:'compliance'},
        {who:'agent', t:'不用，千萬不要告訴任何人，包括銀行行員。驗證碼只輸入在您自己的手機畫面上，這是保護帳戶最重要的一條原則。', emo:62},
        {who:'cust', t:'那我以後要轉帳，是不是也用這個 App？', emo:66, tip:'順勢教學：把客戶的疑問接到常用功能設定上。'},
        {who:'agent', t:'是的。我會幫您把常用功能設定好，也會把每日轉帳限額調整到您實際用得到的範圍。', emo:72},
        {who:'cust', t:'限額是什麼意思？會不會我要用的時候轉不出去？', emo:64, tip:'用語調整：避免專有名詞，用客戶的生活情境舉例說明。'},
        {who:'agent', t:'就是一天最多能轉多少錢。您平常大概會轉多少？我依照您的習慣設定，設太高反而有風險。', emo:74},
        {who:'cust', t:'大概兩三萬吧，繳個水電、給孫子一點零用錢。', emo:78, tip:'安全加值：主動開啟交易通知，讓客戶自己也能察覺異常。'},
        {who:'agent', t:'那設五萬就很夠用了。另外我幫您開啟交易通知，只要有錢進出，手機馬上會收到訊息。', emo:82},
        {who:'cust', t:'好，你慢慢講，我照著做。', emo:84, tip:'確認學會：陪客戶實際操作一次，而不是口頭確認。', flag:'win'},
        {who:'agent', t:'完成了。我們再一起試一次登入，確認您可以自己操作，之後有任何問題隨時回來找我。', emo:88},
      ],

      insurance:[
        {who:'cust', t:'我不想聽保險，之前被推銷過，感覺都是話術。', emo:26, tip:'降低防衛：先承認對方的經驗，並明確表態今天不談成交。'},
        {who:'agent', t:'譚先生，我理解您的反感。今天不談成交，我只想先釐清您現在最在意的保障缺口。', emo:34},
        {who:'cust', t:'你們是不是又要叫我繳二十年，最後拿不回來？', emo:30, tip:'合規要點：繳費年期、解約金與除外責任必須主動說明，不得包裝成保證。', flag:'compliance'},
        {who:'agent', t:'我會把繳費年期、解約金與除外責任講清楚。任何不確定的東西，我不會包裝成保證。', emo:44},
        {who:'cust', t:'那你先說，如果中途不繳會怎樣。', emo:40, tip:'先講壞消息：主動揭露最不利的情境，反而最能建立信任。', flag:'risk'},
        {who:'agent', t:'中途停繳會影響保障，保單價值準備金也可能低於已繳保費。我用表格讓您看到各年度的實際數字。', emo:52},
        {who:'cust', t:'我太太說我這個年紀買很貴。', emo:56, tip:'把異議轉成比較：提供兩種商品的實際保費，讓客戶自己判斷。'},
        {who:'agent', t:'以您 45 歲來看，定期險保費確實比十年前高，但比終身型低不少。我先算兩種給您比較。', emo:62},
        {who:'cust', t:'差多少？你直接講。', emo:60, tip:'數字說話：用可比較的具體金額取代形容詞。'},
        {who:'agent', t:'同樣一千萬的身故保障，定期險年繳約 2.8 萬，終身型約 19 萬。差別在保障期間與有沒有解約金。', emo:70},
        {who:'cust', t:'至少你講得比較清楚，那我可以先看看條款。', emo:76, tip:'不逼單：寄送條款摘要並標示關鍵條款，把決定權留給客戶。', flag:'win'},
        {who:'agent', t:'好，我先寄條款摘要給您，並標示猶豫期、等待期與除外責任。您看完再決定要不要談，不急。', emo:82},
      ],
    };

export const REPORT_CONTENT = {
      wealth:{dims:[{cn:'合規規範',en:'Compliance',score:78,note:'1 處未即時進行風險告知'},{cn:'專業知識',en:'Expertise',score:91,note:'商品要素說明準確完整'},{cn:'溝通技巧',en:'Communication',score:88,note:'同理到位，複述清楚'},{cn:'應變能力',en:'Adaptability',score:85,note:'化解虧損顧慮得當'},{cn:'情緒管理',en:'Emotion',score:90,note:'全程語氣穩定專業'}], strengths:['全程語氣穩定專業，有效化解客戶對「虧損」的顧慮，同理到位。','商品要素（風險等級、年化報酬、持有期限、最低申購）說明完整準確。','掌握成交訊號即時複述關鍵要點並順勢推進簽約。'], improves:['客戶首次追問「保不保本」時，應更早主動進行風險告知，規避合規風險。','可補充商品贖回入帳的實際時間，強化資金靈活度說明的說服力。','結尾未說明錄音存證的法律意義，建議建立標準化收尾話術。']},
      'loan-sales-sim':{dims:[{cn:'合規規範',en:'Compliance',score:84,note:'誠實說明利率適用條件與聯徵查詢'},{cn:'專業知識',en:'Expertise',score:88,note:'月付金試算與撥款時程準確'},{cn:'溝通技巧',en:'Communication',score:87,note:'面對質疑維持清楚的說明節奏'},{cn:'應變能力',en:'Adaptability',score:83,note:'質疑資料來源時回應略顯制式'},{cn:'情緒管理',en:'Emotion',score:88,note:'客戶語氣強硬時未被帶動'}], strengths:['客戶質疑最低利率時直接說明適用條件，沒有拿廣告利率誘導。','主動揭露聯徵查詢會留下紀錄，用誠實換到客戶的信任。','抓住「十月要用」的時間壓力，把撥款時程轉成推進理由。'], improves:['開場對資料來源的說明太簡略，客戶的戒心到中段才消除。','未確認客戶是否有其他負債，影響利率試算的準確度。','複述條件後可直接約定送件時間，收尾略鬆。']},
      'customer-service-sim':{dims:[{cn:'合規規範',en:'Compliance',score:86,note:'臨調期間與回復原額度說明完整'},{cn:'專業知識',en:'Expertise',score:85,note:'正確判讀為額度不足而非卡片鎖定'},{cn:'溝通技巧',en:'Communication',score:89,note:'先安撫後查詢，順序正確'},{cn:'應變能力',en:'Adaptability',score:84,note:'客戶描述不清時收斂問題略慢'},{cn:'情緒管理',en:'Emotion',score:86,note:'面對指責系統的情緒未被激化'}], strengths:['客戶情緒高張時先安撫再查詢，沒有一開口就索取一長串資料。','快速釐清是額度不足而非卡片異常，直接消除客戶最大的誤解。','主動提供「先用其他方式付款」的替代方案，解決當下的尷尬處境。'], improves:['客戶連續兩次描述不清時，應更早改用封閉式問題收斂。','未主動說明臨調可能不核准的情形，期待管理仍有缺口。','可補充查詢臨調結果的自助管道，減少客戶再次來電。']},
      collection:{dims:[{cn:'合規規範',en:'Compliance',score:92,note:'全程未涉恐嚇用語，費用揭露完整'},{cn:'專業知識',en:'Expertise',score:88,note:'分期方案與總費用年百分率計算正確'},{cn:'溝通技巧',en:'Communication',score:91,note:'引導客戶自己說出可執行日期'},{cn:'應變能力',en:'Adaptability',score:89,note:'客戶只能還一半時立即改提分期'},{cn:'情緒管理',en:'Emotion',score:90,note:'面對推託維持穩定不施壓'}], strengths:['客戶提到「被告」時據實澄清，沒有順勢利用恐懼施壓，合規表現到位。','把「下週再說」逐步收斂成具體日期與金額，協商推進紮實。','主動揭露分期手續費與總費用年百分率，符合公平待客原則。'], improves:['開場未明確告知本通電話錄音，應於自報身分後立即補上。','可再確認客戶的扣款帳戶餘額安排，降低再次逾期的機率。','結尾缺少「若屆期有困難請主動聯繫」的緩衝說明。']},
      antifraud:{dims:[{cn:'合規規範',en:'Compliance',score:85,note:'完成交易暫停與疑似詐騙通報程序'},{cn:'專業知識',en:'Expertise',score:76,note:'反詐專線與帳戶控管說明略簡'},{cn:'溝通技巧',en:'Communication',score:80,note:'未用指責語氣，客戶願意繼續對話'},{cn:'應變能力',en:'Adaptability',score:72,note:'客戶重複拉回急迫感時節奏被帶走'},{cn:'情緒管理',en:'Emotion',score:82,note:'全程穩定，未隨客戶焦慮升高'}], strengths:['沒有直接否定客戶，先取得對話空間再逐步破除話術，攔阻節奏正確。','以「司法機關不會禁止求證」切入，一句話擊中詐騙腳本的核心破綻。','主動提供 165 專線與帳戶加註，把勸阻轉成客戶可執行的具體動作。'], improves:['客戶第三次強調急迫時，應更早提出「陪同致電家人」的替代方案。','未確認客戶是否已提供過個資或轉出款項，缺少損害範圍盤點。','結尾可再確認客戶今日不會單獨前往 ATM 或臨櫃，降低二次受害風險。']},
      complaint:{dims:[{cn:'合規規範',en:'Compliance',score:80,note:'完整告知申訴管道，未阻擋客戶權利'},{cn:'專業知識',en:'Expertise',score:84,note:'費用性質與免收門檻說明正確'},{cn:'溝通技巧',en:'Communication',score:86,note:'先致歉再查證，承接情緒得當'},{cn:'應變能力',en:'Adaptability',score:78,note:'客戶要求書面承諾時反應略慢'},{cn:'情緒管理',en:'Emotion',score:82,note:'面對威脅性語言仍維持專業'}], strengths:['開場先致歉並承接情緒，沒有急著解釋制度，成功降低對立。','客戶提到申訴時明確告知那是他的權利，合規且有效化解對抗。','主動給出案件編號、時限與回覆窗口，把空泛承諾轉為可追蹤事項。'], improves:['前段兩次使用制式話術，客戶明確反彈後才調整，可以更早察覺。','費用爭議的根因（免收門檻）應在第一次查證後就主動說明。','未詢問客戶偏好的回覆方式與時段，後續聯繫可能再生摩擦。']},
      onboard:{dims:[{cn:'合規規範',en:'Compliance',score:95,note:'驗證碼保密宣導完整且時機正確'},{cn:'專業知識',en:'Expertise',score:90,note:'限額與交易通知設定建議合理'},{cn:'溝通技巧',en:'Communication',score:94,note:'拆解步驟，用語貼近長者理解'},{cn:'應變能力',en:'Adaptability',score:92,note:'客戶追問限額時立即改用生活舉例'},{cn:'情緒管理',en:'Emotion',score:94,note:'全程耐心，未因重複說明而急躁'}], strengths:['客戶問「驗證碼要不要給你」時立即明確否定，並建立不外洩的長期觀念。','依客戶實際用款習慣建議限額，而非直接給最大值，展現風險意識。','主動開啟交易通知並安排實際操作一次，確保客戶真的學會。'], improves:['可補充行動銀行遺失或換機時的處理方式，長者最常卡在這一關。','未提醒客戶避免使用公共 Wi-Fi 登入，安全宣導仍有缺口。','結尾可留下分行直撥窗口，降低長者日後求助的門檻。']},
      insurance:{dims:[{cn:'合規規範',en:'Compliance',score:88,note:'主動揭露解約金與除外責任，未作保證'},{cn:'專業知識',en:'Expertise',score:86,note:'定期險與終身型保費比較正確清楚'},{cn:'溝通技巧',en:'Communication',score:87,note:'先承認客戶負面經驗，降低防衛'},{cn:'應變能力',en:'Adaptability',score:80,note:'客戶提到配偶意見時未深入釐清'},{cn:'情緒管理',en:'Emotion',score:84,note:'面對「都是話術」的指控未被激怒'}], strengths:['開場明說今天不談成交，有效降低排斥型客戶的防衛心。','主動先講停繳的不利後果，用壞消息換取信任，策略正確。','用兩種商品的實際年繳金額對比，取代形容詞，說服力強。'], improves:['客戶提到配偶看法時未追問，錯過釐清家庭決策者的機會。','保障缺口的分析僅止於口頭，未提供可視化的試算依據。','未約定下次聯繫的時間點，後續跟進缺少著力點。']},
    };

export const OVERALL_DIMS = [
    {cn:'合規規範', en:'Compliance', score:78, note:'1 處未即時進行風險告知'},
    {cn:'專業知識', en:'Expertise', score:91, note:'商品要素說明準確完整'},
    {cn:'溝通技巧', en:'Communication', score:88, note:'同理到位，複述清楚'},
    {cn:'應變能力', en:'Adaptability', score:85, note:'化解虧損顧慮得當'},
    {cn:'情緒管理', en:'Emotion', score:90, note:'全程語氣穩定專業'},
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
        {cn:'理財推薦', n:14, col:'#D81E26'},
        {cn:'信用催收', n:9, col:'#2D6CC0'},
        {cn:'投訴處理', n:8, col:'#E0882E'},
        {cn:'轉帳核實', n:6, col:'#009E96'},
        {cn:'開戶引導', n:5, col:'#6A5BC4'},
      ],
      board:[
        {rank:1, name:'鄭思遠', dept:'財富管理中心', score:94.2},
        {rank:2, name:'林婉清', dept:'財富管理一部', score:91.8, me:true},
        {rank:3, name:'蘇曼', dept:'財富管理二部', score:90.5},
        {rank:4, name:'孔哲', dept:'分行通路', score:88.1},
        {rank:5, name:'范小美', dept:'電話金融', score:86.7},
      ],
      recent:[
        {sc:'理財商品推薦', pe:'退休教師 · 王女士', df:'medium', score:86, date:'今天 14:32', dur:'9′12″'},
        {sc:'大額轉帳核實', pe:'受騙客戶 · 孫阿姨', df:'hard', score:79, date:'今天 11:05', dur:'6′40″'},
        {sc:'客戶投訴處理', pe:'憤怒客戶 · 黃先生', df:'hard', score:82, date:'昨天 16:48', dur:'8′55″'},
        {sc:'信用卡逾期催收', pe:'拖延客戶 · 張女士', df:'medium', score:90, date:'昨天 10:20', dur:'7′02″'},
        {sc:'新戶開戶引導', pe:'年長客戶 · 何爺爺', df:'medium', score:93, date:'06-28', dur:'8′30″'},
      ],
    };

export function replayCatalog(cur, selP, selD, transcript) {
const basePersona=selP && selP.name ? selP.name.split(' · ').pop() : '王女士';
    const baseDiff=selD || {cn:'標準', col:'#E0882E'};
    return {
      wealth:{id:'wealth', sc:'理財商品推薦', pe:'退休教師 · 王女士', customer:'王女士', staff:'林婉清', diff:'標準', dfCol:'#E0882E', date:'今天 14:32', dur:'9′12″', durationSec:552, score:86,
        lines:[
          {at:0, who:'cust', text:'喂，你好，我接到電話說有個新的理財商品報酬挺高的？'},
          {at:22, who:'agent', text:'王女士您好，我是您的專屬理財專員林婉清。今天大約佔用您五分鐘，先為您說明商品性質與風險。'},
          {at:54, who:'cust', text:'上次推薦的基金我都虧了，現在一聽到理財就緊張。'},
          {at:82, who:'agent', text:'非常理解您的顧慮，本金安全確實最重要。我們先看風險等級，再決定是否適合您。'},
          {at:108, who:'cust', text:'那它到底保不保本？你直接說能不能保證不虧。'},
          {at:132, who:'agent', text:'依主管機關規定，理財商品不得承諾保本保息，我會把風險預告書傳給您確認。'},
          {at:216, who:'cust', text:'你幫我看看，先放一小部分試試，多少錢起申購？'},
          {at:248, who:'agent', text:'一萬元起申購，我建議先配置五萬元體驗；風險、期限與贖回規則我再完整複述一次。'},
        ]},
      antifraud:{id:'antifraud', sc:'大額轉帳核實', pe:'受騙客戶 · 孫阿姨', customer:'孫阿姨', staff:'林婉清', diff:'進階', dfCol:'#D81E26', date:'今天 11:05', dur:'6′40″', durationSec:400, score:79,
        lines:[
          {at:0, who:'cust', text:'我現在必須馬上轉八十萬過去，對方說再晚帳戶會被凍結。'},
          {at:18, who:'agent', text:'孫阿姨，我先幫您核實一下，請問對方是哪個單位、要求您轉到哪個帳戶？'},
          {at:47, who:'cust', text:'他說是檢察官，案件不能外洩，我也不能跟家人講。'},
          {at:76, who:'agent', text:'真正的司法機關不會要求您私下轉帳，也不會禁止您向銀行或家人確認。'},
          {at:118, who:'cust', text:'可是他知道我的身分證和地址，還說不配合就會被抓。'},
          {at:152, who:'agent', text:'這正是常見詐騙話術。我們先暫停交易，我陪您撥打官方反詐專線確認。'},
          {at:218, who:'cust', text:'那我如果不轉，錢真的不會被凍結嗎？'},
          {at:255, who:'agent', text:'不會因為您暫停轉帳就被處分。先保護資金安全，我會替您建立疑似詐騙通報紀錄。'},
        ]},
      complaint:{id:'complaint', sc:'客戶投訴處理', pe:'憤怒客戶 · 黃先生', customer:'黃先生', staff:'孔哲', diff:'進階', dfCol:'#D81E26', date:'昨天 16:48', dur:'8′55″', durationSec:535, score:82,
        lines:[
          {at:0, who:'cust', text:'你們又亂扣費，客服講法每次都不一樣，我今天一定要投訴。'},
          {at:21, who:'agent', text:'黃先生，我先向您致歉。我會完整查明扣費來源，今天給您明確處理結論。'},
          {at:58, who:'cust', text:'我不要再聽製式回答，你直接說能不能退。'},
          {at:92, who:'agent', text:'我理解您希望立刻確認。我先核對交易明細，若屬於誤扣會立即協助退回。'},
          {at:146, who:'cust', text:'已經拖兩週了，再不處理我就去主管機關申訴。'},
          {at:191, who:'agent', text:'我會把案件升級為客訴優先處理，並在今天十八點前回覆進度與補償方案。'},
          {at:274, who:'cust', text:'那你把承諾寫下來，我要有紀錄。'},
          {at:312, who:'agent', text:'可以，我會發送案件編號、處理時限與回覆窗口，方便您後續追蹤。'},
        ]},
      collection:{id:'collection', sc:'信用卡逾期催收', pe:'拖延客戶 · 張女士', customer:'張女士', staff:'蘇曼', diff:'標準', dfCol:'#E0882E', date:'昨天 10:20', dur:'7′02″', durationSec:422, score:90,
        lines:[
          {at:0, who:'cust', text:'我知道帳單逾期了，但這兩天真的不方便處理。'},
          {at:19, who:'agent', text:'張女士，我了解您目前安排不便。我先確認一個可執行的還款時間，避免影響信用。'},
          {at:52, who:'cust', text:'你們先不要一直打電話，我下週應該就會處理。'},
          {at:86, who:'agent', text:'可以，我們約定具體日期與金額。若下週三前入帳，就能降低後續滯納影響。'},
          {at:139, who:'cust', text:'下週三我可能只能先還一半。'},
          {at:176, who:'agent', text:'我可以協助登記分期安排，今天先確認第一筆金額與扣款帳戶。'},
          {at:246, who:'cust', text:'好，那先還一半，剩下的分兩期。'},
          {at:286, who:'agent', text:'收到，我會發送還款計畫簡訊，請您確認後依約繳款。'},
        ]},
      onboard:{id:'onboard', sc:'新戶開戶引導', pe:'年長客戶 · 何爺爺', customer:'何爺爺', staff:'唐悅', diff:'標準', dfCol:'#E0882E', date:'06-28', dur:'8′30″', durationSec:510, score:93,
        lines:[
          {at:0, who:'cust', text:'我第一次辦這個行動銀行，密碼和憑證我有點搞不清楚。'},
          {at:25, who:'agent', text:'何爺爺沒關係，我一步一步帶您完成，先確認身分證件與手機號碼。'},
          {at:61, who:'cust', text:'這個驗證碼是不是要告訴你？'},
          {at:84, who:'agent', text:'不用告訴任何人，驗證碼只輸入在您自己的手機畫面，這是保護帳戶安全。'},
          {at:137, who:'cust', text:'那以後我要轉帳，是不是也用這個 App？'},
          {at:172, who:'agent', text:'是的，我會幫您設定常用功能，並提醒每日轉帳限額與安全通知。'},
          {at:242, who:'cust', text:'好，你慢慢講，我照著做。'},
          {at:278, who:'agent', text:'完成後我會再陪您試一次登入，確認您可以自己操作。'},
        ]},
      insurance:{id:'insurance', sc:'保險商品介紹', pe:'排斥客戶 · 譚先生', customer:'譚先生', staff:'鄭思遠', diff:'進階', dfCol:'#D81E26', date:'06-27', dur:'10′05″', durationSec:605, score:85,
        lines:[
          {at:0, who:'cust', text:'我不想聽保險，之前被推銷過，感覺都是話術。'},
          {at:24, who:'agent', text:'譚先生，我理解您的反感。今天不急著成交，我先釐清您最在意的保障缺口。'},
          {at:63, who:'cust', text:'你們是不是又要叫我繳二十年，最後拿不回來？'},
          {at:101, who:'agent', text:'我會清楚說明繳費年期、解約金與除外責任，任何不確定的地方都不會包裝成保證。'},
          {at:166, who:'cust', text:'那你先說，如果中途不繳會怎樣。'},
          {at:204, who:'agent', text:'若中途停繳會影響保障與保單價值，我會用表格讓您看到不同年度的差異。'},
          {at:292, who:'cust', text:'至少你講得比較清楚，那我可以先看看條款。'},
          {at:336, who:'agent', text:'可以，我先寄送條款摘要，並標示猶豫期、等待期與除外責任，您看完再決定。'},
        ]},
      current:{id:'current', sc:cur.cn, pe:selP.name, customer:basePersona, staff:'林婉清', diff:baseDiff.cn, dfCol:baseDiff.col, date:'剛剛', dur:'9′12″', durationSec:552, score:86,
        lines:transcript.map((l,i)=>({at:[0,22,54,82,108,132,180,208,216,248,300,336][i]||i*30, who:l.who, text:l.t}))},
    };
}
