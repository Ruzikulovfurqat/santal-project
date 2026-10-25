  /* ================= constants ================= */
  var STAGE_NAMES = ["Қабул қилинди","Ишлаб чиқарилмоқда","Тайёр омборда","Етказилди"];
  var STAGE_READY_IDX = 2; /* "Тайёр омборда" */
  var STAGE_DELIVERED_IDX = 3; /* "Етказилди" */
  var UNIT_OPTIONS = ["дона","кг","тонна","метр","м²","м³","литр","рулон","комплект","қоп"];
  function allUnitOptions(){
    var merged = UNIT_OPTIONS.slice();
    (STATE.units||[]).forEach(function(u){ if(u.name && merged.indexOf(u.name)===-1) merged.push(u.name); });
    return merged;
  }
  var SALARY_TYPES = [["oylik","Ойлик (оклад)"],["kunlik","Кунлик"],["ishbay","Иш ҳажми бўйича"],["kpi","KPI бўйича"]];
  var PRIORITY = { past:{label:"Паст", chip:"chip-neutral"}, orta:{label:"Ўрта", chip:"chip-accent"}, yuqori:{label:"Юқори", chip:"chip-warning"} };
  var MONTHS_SHORT = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
  var MONTHS_FULL = ["Январ","Феврал","Март","Апрел","Май","Июн","Июл","Август","Сентябр","Октябр","Ноябр","Декабр"];
  var EMP_TABS = [["list","Ходимлар рўйхати"],["tabel","Табел"],["salary","Наряд"],["advances","Аванслар"],["payroll","Иш ҳақи ҳисоблаш"],["balances","Қолдиқларни киритиш"],["report","Ҳисобот"],["act","Ходимлар бўйича акт сверка"],["workshops","Цехлар"]];
  /* Фойдаланувчи сўровига кўра (2026-10-19): маҳсулот турларига «Товар»
     қўшилди — сотиб олиниб, ишлов берилмасдан сотиладиган маҳсулот. */
  var ITEM_TYPES = [["xomashyo","Хомашё"],["yarim_tayyor","Ярим тайёр маҳсулот"],["mahsulot","Тайёр маҳсулот"],["tovar","Товар"]];
  var VAT_RATE_DEFAULT = 12;

  var ICONS = {
    grid:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
    clipboard:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11l2 2 4-4"/></svg>',
    box:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/></svg>',
    users:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="8.5" r="2.6"/><path d="M16 14.2c2.8.4 5 2.5 5 5.8"/></svg>',
    chart:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"/><path d="M2 20h20"/></svg>',
    plus:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    x:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    pencil:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    trash:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>',
    eye:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    search:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    alert:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    arrowRight:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowLeft:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    check:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    ban:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>',
    inbox:'<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7l3.5-7z"/></svg>',
    calc:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="8.01" y2="18"/><line x1="12" y1="18" x2="16" y2="18"/></svg>',
    lock:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    unlock:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.4-2"/></svg>',
    swap:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>',
    printer:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M6 17v5h12v-5"/><circle cx="17.5" cy="12.3" r="0.7" fill="currentColor" stroke="none"/></svg>',
    wallet:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 7v12a2 2 0 0 0 2 2h16v-6"/><path d="M17 13h.01"/><rect x="15" y="11" width="6" height="4" rx="1"/></svg>',
    calendar:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    download:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>',
    restore:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    copy:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
    gear:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    paperclip:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    filter:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16l-6.2 7.4V19l-3.6 1.8v-9.4L4 4z"/></svg>'
  };

  function esc(s){
    s = (s===undefined||s===null) ? "" : String(s);
    return s.replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; });
  }
  function el(html){ var d=document.createElement("div"); d.innerHTML=html; return d.firstElementChild; }
  /* Intl.NumberFormat('uz-UZ') брaузер/қурилмага қараб нотўғри чиқарган
     (масалан ўнлик хонада сузувчи нуқта "ахлати" туфайли "20,000,000,003345"
     каби бузилган кўринишда чиқиб қолиши мумкин эди). Шунга кўра сонни ўзимиз,
     тўлиқ назорат остида форматлаймиз: мингликлар бўш жой билан ажратилади,
     ўнлик қисми вергул билан ва доим 2 хонагача яхлитланиб кўрсатилади —
     масалан 20000000 → "20 000 000,00". */
  function fmtNum(n){
    n = Number(n)||0;
    if(!isFinite(n)) n = 0;
    var neg = n<0;
    n = Math.abs(n);
    n = Math.round(n*100)/100;
    var parts = n.toFixed(2).split(".");
    var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg?"-":"")+intPart+","+parts[1];
  }
  function fmtSum(n){ return fmtNum(n) + " сўм"; }
  /* Буюртма ҳисоб-китоб жадвалидаги пул майдонлари (Нархи/Жами сумма/
     Чегирилган сумма/Якуний жами сумма) учун — <input type="number">
     минглик ажратгични кўрсата олмагани учун, оддий матн майдони сифатида,
     ёзаётганда ҳам "1 000 000" каби бўлиб-бўлиб кўрсатилади (2026-10-03
     сўровига кўра: "1000000 эмас 1 000 000 деб ажралиб куринсин"). Бутун
     сонлар ўнлик қисмсиз, бутун бўлмаганлар эса вергул билан кўрсатилади. */
  function groupThousandsStr(digits){ return (digits||"").replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function formatSumInputValue(n){
    n = Number(n)||0;
    if(!isFinite(n)) n = 0;
    var neg = n<0; n = Math.abs(n);
    var rounded = Math.round(n*100)/100;
    var isInt = Math.abs(rounded-Math.round(rounded))<1e-9;
    if(isInt) return (neg?"-":"")+groupThousandsStr(String(Math.round(rounded)));
    var parts = rounded.toFixed(2).split(".");
    return (neg?"-":"")+groupThousandsStr(parts[0])+","+parts[1];
  }
  function parseSumInputValue(str){
    str = String(str==null?"":str).trim();
    if(str==="") return 0;
    var neg = str.charAt(0)==="-";
    str = str.replace(/^-/,"").replace(/\s/g,"").replace(/,/g,".");
    var v = Number(str);
    if(!isFinite(v)) v = 0;
    return neg?-v:v;
  }
  /* Ёзаётган пайтда ҳам минглик бўлиниши кўриниб турсин учун — курсор
     ўрнини (неча рақамдан кейин турганини) сақлаб қолган ҳолда қайта
     форматлайди. onChange — тозаланган сон билан чақирилади (масалан
     қатор ҳисобини қайта ҳисоблаш учун). */
  function wireSumInputFormatting(inputEl, onChange){
    inputEl.setAttribute("inputmode","decimal");
    inputEl.addEventListener("input", function(){
      var raw = inputEl.value;
      var caret = inputEl.selectionStart==null ? raw.length : inputEl.selectionStart;
      var digitsBefore = raw.slice(0, caret).replace(/[^\d]/g,"").length;
      var neg = raw.trim().charAt(0)==="-";
      var cleaned = raw.replace(/[^\d,]/g,"");
      var commaIdx = cleaned.indexOf(",");
      var intPart = (commaIdx>-1 ? cleaned.slice(0,commaIdx) : cleaned).replace(/^0+(?=\d)/,"");
      var decPart = commaIdx>-1 ? cleaned.slice(commaIdx+1).replace(/,/g,"").slice(0,2) : null;
      var grouped = groupThousandsStr(intPart);
      var newVal = (neg&&(grouped||decPart!=null)?"-":"") + grouped + (decPart!=null ? ","+decPart : "");
      inputEl.value = newVal;
      var pos=0, seen=0;
      while(pos<newVal.length && seen<digitsBefore){ if(/\d/.test(newVal[pos])) seen++; pos++; }
      inputEl.setSelectionRange(pos,pos);
      if(onChange) onChange(parseSumInputValue(newVal));
    });
  }
  /* Excel'дагидай "+" орқали қийматларни қўшиш: масалан катакда "1000000"
     турганда фойдаланувчи "+1000000+500000" деб ёзиб Enter босса, натижа
     1000000+1000000+500000 эмас, балки МАТНДАГИ барча "+"-ажратилган
     сонларнинг ЙИҒИНДИСИ (пробел, минг ажратувчи вергул/бўшлиқ эътиборга
     олинмайди) сифатида қайтарилади. Оддий бир сон (плюссиз) бўлса —
     ўша сон ўзгаришсиз қайтади. */
  function parsePlusSumExpr(str){
    str = String(str==null?"":str).trim();
    if(str==="") return 0;
    var parts = str.split("+");
    var sum = 0, any = false;
    parts.forEach(function(p){
      p = p.replace(/\s/g,"").replace(/,/g,"");
      if(p==="") return;
      var v = Number(p);
      if(isFinite(v)){ sum += v; any = true; }
    });
    return any ? sum : (Number(str.replace(/\s/g,"").replace(/,/g,""))||0);
  }
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function fmtDate(iso){
    if(!iso) return "—";
    var d = new Date(iso+"T00:00:00");
    if(isNaN(d)) return iso;
    var days=["Якш","Душ","Сеш","Чор","Пай","Жум","Шан"];
    return d.getDate()+" "+["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"][d.getMonth()]+" "+d.getFullYear()+" ("+days[d.getDay()]+")";
  }
  function fmtDateShort(iso){
    if(!iso) return "—";
    var d = new Date(iso+"T00:00:00");
    if(isNaN(d)) return iso;
    return d.getDate()+"."+String(d.getMonth()+1).padStart(2,"0")+"."+d.getFullYear();
  }
  function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
  function daysDiff(iso){
    var d = new Date(iso+"T00:00:00"), n = new Date(); n.setHours(0,0,0,0);
    return Math.round((d-n)/86400000);
  }

