  /* ======= Касса — битта умумий касса (2026-10-15 сўровига кўра) =======
     Бўлимга кирганда кассалар рўйхати ҳам, "Касса яратиш" тугмаси ҳам
     кўринмайди — дарҳол ягона умумий касса очилади. Қолдиқлар барча
     мавжуд касса ёзувлари бўйича ЖАМЛАНИБ кўрсатилади (эски маълумот
     йўқолмайди), янги кирим/чиқим эса асосий кассага ёзилади. */
  var KASSA_PAYTYPES = [["sotuv","Сотув"],["qarz_tolovi","Қарз тўлови"],["bonak","Бўнак (аванс)"],["xomashyo_xarid","Хомашё харид"],["taminotchi_tolovi","Таъминотчига тўлов"],["ish_haqi","Иш ҳақи"],["qolga_kirim","Қўлда кирим"],["qolga_chiqim","Қўлда чиқим"],["boshqa","Бошқа"]];
  function kassaPayTypeLabel(k){ var f=KASSA_PAYTYPES.find(function(x){return x[0]===k;}); return f?f[1]:(cashCategoryLabel(k)||"—"); }
  function kassaNextDocNumber(direction){
    var max = 0;
    STATE.cashTransactions.forEach(function(t){
      if(t.direction!==direction) return;
      var n = Number(t.docNumber)||0; if(n>max) max=n;
    });
    return max+1;
  }
  function kassaCashierName(){
    var u = currentUser();
    return u ? (u.name||"Админ") : "";
  }
  function kassaCategoryName(id){
    if(id===FIN_ADMIN_CAT) return FIN_ADMIN_NAME;
    var c = STATE.categories.find(function(x){ return x.id===id; });
    return c ? c.name : "";
  }
  function kassaMainAccountId(){
    if(STATE.cashAccounts.length) return STATE.cashAccounts[0].id;
    return "";
  }
  /* Касса ёзуви бўлмаса — биринчи амал пайтида "Умумий касса" яратилади. */
  function kassaEnsureAccountId(){
    var id = kassaMainAccountId();
    if(id) return id;
    dbAdd("cashAccounts", {name:"Умумий касса", createdAt:new Date().toISOString()}, STATE.cashAccounts);
    return (STATE.cashAccounts[0]||{}).id || "";
  }
  function kassaAllBalances(){
    var b = {naqd:0, karta:0, otkazma:0, dollar:0, otkazma_usd:0};
    STATE.cashAccounts.forEach(function(a){
      var x = cashAccountBalances(a.id);
      Object.keys(b).forEach(function(k){ b[k] += Number(x[k])||0; });
    });
    return b;
  }
  function kassaMethodBalanceAll(method){
    var s = 0;
    STATE.cashAccounts.forEach(function(a){ s += cashMethodBalance(a.id, method); });
    return s;
  }
  function kassaTxMethods(t){ return (t.methods&&t.methods.length) ? t.methods : [{method:"naqd", amount:Number(t.amount)||0, usdAmount:0, usdRate:0}]; }
  function kassaTxHasUsd(t){ return kassaTxMethods(t).some(function(m){ return isUsdMethod(m.method) && (Number(m.usdAmount)||0)>0; }); }
  function kassaTxAmountText(t){
    return kassaTxMethods(t).map(function(m){
      return isUsdMethod(m.method) ? fmtUsd(m.usdAmount) : fmtSum(m.amount);
    }).join(" + ");
  }
  function kassaTxMethodText(t){
    return kassaTxMethods(t).map(function(m){ return paymentMethodLabel(m.method); }).join(", ");
  }
  function kassaTxTimeText(t){
    var d = t.date || (t.createdAt||"").slice(0,10);
    var tm = "";
    if(t.createdAt){
      var dt = new Date(t.createdAt);
      if(!isNaN(dt.getTime())) tm = String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0");
    }
    return (d?fmtDate(d):"—")+(tm?(" "+tm):"");
  }
  function kassaShiftDay(iso, delta){
    var d = new Date(iso+"T00:00:00");
    d.setDate(d.getDate()+delta);
    return d.toISOString().slice(0,10);
  }
  /* Амал бажарилган кунлар рўйхати (ўсиш тартибида) — «Олдинги/Кейинги кун»
     тугмалари бўш кунларни ўтказиб, фақат амал бор кунга ўтади
     (2026-10-15 сўровига кўра). */
  function kassaOpDays(){
    var set = {};
    STATE.cashTransactions.forEach(function(t){
      var d = t.date || (t.createdAt||"").slice(0,10);
      if(d) set[d] = true;
    });
    return Object.keys(set).sort();
  }
  function kassaPrevOpDay(day){
    var days = kassaOpDays(), out = "";
    for(var i=0;i<days.length;i++){ if(days[i] < day) out = days[i]; }
    return out;
  }
  function kassaNextOpDay(day){
    var days = kassaOpDays();
    for(var i=0;i<days.length;i++){ if(days[i] > day) return days[i]; }
    return "";
  }

  function viewKassa(){
    return renderKassaUnified();
  }

  function renderKassaUnified(){
    var bal = kassaAllBalances();
    var rate = finRateOn(todayISO());
    var totalSom = bal.naqd + bal.karta + bal.otkazma + (bal.dollar + (bal.otkazma_usd||0))*rate;
    var f = STATE.kassaFilter || (STATE.kassaFilter = {from:"", to:"", dir:"", cur:"", method:"", payType:"", bucket:"", cashier:"", q:"", open:false, onlyActive:true});
    /* Эски сеансларда бу иккита майдон бўлмаслиги мумкин — стандарт
       қийматлар: филтр ёпиқ, «фақат бажарилган амаллар» ёқилган. */
    if(f.open===undefined) f.open = false;
    if(f.onlyActive===undefined) f.onlyActive = true;
    if(!STATE.kassaDay) STATE.kassaDay = todayISO();
    var rangeMode = !!(f.from || f.to);

    setTopbar("Умумий касса", "Кирим, чиқим ва конвертация", "");
    var root = document.getElementById("content");

    var html = '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
      '<div class="table-wrap"><table><thead><tr>'+
        '<th class="num">Ҳисоб рақам (сўм)</th><th class="num">Ҳисоб рақам ($)</th><th class="num">Нақд</th>'+
        '<th class="num">Нақд ($)</th><th class="num">Карта</th><th class="num">Жами сумма (сўм)</th><th class="num">Курс</th>'+
      '</tr></thead><tbody><tr>'+
        '<td class="num cell-strong">'+fmtSum(bal.otkazma)+'</td>'+
        '<td class="num cell-strong">'+fmtUsd(bal.otkazma_usd||0)+'</td>'+
        '<td class="num cell-strong">'+fmtSum(bal.naqd)+'</td>'+
        '<td class="num cell-strong">'+fmtUsd(bal.dollar)+'</td>'+
        '<td class="num cell-strong">'+fmtSum(bal.karta)+'</td>'+
        '<td class="num cell-strong" style="color:var(--accent);">'+fmtSum(totalSom)+'</td>'+
        '<td class="num">'+fmtNum(rate)+'</td>'+
      '</tr></tbody></table></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">'+
        '<button class="btn btn-primary" id="kmKirimBtn">'+ICONS.plus+'Кирим</button>'+
        '<button class="btn btn-primary" id="kmChiqimBtn">'+ICONS.plus+'Чиқим</button>'+
        '<button class="btn btn-secondary" id="kmConvBtn">'+ICONS.swap+'Конвертация</button>'+
        /* 2026-10-19 сўрови: «Омбордан келган буюртма» — босилганда пастдаги
           «Амаллар ҳисоботи» ўрнида омбор буюртмалари кўринади, бухгалтер
           кўзча орқали ичини кўриб тасдиқлайди. */
        '<button class="btn '+(STATE.kassaWhOrders?"btn-primary":"btn-secondary")+'" id="kmWhOrdersBtn">'+ICONS.clipboard+'Омбордан келган буюртма'+(wh2PendingAccCount()?(' · '+wh2PendingAccCount()):'')+'</button>'+
      '</div>'+
    '</div>';

    var cashiers = [];
    STATE.cashTransactions.forEach(function(t){ if(t.cashier && cashiers.indexOf(t.cashier)===-1) cashiers.push(t.cashier); });
    var opt = function(list, cur){ return list.map(function(x){ return '<option value="'+esc(x[0])+'"'+(cur===x[0]?" selected":"")+'>'+esc(x[1])+'</option>'; }).join(""); };
    /* Филтр жадвали ёпиқ ҳолатда туради — «Филтр» тугмаси орқали очилади
       ва яна босилганда ёпилади (2026-10-16 сўрови). Ёнида «Фақат
       бажарилган амаллар» галочкаси — стандартда ёқилган. */
    var activeCount = ["from","to","dir","cur","method","payType","bucket","cashier","q"].filter(function(k){ return f[k]; }).length;
    var cellStyle = 'margin-bottom:0;';
    var lblStyle = 'font-size:11px;margin-bottom:3px;';
    var inpStyle = 'padding:5px 8px;font-size:12.5px;height:auto;';
    var fcell = function(label, inner){
      return '<div class="field" style="'+cellStyle+'"><label style="'+lblStyle+'">'+label+'</label>'+inner+'</div>';
    };
    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">'+
        '<button type="button" class="btn '+(f.open?"btn-primary":"btn-secondary")+' btn-icon" id="kf-toggle" title="Филтр">'+ICONS.filter+'</button>'+
        (activeCount?('<div class="pill-filter active" style="display:inline-flex;align-items:center;gap:7px;cursor:default;">Филтр: '+activeCount+' та шарт</div>'):'')+
        onlyActiveCheckboxHtml("kf-onlyactive", f.onlyActive)+
        (activeCount?'<button type="button" class="btn btn-ghost btn-sm" id="kf-reset">Филтрни тозалаш</button>':'')+
      '</div>';
    if(f.open){
      html += '<div class="card" style="padding:10px 12px;margin-bottom:12px;">'+
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">'+
          fcell('Сана (дан)', '<input id="kf-from" type="date" value="'+esc(f.from)+'" style="'+inpStyle+'">')+
          fcell('Сана (гача)', '<input id="kf-to" type="date" value="'+esc(f.to)+'" style="'+inpStyle+'">')+
          fcell('Амал', '<select id="kf-dir" style="'+inpStyle+'"><option value="">Барчаси</option>'+opt([["kirim","Кирим"],["chiqim","Чиқим"]], f.dir)+'</select>')+
          fcell('Валюта тури', '<select id="kf-cur" style="'+inpStyle+'"><option value="">Барчаси</option>'+opt([["som","сўм"],["usd","доллар"]], f.cur)+'</select>')+
          fcell('Тўлов усули', '<select id="kf-method" style="'+inpStyle+'"><option value="">Барчаси</option>'+opt(PAYMENT_METHODS, f.method)+'</select>')+
          fcell('Тўлов тури', '<select id="kf-paytype" style="'+inpStyle+'"><option value="">Барчаси</option>'+opt(KASSA_PAYTYPES, f.payType)+'</select>')+
          fcell('Харажат тури', '<select id="kf-bucket" style="'+inpStyle+'"><option value="">Барчаси</option>'+opt(FIN_BUCKETS.concat(FIN_ADMIN_BUCKETS).map(function(b){return [b.key,b.name];}), f.bucket)+'</select>')+
          fcell('Кассир', '<select id="kf-cashier" style="'+inpStyle+'"><option value="">Барчаси</option>'+opt(cashiers.map(function(c){return [c,c];}), f.cashier)+'</select>')+
          fcell('Қидирув', '<input id="kf-q" placeholder="Ташкилот, изоҳ, рақам…" value="'+esc(f.q)+'" style="'+inpStyle+'">')+
        '</div>'+
      '</div>';
    }

    var list = STATE.cashTransactions.filter(function(t){
      /* Таҳрирланганда амалнинг эски версияси базада сақланиб қолади,
         лекин рўйхатда кўрсатилмайди (2026-10-17). */
      if(t.archived) return false;
      if(f.onlyActive && t.cancelled) return false;
      var d = t.date || (t.createdAt||"").slice(0,10);
      if(rangeMode){
        if(f.from && d < f.from) return false;
        if(f.to && d > f.to) return false;
      } else if(d !== STATE.kassaDay) return false;
      if(f.dir && t.direction!==f.dir) return false;
      if(f.method && !kassaTxMethods(t).some(function(m){ return m.method===f.method; })) return false;
      if(f.cur==="usd" && !kassaTxHasUsd(t)) return false;
      if(f.cur==="som" && kassaTxMethods(t).every(function(m){ return isUsdMethod(m.method); })) return false;
      if(f.payType && (t.payType||t.category)!==f.payType) return false;
      if(f.bucket && t.bucket!==f.bucket) return false;
      if(f.cashier && t.cashier!==f.cashier) return false;
      if(f.q){
        var hay = ((t.counterpartyName||"")+" "+(t.description||"")+" "+(t.docNumber||"")).toLowerCase();
        if(hay.indexOf(f.q.toLowerCase())===-1) return false;
      }
      return true;
    }).sort(function(a,b){
      return String(b.date||"").localeCompare(String(a.date||"")) || String(b.createdAt||"").localeCompare(String(a.createdAt||""));
    });

    var rows = list.map(function(t, i){
      var isK = t.direction==="kirim";
      return '<tr'+(t.cancelled?' style="opacity:.45;background:var(--surface-2);"':'')+'>'+
        '<td class="cell-muted">'+(i+1)+'</td>'+
        '<td class="cell-strong"'+(t.cancelled?' style="text-decoration:line-through;"':'')+'>'+(t.docNumber?esc(String(t.docNumber)):'<span class="cell-muted">—</span>')+
          (t.cancelled?'<div><span class="chip chip-critical" style="font-size:10px;padding:1px 6px;">Бекор қилинган</span></div>':'')+
          (Number(t.version)>1?'<div><span class="chip chip-neutral" style="font-size:10px;padding:1px 6px;">'+t.version+'-версия</span></div>':'')+'</td>'+
        '<td style="white-space:nowrap;">'+esc(kassaTxTimeText(t))+'</td>'+
        '<td>'+(t.categoryId?esc(kassaCategoryName(t.categoryId)):'<span class="cell-muted">—</span>')+'</td>'+
        '<td class="num" style="color:var(--good);">'+(isK?esc(kassaTxAmountText(t)):'—')+'</td>'+
        '<td class="num" style="color:var(--critical);">'+(!isK?esc(kassaTxAmountText(t)):'—')+'</td>'+
        '<td>'+esc(kassaTxMethodText(t))+'</td>'+
        '<td>'+(t.bucket?esc(finBucketName(t.bucket)):'<span class="cell-muted">—</span>')+'</td>'+
        '<td>'+(t.cashier?esc(t.cashier):'<span class="cell-muted">—</span>')+'</td>'+
        '<td>'+(t.description?esc(t.description):(t.counterpartyName?esc(t.counterpartyName):'<span class="cell-muted">—</span>'))+'</td>'+
        '<td><div class="row-actions">'+
          '<button class="btn btn-ghost btn-icon" data-ktx-eye="'+t.id+'" title="Ичини кўриш">'+ICONS.eye+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-ktx-copy="'+t.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-ktx-print="'+t.id+'" title="Қоғозга чоп этиш">'+ICONS.printer+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-ktx-xls="'+t.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-ktx-edit="'+t.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
          (t.cancelled
            ? '<button class="btn btn-ghost btn-icon" data-ktx-restore="'+t.id+'" title="Тиклаш">'+ICONS.restore+'</button>'
            : '<button class="btn btn-ghost btn-icon" data-ktx-cancel="'+t.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
        '</div></td></tr>';
    }).join("");

    var prevDay = kassaPrevOpDay(STATE.kassaDay), nextDay = kassaNextOpDay(STATE.kassaDay);
    var dayNav = rangeMode
      ? '<span class="field-hint">Сана оралиғи бўйича: '+(f.from?fmtDate(f.from):"…")+' — '+(f.to?fmtDate(f.to):"…")+'</span>'
      : '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'+
          '<button class="btn btn-secondary btn-sm" id="kd-prev"'+(prevDay?'':' disabled title="Олдинги кунларда амал йўқ"')+'>'+ICONS.arrowLeft+'Олдинги кун'+(prevDay?' ('+esc(fmtDateShort(prevDay))+')':'')+'</button>'+
          '<span class="cell-strong">'+esc(fmtDate(STATE.kassaDay))+'</span>'+
          '<button class="btn btn-secondary btn-sm" id="kd-next"'+(nextDay?'':' disabled title="Кейинги кунларда амал йўқ"')+'>'+(nextDay?'('+esc(fmtDateShort(nextDay))+') ':'')+'Кейинги кун'+ICONS.arrowRight+'</button>'+
          (STATE.kassaDay!==todayISO()?'<button class="btn btn-ghost btn-sm" id="kd-today">Бугун</button>':'')+
        '</div>';

    if(STATE.kassaWhOrders){
      html += kassaWh2OrdersCardHtml();
    } else {
      html += '<div class="card" style="padding:16px 18px;">'+
        '<div class="section-head" style="align-items:center;"><h2 style="font-size:13.5px;">Амаллар ҳисоботи</h2>'+dayNav+'</div>'+
        (list.length
          ? '<div class="table-wrap"><table><thead><tr><th>№</th><th>Кирим/чиқим рақами</th><th>Сана (вақти)</th><th>Категория</th><th>Кирим</th><th>Чиқим</th><th>Тўлов усули</th><th>Харажат тури</th><th>Кассир</th><th>Изоҳ</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
          : '<div class="field-hint">Бу кунда амал бажарилмаган.</div>')+
      '</div>';
    }

    root.innerHTML = html;
    document.getElementById("kmKirimBtn").addEventListener("click", function(){ openKassaSimpleForm(kassaEnsureAccountId(), "kirim", null); });
    document.getElementById("kmChiqimBtn").addEventListener("click", function(){ openKassaSimpleForm(kassaEnsureAccountId(), "chiqim", null); });
    document.getElementById("kmConvBtn").addEventListener("click", function(){ openKassaConversionForm(kassaEnsureAccountId(), null); });
    var kmWhBtn = document.getElementById("kmWhOrdersBtn");
    if(kmWhBtn) kmWhBtn.addEventListener("click", function(){ STATE.kassaWhOrders = !STATE.kassaWhOrders; render(); });
    root.querySelectorAll("[data-kwh2-eye]").forEach(function(b){ b.addEventListener("click", function(){
      openWh2AccountantModal(wh2OrderById(b.getAttribute("data-kwh2-eye")));
    }); });
    var pv = document.getElementById("kd-prev"); if(pv) pv.addEventListener("click", function(){
      var d = kassaPrevOpDay(STATE.kassaDay);
      if(!d){ toast("Олдинги кунларда бажарилган амал йўқ"); return; }
      STATE.kassaDay = d; render();
    });
    var nx = document.getElementById("kd-next"); if(nx) nx.addEventListener("click", function(){
      var d = kassaNextOpDay(STATE.kassaDay);
      if(!d){ toast("Кейинги кунларда бажарилган амал йўқ"); return; }
      STATE.kassaDay = d; render();
    });
    var td = document.getElementById("kd-today"); if(td) td.addEventListener("click", function(){ STATE.kassaDay = todayISO(); render(); });
    var bind = function(id, key, ev){
      var el = document.getElementById(id); if(!el) return;
      el.addEventListener(ev||"change", function(){ f[key]=el.value; render(); });
    };
    bind("kf-from","from"); bind("kf-to","to"); bind("kf-dir","dir"); bind("kf-cur","cur");
    bind("kf-method","method"); bind("kf-paytype","payType"); bind("kf-bucket","bucket"); bind("kf-cashier","cashier");
    document.getElementById("kf-toggle").addEventListener("click", function(){ f.open = !f.open; render(); });
    document.getElementById("kf-onlyactive").addEventListener("change", function(){ f.onlyActive = this.checked; render(); });
    var q = document.getElementById("kf-q");
    if(q) q.addEventListener("input", function(){
      f.q = q.value;
      clearTimeout(q._t);
      q._t = setTimeout(function(){ render(); var e2=document.getElementById("kf-q"); if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length,e2.value.length); } }, 350);
    });
    var resetBtn = document.getElementById("kf-reset");
    if(resetBtn) resetBtn.addEventListener("click", function(){
      STATE.kassaFilter = {from:"", to:"", dir:"", cur:"", method:"", payType:"", bucket:"", cashier:"", q:"", open:f.open, onlyActive:true};
      render();
    });
    root.querySelectorAll("[data-ktx-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var t = STATE.cashTransactions.find(function(x){ return x.id===b.getAttribute("data-ktx-edit"); });
      if(t) openKassaSimpleForm(t.cashAccountId||kassaEnsureAccountId(), t.direction, t);
    }); });
    root.querySelectorAll("[data-ktx-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var t = STATE.cashTransactions.find(function(x){ return x.id===b.getAttribute("data-ktx-copy"); });
      if(!t) return;
      /* Нусха — id'сиз (янги) амал: эски ёзув ўзгармайди (2026-10-21). */
      var c = Object.assign({}, t);
      delete c.id; c.docNumber = ""; c.version = 1; c.prevVersionId = ""; c.origId = "";
      c.supersededBy = ""; c.archived = false; c.cancelled = false;
      c.date = todayISO(); c.createdAt = "";
      openKassaSimpleForm(t.cashAccountId||kassaEnsureAccountId(), t.direction, c);
      toast("Нусха олинди — текшириб сақланг");
    }); });
    root.querySelectorAll("[data-ktx-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var t = STATE.cashTransactions.find(function(x){ return x.id===b.getAttribute("data-ktx-xls"); });
      if(t) opExcelDoc(kassaOpDoc(t), "Kassa_"+(t.docNumber||""));
    }); });
    root.querySelectorAll("[data-ktx-eye]").forEach(function(b){ b.addEventListener("click", function(){
      var t = STATE.cashTransactions.find(function(x){ return x.id===b.getAttribute("data-ktx-eye"); });
      if(t) openKassaTxDetail(t);
    }); });
    root.querySelectorAll("[data-ktx-print]").forEach(function(b){ b.addEventListener("click", function(){
      var t = STATE.cashTransactions.find(function(x){ return x.id===b.getAttribute("data-ktx-print"); });
      printKassaTx(t);
    }); });
    root.querySelectorAll("[data-ktx-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var t = STATE.cashTransactions.find(function(x){ return x.id===b.getAttribute("data-ktx-cancel"); });
      if(!t) return;
      openConfirm("Бекор қилиш",
        "Ушбу амал бекор қилинсинми? Ёзув базадан ўчмайди — рўйхатда хира кўринишда қолади ва кейин қайта тикланиши мумкин. Қолдиқ қайта ҳисобланади.",
        "Ҳа, бекор қилиш", function(){
          dbUpdate("cashTransactions", t.id, {cancelled:true}, STATE.cashTransactions);
          toast("Бекор қилинди");
        }, true);
    }); });
    root.querySelectorAll("[data-ktx-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var t = STATE.cashTransactions.find(function(x){ return x.id===b.getAttribute("data-ktx-restore"); });
      if(!t) return;
      dbUpdate("cashTransactions", t.id, {cancelled:false}, STATE.cashTransactions);
      toast("Тикланди");
    }); });
  }

  /* ---- Кирим / Чиқим шакли — бир нечта тўлов усули билан ---- */
  function openKassaSimpleForm(accountId, direction, existing){
    var isEdit = !!(existing && existing.id);
    var isKirim = direction==="kirim";
    var t = existing || {};
    var defRate = finRateOn(todayISO()) || STATE.lastUsdRate || 0;
    var ms = {};
    PAYMENT_METHODS.forEach(function(pm){ ms[pm[0]] = {active:false, amount:0, usdAmount:0, usdRate:defRate}; });
    (t.methods||[]).forEach(function(mm){
      if(!ms[mm.method]) return;
      ms[mm.method] = {active:true, amount:Number(mm.amount)||0, usdAmount:Number(mm.usdAmount)||0, usdRate:Number(mm.usdRate)||defRate};
    });
    if(!(t.methods||[]).length){
      if(isEdit && Number(t.amount)>0){ ms.naqd.active = true; ms.naqd.amount = Number(t.amount)||0; }
      else ms.naqd.active = true;
    }
    var activeCodes = function(){ return PAYMENT_METHODS.filter(function(pm){ return ms[pm[0]].active; }).map(function(pm){ return pm[0]; }); };
    var docNumber = t.docNumber || kassaNextDocNumber(direction);
    var fin = finCompute();
    var catOptions = '<option value="">— танланмаган —</option>'+STATE.categories.map(function(c){
      return '<option value="'+c.id+'"'+(t.categoryId===c.id?" selected":"")+'>'+esc(c.name)+'</option>';
    }).join("")+'<option value="'+FIN_ADMIN_CAT+'"'+(t.categoryId===FIN_ADMIN_CAT?" selected":"")+'>'+esc(FIN_ADMIN_NAME)+'</option>';
    /* «Бошқарув бўлими» категориясида харажат турлари бошқача —
       Администрация ва Маркетинг ва реклама (2026-10-16). */
    var ksBucketOpts = function(ck, cur){
      return '<option value="">— танланмаган —</option>'+finBucketsFor(ck).map(function(b){
        return '<option value="'+b.key+'"'+(cur===b.key?" selected":"")+'>'+esc(b.name)+'</option>';
      }).join("");
    };
    var bucketOptions = ksBucketOpts(t.categoryId||"", t.bucket||"");
    var cpOptions = (isKirim ? STATE.customers : STATE.suppliers);
    var body = '<div class="field-row">'+
        '<div class="field"><label>'+(isKirim?"Кирим":"Чиқим")+' рақами</label><input id="ks-num" value="'+esc(docNumber)+'"></div>'+
        '<div class="field"><label>Сана</label><input id="ks-date" type="date" value="'+esc(t.date||todayISO())+'"></div>'+
      '</div>'+
      '<div class="field"><label>Тўлов усули <span class="opt">(бир нечтасини танлаш мумкин)</span></label>'+methodTogglesHtml("ks", activeCodes())+'</div>'+
      '<div id="ks-rows"></div>'+
      (isKirim
        ? '<div class="field-row"><div class="field"><label>Тўлов тури</label><select id="ks-paytype">'+KASSA_PAYTYPES.map(function(x){
              return '<option value="'+x[0]+'"'+((t.payType||t.category)===x[0]?" selected":"")+'>'+x[1]+'</option>';
            }).join("")+'</select></div>'+
          '<div class="field"><label>Харидор</label><select id="ks-cp"><option value="">— танланмаган —</option>'+cpOptions.map(function(x){
              return '<option value="'+x.id+'"'+(t.counterpartyId===x.id?" selected":"")+'>'+esc(x.name)+'</option>';
            }).join("")+'</select></div></div>'
        /* Чиқимда «Тўлов тури» катаги олиб ташланди (2026-10-17) — у
           ҳар доим «Қўлда чиқим» сифатида сақланади. */
        : '<div class="field-row"><div class="field"><label>Категория</label><select id="ks-cat">'+catOptions+'</select></div>'+
          '<div class="field"><label>Харажат тури</label><select id="ks-bucket">'+bucketOptions+'</select><div class="field-hint" id="ks-bucket-bal"></div></div></div>'+
          '<div class="field-row"><div class="field" id="ks-cp-wrap"></div>'+
          '<div class="field" id="ks-admwage-wrap"></div></div>')+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="ks-note">'+esc(t.description||"")+'</textarea></div>'+
      '<div style="display:flex;justify-content:flex-end;gap:10px;font-weight:800;font-size:13.5px;">Жами (сўм): <span class="num" id="ks-total">0 сўм</span></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal((isEdit?"Таҳрирлаш — ":"Янги ")+(isKirim?"Кирим":"Чиқим"), body, foot, "wide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var rowsEl = m.querySelector("#ks-rows"), totalEl = m.querySelector("#ks-total");
    var catEl = m.querySelector("#ks-cat"), bucketEl = m.querySelector("#ks-bucket"), bucketBalEl = m.querySelector("#ks-bucket-bal");
    var payTypeEl = m.querySelector("#ks-paytype");
    var admWrap = m.querySelector("#ks-admwage-wrap");
    /* «Бошқарув бўлими → Администрация»да иш ҳақи тўлови галочкаси
       (2026-10-17). Белгиланса — «Ведомост бўйича ёки ходим бўйича»
       танлови чиқади; белгиланмаса — Ташкилот катаги умуман бўлмайди ва
       тўлов «Бошқа харажатлар»га олинади. */
    var admWage = !!t.admWage;
    var cpWrap = m.querySelector("#ks-cp-wrap");
    /* Иш ҳақи харажат турида «Ташкилот» ўрнига «Ведомост бўйича ёки ходим
       бўйича» танлови чиқади (2026-10-15 сўрови). */
    var wagePick = (t.counterpartyType==="employee" && t.counterpartyId)
      ? {type:"employee", id:t.counterpartyId, name:t.counterpartyName||""} : null;
    function cashModeNow(){
      var codes = activeCodes();
      return codes.length ? codes.every(function(c){ return c==="naqd" || c==="dollar"; }) : false;
    }
    function paintCpField(){
      if(!cpWrap) return;
      var isAdminCatSel = !!(catEl && catEl.value===FIN_ADMIN_CAT);
      var bk = bucketEl ? bucketEl.value : "";
      /* «Бошқарув бўлими → Администрация» танланганда — иш ҳақи
         галочкаси (2026-10-17 сўрови). */
      if(admWrap){
        if(isAdminCatSel && bk==="admin_main"){
          admWrap.style.display = "";
          admWrap.innerHTML = '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:700;padding-top:20px;">'+
              '<input type="checkbox" id="ks-adm-wage" style="width:auto;flex-shrink:0;"'+(admWage?" checked":"")+'>Иш ҳақи тўлови (ведомост ёки ходим бўйича)</label>'+
            '<div class="field-hint">Белгиланмаса — тўлов «'+esc(finBucketName("other"))+'»га олинади.</div>';
          admWrap.querySelector("#ks-adm-wage").addEventListener("change", function(){
            admWage = this.checked;
            if(!admWage) wagePick = null;
            paintCpField();
          });
        } else {
          admWrap.style.display = "none";
          admWrap.innerHTML = "";
        }
      }
      /* Оддий категорияларда «Иш ҳақи» алоҳида харажат тури; «Бошқарув
         бўлими»да эса Администрация + галочка орқали. */
      var isWage = !!(bk && (bk==="wage" || (isAdminCatSel && bk==="admin_main" && admWage)));
      /* «Бошқарув бўлими → Администрация» галочкасиз бўлса — Ташкилот
         катаги умуман кўринмайди. */
      if(isAdminCatSel && bk==="admin_main" && !isWage){
        cpWrap.innerHTML = "";
        cpWrap.style.display = "none";
        return;
      }
      cpWrap.style.display = "";
      if(isWage){
        cpWrap.innerHTML = '<label>Ведомост бўйича ёки ходим бўйича</label>'+
          '<button type="button" class="btn btn-secondary" id="ks-wage-pick" style="width:100%;justify-content:flex-start;">'+
            (wagePick ? esc(wagePick.name||"Ходим") : '— танланг —')+'</button>'+
          '<div class="field-hint">Устига босиб «Ведомост бўйича» ёки «Ходим бўйича» танланади.</div>';
        var wb = cpWrap.querySelector("#ks-wage-pick");
        if(wb) wb.addEventListener("click", openWagePayPicker);
      } else {
        cpWrap.innerHTML = '<label>Ташкилот</label><select id="ks-cp"><option value="">— танланмаган —</option>'+
          cpOptions.map(function(x){ return '<option value="'+x.id+'"'+(t.counterpartyId===x.id?" selected":"")+'>'+esc(x.name)+'</option>'; }).join("")+'</select>';
      }
    }
    /* Танлов ойнаси очилганда Чиқим шакли ёпилади (closeModal бутун
       modalRoot'ни тозалайди), шунга кўра шакл ҳолати "сурат"га олинади
       ва танловдан кейин худди шу қийматлар билан қайта очилади. */
    function snapshotSimpleDraft(){
      var codes = activeCodes();
      var d2 = {
        date: m.querySelector("#ks-date").value || todayISO(),
        docNumber: Number(m.querySelector("#ks-num").value)||docNumber,
        methods: codes.map(function(c){ return {method:c, amount:Number(ms[c].amount)||0, usdAmount:isUsdMethod(c)?(Number(ms[c].usdAmount)||0):0, usdRate:isUsdMethod(c)?(Number(ms[c].usdRate)||0):0}; }),
        amount: codes.reduce(function(sm,c){ return sm+(Number(ms[c].amount)||0); },0),
        payType: (m.querySelector("#ks-paytype")||{}).value || (isKirim?"sotuv":"qolga_chiqim"),
        category: (m.querySelector("#ks-paytype")||{}).value || (isKirim?"sotuv":"qolga_chiqim"),
        categoryId: catEl ? catEl.value : (t.categoryId||""),
        bucket: bucketEl ? bucketEl.value : "",
        admWage: admWage,
        description: m.querySelector("#ks-note").value,
        counterpartyType: wagePick ? "employee" : (isKirim?"customer":"supplier"),
        counterpartyId: wagePick ? wagePick.id : ((m.querySelector("#ks-cp")||{}).value||""),
        counterpartyName: wagePick ? wagePick.name : "",
        cashier: t.cashier || ""
      };
      if(isEdit) d2.id = t.id;
      return d2;
    }
    function reopenWith(draft){ openKassaSimpleForm(accountId, direction, draft); }
    function openWagePayPicker(){
      var draft = snapshotSimpleDraft();
      closeModal();
      showWageModeModal(draft);
    }
    /* Икки тугмали танлов ойнаси — ҳар бир болa ойнадан «Бекор қилиш»
       босилганда ФАҚАТ БИР ҚАДАМ ортга, яъни шу ойнага қайтилади
       (2026-10-15 тузатиши). */
    function wageBucketOf(draft){ return (draft && draft.bucket) ? draft.bucket : "wage"; }
    function showWageModeModal(draft){
      var catName = draft.categoryId ? kassaCategoryName(draft.categoryId) : "";
      var isCash = (draft.methods||[]).length
        ? (draft.methods||[]).every(function(x){ return x.method==="naqd" || x.method==="dollar"; })
        : false;
      var avail = bucketAvailFor(draft.categoryId, wageBucketOf(draft));
      var body = '<div class="field-hint" style="margin-bottom:12px;">Категория: <b>'+esc(catName||"— танланмаган —")+'</b> · Тўлов усули: <b>'+(isCash?"Нақд":"Пул ўтказмаси / карта")+'</b> · Харажат тури: <b>'+esc(finBucketName(wageBucketOf(draft)))+'</b> · Ажратилган: <b>'+fmtSum(avail)+'</b></div>'+
        '<div style="display:flex;flex-direction:column;gap:10px;">'+
          '<button type="button" class="btn btn-primary" data-wage-mode="vedomost" style="justify-content:flex-start;padding:14px 16px;">'+ICONS.clipboard+'1) Ведомост бўйича</button>'+
          '<button type="button" class="btn btn-secondary" data-wage-mode="employee" style="justify-content:flex-start;padding:14px 16px;">'+ICONS.users+'2) Ходим бўйича</button>'+
        '</div>';
      var mm = openModal("Иш ҳақи тўлови", body, '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button>', false, function(){ reopenWith(draft); });
      mm.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); reopenWith(draft); });
      mm.querySelector('[data-wage-mode="vedomost"]').addEventListener("click", function(){
        closeModal();
        openVedomostPicker(draft, catName);
      });
      mm.querySelector('[data-wage-mode="employee"]').addEventListener("click", function(){
        closeModal();
        openWageEmployeePicker(catName, draft);
      });
    }
    /* «Ведомост бўйича» — БАРЧА ойлардаги ведомостлар рўйхати
       (2026-10-16 сўрови): тартиб рақами, санаси, қайси ойлиги, нақд ёки
       карталиги, ҳолати (тўланди / қисман тўланди — шунча қолди) ва
       «кўзча» тугмаси (ведомост қаердан шаклланганини кўрсатади).
       Сатрнинг ўзига босилганда — шу ведомост бўйича тўлов шакли очилади;
       у ерда ведомост суммасидан ортиқча тўлаб бўлмайди. */
    function openVedomostPicker(draft, catName, searchVal){
      var back = function(){ openVedomostPicker(draft, catName); };
      var wBucket = wageBucketOf(draft);
      var avail = bucketAvailFor(draft.categoryId, wBucket);
      var list = buildVedomostList(catName);
      var head = '<div class="card" style="padding:12px 14px;margin-bottom:12px;background:var(--surface-2);">'+
          '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13px;">'+
            '<span>Категория: <b>'+esc(catName||"— танланмаган —")+'</b></span>'+
            '<span>Шу категорияга ажратилган: <b style="color:'+(avail>0?"var(--good)":"var(--critical)")+';">'+fmtSum(avail)+'</b></span>'+
          '</div>'+
          (catName ? '<div class="field-hint" style="margin-top:6px;">Суммалар фақат «'+esc(catName)+'» категориясидаги ходимлар бўйича ҳисобланган.</div>' : '')+
          (avail<=0 ? '<div class="field-hint" style="color:var(--critical);font-weight:700;margin-top:6px;">Бу категорияга «'+esc(finBucketName(wBucket))+'» харажат туридан пул ажратилмаган — тўлов қилиб бўлмайди.</div>' : '')+
        '</div>'+
        '<div class="search-box" style="max-width:none;margin-bottom:12px;">'+ICONS.search+'<input type="text" id="vdp-search" placeholder="Ой, йил ёки ведомост рақами бўйича қидириш…" value="'+esc(searchVal||"")+'"></div>'+
        '<div id="vdp-list"></div>';
      var m3 = openModal("Ведомост бўйича тўлов — ведомостни танлаш", head,
        '<button class="btn btn-secondary" data-cancel>'+ICONS.arrowLeft+'Орқага</button>', true, function(){ showWageModeModal(draft); });
      m3.querySelector(".modal").classList.add("xwide");
      m3.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); showWageModeModal(draft); });
      var listEl3 = m3.querySelector("#vdp-list"), searchEl3 = m3.querySelector("#vdp-search");
      function paintVedomosts(){
        var q = String(searchEl3.value||"").trim().toLowerCase();
        var rows = list.filter(function(v){
          if(!q) return true;
          return (String(v.no)+" "+v.periodLabel+" "+v.kindName+" "+fmtDateShort(v.date)).toLowerCase().indexOf(q)>-1;
        }).slice().reverse();
        if(!rows.length){
          listEl3.innerHTML = '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">'+
            (list.length ? "Ҳеч нарса топилмади" : "Ҳали ведомост йўқ — аввал «Ходимлар → Иш ҳақи ҳисоблаш» бўлимида ҳисоблаш киритинг")+'</div>';
          return;
        }
        listEl3.innerHTML = '<div class="table-wrap"><table><thead><tr>'+
            '<th>№</th><th>Сана</th><th>Қайси ойлиги</th><th>Тури</th>'+
            '<th class="num">Сумма</th><th class="num">Тўланган</th><th>Ҳолати</th><th></th>'+
          '</tr></thead><tbody>'+
          rows.map(function(v){
            var st = vedomostStatus(v);
            var done = v.left<=0.004;
            return '<tr data-vd-row="'+esc(v.runId)+'|'+esc(v.kind)+'" style="cursor:'+(done?"default":"pointer")+';'+(done?"opacity:.62;":"")+'">'+
              '<td class="cell-strong">'+v.no+'</td>'+
              '<td>'+esc(fmtDateShort(v.date))+'</td>'+
              '<td class="cell-strong">'+esc(v.periodLabel)+'</td>'+
              '<td><span class="chip '+v.kindChip+'">'+esc(v.kindName)+'</span></td>'+
              '<td class="num cell-strong">'+fmtSum(v.total)+'</td>'+
              '<td class="num">'+fmtSum(v.paid)+'</td>'+
              '<td><span class="chip '+st.chip+'">'+esc(st.text)+'</span></td>'+
              '<td><button type="button" class="btn btn-ghost btn-icon" data-vd-eye="'+esc(v.runId)+'|'+esc(v.kind)+'" title="Ведомост қандай шаклланган">'+ICONS.eye+'</button></td>'+
            '</tr>';
          }).join("")+
        '</tbody></table></div>';
        var find = function(key){
          var parts = String(key||"").split("|");
          for(var i=0;i<list.length;i++){ if(list[i].runId===parts[0] && list[i].kind===parts[1]) return list[i]; }
          return null;
        };
        listEl3.querySelectorAll("[data-vd-eye]").forEach(function(btn){
          btn.addEventListener("click", function(e){
            e.stopPropagation();
            var v = find(btn.getAttribute("data-vd-eye")); if(!v) return;
            closeModal();
            openVedomostSourceModal(v, back);
          });
        });
        listEl3.querySelectorAll("[data-vd-row]").forEach(function(tr){
          tr.addEventListener("click", function(){
            var v = find(tr.getAttribute("data-vd-row")); if(!v) return;
            if(v.left<=0.004){ toast("Бу ведомост тўлиқ тўланган — ортиқча тўлов қилиб бўлмайди"); return; }
            if(avail<=0){ toast("«"+(catName||"—")+"» категориясида «"+finBucketName(wBucket)+"» турига ажратилган пул йўқ"); return; }
            closeModal();
            openKassaEmployeeBatchPayForm(accountId, null, {
              categoryName: catName,
              categoryId: draft.categoryId || "",
              bucket: wBucket,
              method: v.method,
              date: draft.date,
              vedomost: {runId: v.runId, kind: v.kind, catName: catName||""},
              onBack: back
            });
          });
        });
      }
      searchEl3.addEventListener("input", paintVedomosts);
      paintVedomosts();
      searchEl3.focus();
    }
    /* «Ходим бўйича» — юқорида қидирув, пастида АМАЛДА ИШЛАБ ТУРГАН
       ходимлар рўйхати (2026-10-15 сўрови). Фақат категорияси мос келган
       ходимни танлаш мумкин: масалан «Радиатор» ҳисобидан токар цех
       ходимига аванс/тўлов бериб бўлмайди. Категорияга ажратилган пул
       етмаса ҳам танлашга йўл берилмайди. */
    function openWageEmployeePicker(catName, draft, searchVal){
      var wBucket2 = wageBucketOf(draft);
      var avail = bucketAvailFor(draft.categoryId, wBucket2);
      var pool = STATE.employees.filter(function(e2){ return e2.status!=="bo'shagan"; })
        .slice().sort(function(a,b){ return (a.fullName||"").localeCompare(b.fullName||""); });
      var catOk = function(e2){
        if(!catName) return true;
        return String(e2.category||"").trim().toLowerCase()===catName.toLowerCase();
      };
      var head = '<div class="card" style="padding:12px 14px;margin-bottom:12px;background:var(--surface-2);">'+
          '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13px;">'+
            '<span>Категория: <b>'+esc(catName||"— танланмаган —")+'</b></span>'+
            '<span>Шу категорияга ажратилган: <b style="color:'+(avail>0?"var(--good)":"var(--critical)")+';">'+fmtSum(avail)+'</b></span>'+
          '</div>'+
          (avail<=0 ? '<div class="field-hint" style="color:var(--critical);font-weight:700;margin-top:6px;">Бу категорияга «'+esc(finBucketName(wBucket2))+'» харажат туридан пул ажратилмаган — тўлов/аванс бериб бўлмайди.</div>' : '')+
        '</div>'+
        '<div class="search-box" style="max-width:none;margin-bottom:12px;">'+ICONS.search+'<input type="text" id="wep-search" placeholder="Ходимни исми ёки лавозими бўйича қидириш…" value="'+esc(searchVal||"")+'"></div>'+
        '<div id="wep-list"></div>';
      var m2 = openModal("Ходим бўйича тўлов — ходимни танлаш", head,
        '<button class="btn btn-secondary" data-cancel>'+ICONS.arrowLeft+'Орқага</button>', true, function(){ showWageModeModal(draft); });
      m2.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); showWageModeModal(draft); });
      var listEl = m2.querySelector("#wep-list"), searchEl = m2.querySelector("#wep-search");
      function paintList(){
        var q = String(searchEl.value||"").trim().toLowerCase();
        var rows = pool.filter(function(e2){
          if(!q) return true;
          return ((e2.fullName||"")+" "+(e2.position||"")+" "+(e2.category||"")).toLowerCase().indexOf(q)>-1;
        });
        if(!rows.length){ listEl.innerHTML = '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Ходим топилмади</div>'; return; }
        listEl.innerHTML = rows.map(function(e2){
          var ok = catOk(e2);
          return '<div class="alert-row" data-emp-pick="'+e2.id+'" style="cursor:pointer;'+(ok?'':'opacity:.55;')+'">'+
            '<div class="grow"><div class="t">'+esc(e2.fullName)+'</div>'+
              '<div class="s">'+esc(e2.category||"категория йўқ")+(e2.position?(" · "+esc(e2.position)):"")+'</div></div>'+
            (ok ? '' : '<span class="chip chip-neutral">бошқа категория</span>')+
          '</div>';
        }).join("");
        listEl.querySelectorAll("[data-emp-pick]").forEach(function(row){ row.addEventListener("click", function(){
          var emp = employeeById(row.getAttribute("data-emp-pick"));
          if(!emp) return;
          if(!catOk(emp)){
            toast("«"+(emp.category||"категорияси йўқ")+"» ходимига «"+(catName||"—")+"» ҳисобидан тўлов қилиб бўлмайди");
            return;
          }
          if(avail<=0){
            toast("«"+(catName||"—")+"» категориясида «"+finBucketName(wBucket2)+"» турига ажратилган пул йўқ");
            return;
          }
          var d3 = Object.assign({}, draft);
          d3.counterpartyType="employee"; d3.counterpartyId=emp.id; d3.counterpartyName=emp.fullName;
          closeModal();
          reopenWith(d3);
        }); });
      }
      searchEl.addEventListener("input", paintList);
      paintList();
      searchEl.focus();
    }
    function totalSom(){
      var s = 0;
      activeCodes().forEach(function(c){ s += Number(ms[c].amount)||0; });
      return s;
    }
    function bucketAvailFor(categoryId, bucket){ return finBucketAvailFor(categoryId, bucket); }
    function bucketAvail(){
      if(!bucketEl || !bucketEl.value) return 0;
      return bucketAvailFor(catEl ? catEl.value : "", bucketEl.value);
    }
    function paintTotal(){ totalEl.textContent = fmtSum(totalSom()); }
    function paintRows(){
      var codes = activeCodes();
      rowsEl.innerHTML = codes.length
        ? codes.map(function(c){
            return methodAmountRowHtml("ks", c, ms[c])+
              '<div class="field-hint" style="margin:-6px 0 10px;">«'+paymentMethodLabel(c)+'» бўйича кассада: '+
                (isUsdMethod(c)?fmtUsd(kassaMethodBalanceAll(c)):fmtSum(kassaMethodBalanceAll(c)))+'</div>';
          }).join("")
        : '<div class="field-hint">Камида битта тўлов усулини танланг.</div>';
      codes.forEach(function(c){
        if(isUsdMethod(c)){
          wireDollarAutoCalc("ks", c);
          var usdEl = m.querySelector("#ks-usd-"+c), rateEl = m.querySelector("#ks-rate-"+c), amtEl = m.querySelector("#ks-amt-"+c);
          if(usdEl) usdEl.addEventListener("input", function(){ ms[c].usdAmount = Number(usdEl.value)||0; setTimeout(function(){ ms[c].amount = Number(amtEl.value)||0; paintTotal(); }, 0); });
          if(rateEl) rateEl.addEventListener("input", function(){ ms[c].usdRate = Number(rateEl.value)||0; setTimeout(function(){ ms[c].amount = Number(amtEl.value)||0; paintTotal(); }, 0); });
          if(amtEl) amtEl.addEventListener("input", function(){ ms[c].amount = Number(amtEl.value)||0; paintTotal(); });
        } else {
          var aEl = m.querySelector("#ks-amt-"+c);
          if(aEl) aEl.addEventListener("input", function(){ ms[c].amount = Number(aEl.value)||0; paintTotal(); });
        }
      });
      paintTotal();
    }
    m.querySelectorAll('[data-methodgroup="ks"] .method-toggle').forEach(function(btn){
      btn.addEventListener("click", function(){
        var code = btn.getAttribute("data-method");
        ms[code].active = !ms[code].active;
        btn.classList.toggle("active", ms[code].active);
        if(!ms[code].active){ ms[code].amount = 0; ms[code].usdAmount = 0; }
        paintRows();
      });
    });
    function paintBucketBal(){
      if(!bucketBalEl) return;
      var txt = bucketEl.value
        ? "Молия бўлимида ажратилган: "+fmtSum(bucketAvail())
        : "Молия бўлимида ажратилган суммани кўриш учун харажат турини танланг.";
      if(catEl && catEl.value===FIN_ADMIN_CAT && bucketEl.value==="admin_main" && !admWage){
        txt += " · Иш ҳақи тўлови учун пастдаги галочкани белгиланг.";
      }
      bucketBalEl.textContent = txt;
    }
    if(catEl) catEl.addEventListener("change", function(){
      var cur = bucketEl ? bucketEl.value : "";
      if(bucketEl){
        var allowed = finBucketsFor(catEl.value).map(function(b){ return b.key; });
        bucketEl.innerHTML = ksBucketOpts(catEl.value, allowed.indexOf(cur)>-1 ? cur : "");
      }
      paintBucketBal(); paintCpField();
    });
    if(bucketEl) bucketEl.addEventListener("change", function(){ paintBucketBal(); paintCpField(); });
    if(payTypeEl && catEl) payTypeEl.addEventListener("change", function(){ paintBucketBal(); paintCpField(); });
    
    paintRows(); paintBucketBal(); paintCpField();

    m.querySelector("[data-save]").addEventListener("click", function(){
      var codes = activeCodes();
      if(!codes.length){ toast("Тўлов усулини танланг"); return; }
      var bad = codes.filter(function(c){ return (isUsdMethod(c) ? (Number(ms[c].usdAmount)||0) : (Number(ms[c].amount)||0)) <= 0; });
      if(bad.length){ toast("«"+paymentMethodLabel(bad[0])+"» бўйича суммани киритинг"); return; }
      var badRate = codes.filter(function(c){ return isUsdMethod(c) && (Number(ms[c].usdRate)||0)<=0; });
      if(badRate.length){ toast("«"+paymentMethodLabel(badRate[0])+"» бўйича доллар курсини киритинг"); return; }
      if(direction==="chiqim"){
        for(var i=0;i<codes.length;i++){
          var c = codes[i];
          var need = isUsdMethod(c) ? (Number(ms[c].usdAmount)||0) : (Number(ms[c].amount)||0);
          var have = kassaMethodBalanceAll(c);
          var oldQty = 0;
          if(isEdit){
            var om = (t.methods||[]).find(function(x){ return x.method===c; });
            if(om) oldQty = isUsdMethod(c) ? (Number(om.usdAmount)||0) : (Number(om.amount)||0);
          }
          if(need > have+oldQty+0.004){
            toast("«"+paymentMethodLabel(c)+"» бўйича кассада етарли пул йўқ. Қолдиқ: "+(isUsdMethod(c)?fmtUsd(have):fmtSum(have)));
            return;
          }
        }
        if(bucketEl && bucketEl.value){
          var avail = bucketAvail();
          var oldSom = isEdit ? (Number(t.amount)||0) : 0;
          if(totalSom() > avail+oldSom+0.004){
            toast("«"+finBucketName(bucketEl.value)+"» харажат турида ажратилган сумма етарли эмас. Мавжуд: "+fmtSum(avail));
            return;
          }
        }
      }
      var cpEl = m.querySelector("#ks-cp");
      var cpId = cpEl ? cpEl.value : "";
      var cpName = cpId ? (cpEl.options[cpEl.selectedIndex].textContent||"") : "";
      var cpType = isKirim ? "customer" : "supplier";
      var selBucket = bucketEl ? bucketEl.value : "";
      var isAdminWage = !isKirim && catEl && catEl.value===FIN_ADMIN_CAT && selBucket==="admin_main" && admWage;
      if(!isKirim && (selBucket==="wage" || isAdminWage)){
        if(!wagePick){ toast("«Ведомост бўйича» ёки «Ходим бўйича» танланг"); return; }
        cpType = "employee"; cpId = wagePick.id; cpName = wagePick.name;
      }
      /* «Бошқарув бўлими → Администрация» галочкасиз бўлса — тўлов
         «Бошқа харажатлар» харажат турига олинади (2026-10-17). */
      var saveBucket = selBucket;
      if(!isKirim && catEl && catEl.value===FIN_ADMIN_CAT && selBucket==="admin_main" && !admWage) saveBucket = "other";
      var methodsOut = codes.map(function(c){
        return {method:c, amount:Number(ms[c].amount)||0, usdAmount:isUsdMethod(c)?(Number(ms[c].usdAmount)||0):0, usdRate:isUsdMethod(c)?(Number(ms[c].usdRate)||0):0};
      });
      var data = {
        cashAccountId: accountId,
        direction: direction,
        docNumber: Number(m.querySelector("#ks-num").value)||docNumber,
        date: m.querySelector("#ks-date").value||todayISO(),
        amount: totalSom(),
        methods: methodsOut,
        payType: payTypeEl ? (payTypeEl.value||"") : (isKirim ? (t.payType||"sotuv") : "qolga_chiqim"),
        category: payTypeEl ? (payTypeEl.value||"") : (isKirim ? (t.category||"sotuv") : "qolga_chiqim"),
        categoryId: catEl ? catEl.value : (t.categoryId||""),
        bucket: saveBucket,
        admWage: !isKirim ? admWage : undefined,
        counterpartyType: cpType,
        counterpartyId: cpId, counterpartyName: cpName,
        description: m.querySelector("#ks-note").value.trim(),
        cashier: t.cashier || kassaCashierName(),
        cancelled: isEdit ? !!t.cancelled : false
      };
      if(isEdit && t.bizCount!==undefined) data.bizCount = t.bizCount;
      var usdRow = methodsOut.filter(function(x){ return isUsdMethod(x.method) && x.usdRate>0; })[0];
      if(usdRow) STATE.lastUsdRate = usdRow.usdRate;
      if(isEdit){
        /* Фойдаланувчи сўровига кўра (2026-10-17): таҳрирлаб сақланганда
           амал ЯНГИ ВЕРСИЯ сифатида сақланади — эски ёзув базада
           сақланиб қолади (archived), ҳисоб-китобларда қатнашмайди ва
           рўйхатда кўрсатилмайди, лекин «кўзча» ичидаги версиялар
           тарихида кўринади. */
        var newId = uid();
        data.version = (Number(t.version)||1)+1;
        data.prevVersionId = t.id;
        data.origId = t.origId || t.id;
        data.createdAt = t.createdAt || new Date().toISOString();
        data.cancelled = !!t.cancelled;
        data.archived = false;
        if(t.batchGroupId) data.batchGroupId = t.batchGroupId;
        dbUpdate("cashTransactions", t.id, {archived:true, cancelled:true, supersededBy:newId}, STATE.cashTransactions);
        dbSet("cashTransactions", newId, data, STATE.cashTransactions);
        toast("Сақланди — "+data.version+"-версия яратилди");
      } else {
        data.createdAt = new Date().toISOString();
        dbAdd("cashTransactions", data, STATE.cashTransactions);
        toast(isKirim?"Кирим қилинди":"Чиқим қилинди");
      }
      /* Амал шу кунда кўриниши учун ҳисобот кунини ўша санага кўчирамиз. */
      STATE.kassaDay = data.date;
      closeModal();
      render();
    });
  }



  /* ---- reusable payment-method widgets (used by Кирим/Чиқим, Конвертация, Кўчирма) ---- */
  function methodTogglesHtml(prefix, activeList){
    return '<div class="seg" data-methodgroup="'+prefix+'">'+PAYMENT_METHODS.map(function(pm){
      return '<button type="button" class="method-toggle'+(activeList.indexOf(pm[0])>-1?" active":"")+'" data-method="'+pm[0]+'">'+pm[1]+'</button>';
    }).join("")+'</div>';
  }
  function methodAmountRowHtml(prefix, method, vals){
    vals = vals || {};
    if(isUsdMethod(method)){
      return '<div class="field-row" data-methodrow="'+method+'">'+
        '<div class="field"><label>'+paymentMethodLabel(method)+' суммаси ($)</label><input type="number" min="0" step="any" id="'+prefix+'-usd-'+method+'" value="'+(vals.usdAmount||0)+'"></div>'+
        '<div class="field"><label>Доллар курси (сўм)</label><input type="number" min="0" step="any" id="'+prefix+'-rate-'+method+'" value="'+(vals.usdRate||STATE.lastUsdRate||0)+'"></div></div>'+
        '<div class="field" data-methodrow="'+method+'-sum"><label>Сўм эквивалент <span class="opt">(автомат ҳисобланади, керак бўлса тузатиш мумкин)</span></label><input type="number" min="0" step="any" id="'+prefix+'-amt-'+method+'" value="'+(vals.amount||0)+'"></div>';
    }
    return '<div class="field" data-methodrow="'+method+'"><label>'+paymentMethodLabel(method)+' суммаси (сўм)</label><input type="number" min="0" step="any" id="'+prefix+'-amt-'+method+'" value="'+(vals.amount||0)+'"></div>';
  }
  function wireDollarAutoCalc(prefix, method){
    method = method || "dollar";
    var usdEl=document.getElementById(prefix+"-usd-"+method), rateEl=document.getElementById(prefix+"-rate-"+method), amtEl=document.getElementById(prefix+"-amt-"+method);
    if(!usdEl||!rateEl||!amtEl) return;
    var recalc = function(){ amtEl.value = Math.round((Number(usdEl.value)||0)*(Number(rateEl.value)||0)); };
    usdEl.addEventListener("input", recalc);
    rateEl.addEventListener("input", recalc);
  }

  /* ---- counterparty (mijoz/ta'minotchi) picker + quick-add ---- */
  function cashCounterpartyOptionsHtml(){
    var names = {};
    STATE.customers.forEach(function(c){ if(c.name) names[c.name]=1; });
    STATE.suppliers.forEach(function(s){ if(s.name) names[s.name]=1; });
    return Object.keys(names).sort().map(function(n){ return '<option value="'+esc(n)+'">'; }).join("");
  }
  function resolveCounterpartyByName(name){
    name = (name||"").trim();
    if(!name) return null;
    var cust = STATE.customers.find(function(c){ return (c.name||"").trim().toLowerCase()===name.toLowerCase(); });
    if(cust) return {type:"customer", id:cust.id, name:cust.name};
    var sup = STATE.suppliers.find(function(s){ return (s.name||"").trim().toLowerCase()===name.toLowerCase(); });
    if(sup) return {type:"supplier", id:sup.id, name:sup.name};
    return null;
  }
  /* 2026-10-03 сўровига кўра соддалаштирилди: эски (Исми/Фамилияси/Изоҳ,
     сегмент-тугмали тури) шакл бутунлай олиб ташланди — энди фақат номи
     (мажбурий), манзили/ИНН/телефон (ҳаммаси ихтиёрий), ва пастда
     "Харидор"/"Етказиб берувчи" галочкалари (бири белгиланса — иккинчиси
     автомат олиб ташланади, доим фақат биттаси белгиланган бўлади) —
     белгиланган турига қараб тегишли рўйхатга (STATE.customers ёки
     STATE.suppliers) автомат қўшилади. */
  function openCashCounterpartyQuickForm(defaultType, onSaved){
    var body = '<div class="field"><label>Харидор ёки етказиб берувчи номи</label><input id="ccp-name" placeholder="Номи"></div>'+
      '<div class="field"><label>Манзили <span class="opt">(ихтиёрий)</span></label><input id="ccp-address"></div>'+
      '<div class="field-row"><div class="field"><label>ИНН <span class="opt">(ихтиёрий)</span></label><input id="ccp-inn"></div>'+
      '<div class="field"><label>Телефон рақами <span class="opt">(ихтиёрий)</span></label><input id="ccp-phone" placeholder="+998 90 123 45 67"></div></div>'+
      '<div class="field"><label>Тури</label>'+
        '<div style="display:flex;gap:20px;margin-top:4px;">'+
          '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:600;"><input type="checkbox" id="ccp-type-customer" style="width:17px;height:17px;"> Харидор</label>'+
          '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:600;"><input type="checkbox" id="ccp-type-supplier" style="width:17px;height:17px;"> Етказиб берувчи</label>'+
        '</div>'+
      '</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Қўшиш</button>';
    var m = openModal("Янги харидор ёки етказиб берувчи қўшиш", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var selType = defaultType==="supplier" ? "supplier" : "customer";
    var custCb = m.querySelector("#ccp-type-customer"), supCb = m.querySelector("#ccp-type-supplier");
    custCb.checked = selType==="customer"; supCb.checked = selType==="supplier";
    /* Галочкалар бир-бирини истисно қилади (доим фақат биттаси
       белгиланган) — иккинчисини белгиласа аввалгиси автомат ўчади,
       белгиланганини ўчириб бўлмайди (ҳеч қайсиси белгиланмаган ҳолат
       бўлмаслиги учун). */
    custCb.addEventListener("change", function(){ if(custCb.checked){ selType="customer"; supCb.checked=false; } else { custCb.checked=true; } });
    supCb.addEventListener("change", function(){ if(supCb.checked){ selType="supplier"; custCb.checked=false; } else { supCb.checked=true; } });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#ccp-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var data = {name:name, phone:m.querySelector("#ccp-phone").value.trim(), address:m.querySelector("#ccp-address").value.trim(), inn:m.querySelector("#ccp-inn").value.trim(), note:"", bankAccount:"", bankName:"", mfo:"", contactPerson:"", createdAt:new Date().toISOString()};
      var coll = selType==="supplier" ? "suppliers" : "customers";
      var localArr = selType==="supplier" ? STATE.suppliers : STATE.customers;
      dbAdd(coll, data, localArr);
      var newId = localArr[0] ? localArr[0].id : null;
      toast("Сақланди");
      closeModal();
      if(onSaved) onSaved(newId, name, selType);
    });
  }

  /* Харидор ёки етказиб берувчини танлаш (Касса "Кирим"/"Чиқим" ичидаги
     контрагент майдони учун, 2026-10-03 сўровига кўра қўшилди) — тепада
     икки бўлим: 1) Харидор, 2) Етказиб берувчи, ҳар бирида қидириш
     катаги ва пастда рўйхат; рўйхатдан танланганда onPicked(type, obj)
     чақирилади. */
  function openKassaCounterpartyPickerModal(defaultType, onPicked, onCancel){
    var pickType = (defaultType==="supplier") ? "supplier" : "customer";
    var body = '<div class="seg" style="margin-bottom:12px;">'+
        '<button type="button" class="kcp-type" data-type="customer">Харидор</button>'+
        '<button type="button" class="kcp-type" data-type="supplier">Етказиб берувчи</button>'+
      '</div>'+
      personSelectSearchBoxHtml("kcp-search")+
      '<div id="kcp-list" style="max-height:420px;overflow-y:auto;margin-top:8px;"></div>';
    var m = openModal("Харидор ёки етказиб берувчини танлаш", body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', true, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    function renderList(){
      var list = pickType==="customer" ? STATE.customers : STATE.suppliers;
      var sorted = list.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
      var listEl = m.querySelector("#kcp-list");
      if(!sorted.length){
        listEl.innerHTML = emptyState(pickType==="customer"?"Ҳали харидор йўқ":"Ҳали етказиб берувчи йўқ", "Асосий ойнадаги \"+\" тугмаси орқали қўшинг.");
        return;
      }
      listEl.innerHTML = sorted.map(function(p){
        return '<div class="ocp-row" data-id="'+p.id+'" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;">'+
          '<div style="flex:1;min-width:0;font-weight:700;">'+esc(p.name)+'</div>'+ICONS.arrowRight+
          '</div>';
      }).join("");
      listEl.querySelectorAll(".ocp-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var picked = list.find(function(x){return x.id===rowEl.getAttribute("data-id");});
          if(!picked) return;
          closeModal();
          onPicked(pickType, picked);
        });
      });
      var q = (m.querySelector("#kcp-search").value||"").trim().toLowerCase();
      if(q){
        listEl.querySelectorAll(".ocp-row").forEach(function(rowEl){
          var txt = (rowEl.textContent||"").toLowerCase();
          rowEl.style.display = txt.indexOf(q)>-1 ? "" : "none";
        });
      }
    }
    m.querySelectorAll(".kcp-type").forEach(function(b){
      if(b.getAttribute("data-type")===pickType) b.classList.add("active");
      b.addEventListener("click", function(){
        pickType = b.getAttribute("data-type");
        m.querySelectorAll(".kcp-type").forEach(function(b2){ b2.classList.toggle("active", b2===b); });
        m.querySelector("#kcp-search").value = "";
        renderList();
      });
    });
    m.querySelector("#kcp-search").addEventListener("input", renderList);
    renderList();
  }

  /* ---- 1) Кирим ва 2) Чиқим ---- */
  function openKassaLedgerForm(accountId, direction, existing){
    var isEdit = !!(existing && existing.id);
    var t = existing || {date:todayISO(), counterpartyName:"", methods:[], description:""};
    var initialCpType = (t.counterpartyType==="employee") ? "employee" : "outer";
    var methodState = {};
    PAYMENT_METHODS.forEach(function(pm){ methodState[pm[0]] = {active:false, amount:0, usdAmount:0, usdRate:STATE.lastUsdRate||0}; });
    if(t.methods && t.methods.length){
      t.methods.forEach(function(mm){
        if(!methodState[mm.method]) return;
        methodState[mm.method].active = true;
        methodState[mm.method].amount = Number(mm.amount)||0;
        methodState[mm.method].usdAmount = Number(mm.usdAmount)||0;
        methodState[mm.method].usdRate = Number(mm.usdRate)||STATE.lastUsdRate||0;
      });
    } else if(Number(t.amount)>0){
      methodState.naqd.active = true;
      methodState.naqd.amount = Number(t.amount)||0;
    }
    var activeCodes = function(){ return PAYMENT_METHODS.filter(function(pm){return methodState[pm[0]].active;}).map(function(pm){return pm[0];}); };

    var body = '<div class="field-row"><div class="field"><label>Сана</label><input id="kl-date" type="date" value="'+esc(t.date||todayISO())+'"></div>'+
      '<div class="field"><label>Контрагент <span class="opt">(ихтиёрий)</span></label>'+
        '<div class="seg" style="margin-bottom:8px;max-width:320px;">'+
          '<button type="button" class="kl-cp-type" data-cptype="outer" id="kl-cp-type-outer">Харидор ёки Етказиб берувчи</button>'+
          '<button type="button" class="kl-cp-type" data-cptype="employee">Ходим</button>'+
        '</div>'+
        /* 2026-10-03 сўровига кўра: номини қўлда ёзиладиган катак
           (input+datalist) ўрнига — "Харидор номи" катаги каби,
           босилганда 2 бўлимли (Харидор / Етказиб берувчи, қидириш ва
           рўйхат билан) танлов ойнаси очиладиган тугма; танлангандан
           кейин юқоридаги "Харидор ёки Етказиб берувчи" сузи худди шу
           танланган турнинг номига (фақат "Харидор" ёки фақат "Етказиб
           берувчи") алмашади. */
        '<div id="kl-cp-outer" style="display:flex;gap:6px;"><button type="button" class="btn btn-secondary" id="kl-counterparty-pick" style="flex:1;min-width:0;justify-content:flex-start;font-weight:600;"></button><button type="button" class="btn btn-secondary btn-icon" id="kl-counterparty-add" title="Янги харидор ёки етказиб берувчи қўшиш">'+ICONS.plus+'</button></div>'+
        '<div id="kl-cp-employee" style="display:none;">'+personSelectSearchBoxHtml("kl-emp-search")+'<select id="kl-emp-select"><option value="">— танланг —</option>'+
          STATE.employees.slice().sort(function(a,b){return (a.fullName||"").localeCompare(b.fullName||"");}).map(function(e){
            return '<option value="'+e.id+'"'+(initialCpType==="employee"&&t.counterpartyId===e.id?" selected":"")+'>'+esc(e.fullName)+(e.position?(" — "+esc(e.position)):"")+'</option>';
          }).join("")+
        '</select>'+
        (direction==="chiqim" ? ('<div id="kl-emp-paytype" style="margin-top:10px;">'+
          '<div class="field-hint" style="margin-bottom:6px;">Тўлов тури — танланиши шарт</div>'+
          '<div class="seg"><button type="button" class="kl-emp-paytype-btn" data-paytype="avans">Аванс</button>'+
          '<button type="button" class="kl-emp-paytype-btn" data-paytype="oylik">Ойлик</button></div>'+
        '</div>') : '')+
        '</div>'+
      '</div>'+
      '<div class="field"><label>Тўлов усуллари <span class="opt">(бир нечтасини бирга танлаш мумкин)</span></label>'+methodTogglesHtml("kl", activeCodes())+'</div>'+
      '<div id="kl-rows">'+activeCodes().map(function(mCode){return methodAmountRowHtml("kl", mCode, methodState[mCode]);}).join("")+'</div>'+
      '<div class="field" style="margin-top:-6px;"><div class="field-hint">Жами: <span id="kl-total" style="font-weight:700;color:var(--ink);">0 сўм</span></div></div>'+
      '<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700;"><input type="checkbox" id="kl-bizflag" style="width:17px;height:17px;"'+(t.bizCount?" checked":"")+'> '+(direction==="kirim"?"Корхона даромадига олинсин":"Корхона харажатига олинсин")+'</label></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="kl-note">'+esc(t.description||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var title = (direction==="kirim"?"Кирим":"Чиқим") + (isEdit?" — таҳрирлаш":" — яратиш");
    var m = openModal(title, body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var cpType = initialCpType;
    /* 2026-10-03 сўровига кўра: танланган Харидор/Етказиб берувчининг
       ўзи (матн ўрнига) — {type, id, name}. Таҳрирлашда (isEdit) ва
       контрагент турдаги (employee эмас) бўлса, мавжуд қийматдан
       тикланади. */
    var selectedCp = (initialCpType==="outer" && (t.counterpartyType==="customer"||t.counterpartyType==="supplier"))
      ? {type:t.counterpartyType, id:t.counterpartyId||"", name:t.counterpartyName||""}
      : {type:"", id:"", name:""};
    function applyCpOuterLabelUI(){
      var typeBtn = m.querySelector("#kl-cp-type-outer");
      if(typeBtn) typeBtn.textContent = selectedCp.type==="customer" ? "Харидор" : (selectedCp.type==="supplier" ? "Етказиб берувчи" : "Харидор ёки Етказиб берувчи");
      var pickBtn = m.querySelector("#kl-counterparty-pick");
      if(pickBtn) pickBtn.innerHTML = selectedCp.name ? esc(selectedCp.name) : '<span class="cell-muted">— Харидор ёки етказиб берувчини танланг —</span>';
    }
    /* "Аванс"/"Ойлик" — Ходимга Чиқим берилаётганда мажбурий танлов:
       "Ойлик" танланса, ёзув category="ish_haqi" (+ payrollYear/
       payrollMonth тегги, сана асосида) билан сақланади — бу орқали
       у худди Кассадаги «Ходимлар бўйича» батч тўлови каби Ҳисобот/
       Акт сверкадаги «Ойлик тўланган (расмий)»/«Накд туланди» ва
       Иш ҳақи ҳисоблашдаги авто-карта-аванс ҳисоб-китобларига тўғри
       тушади; "Аванс" танланса — аввалги умумий "qolga_chiqim"
       категорияси сақланиб қолади (ўзгаришсиз, эски хатти-ҳаракат). */
    var empPayType = (isEdit && direction==="chiqim" && t.counterpartyType==="employee") ? (t.category==="ish_haqi"?"oylik":"avans") : "";
    function applyEmpPayTypeUI(){
      m.querySelectorAll(".kl-emp-paytype-btn").forEach(function(b){ b.classList.toggle("active", b.getAttribute("data-paytype")===empPayType); });
    }
    function applyCpTypeUI(){
      m.querySelectorAll(".kl-cp-type").forEach(function(b){ b.classList.toggle("active", b.getAttribute("data-cptype")===cpType); });
      var outerEl = m.querySelector("#kl-cp-outer"), empEl = m.querySelector("#kl-cp-employee");
      if(outerEl) outerEl.style.display = cpType==="employee" ? "none" : "flex";
      if(empEl) empEl.style.display = cpType==="employee" ? "" : "none";
      var paytypeEl = m.querySelector("#kl-emp-paytype");
      if(paytypeEl) paytypeEl.style.display = cpType==="employee" ? "" : "none";
    }
    m.querySelectorAll(".kl-cp-type").forEach(function(b){
      b.addEventListener("click", function(){
        var newType = b.getAttribute("data-cptype");
        /* Контрагент тури ҳар сафар алмаштирилганда (ёки қайта
           танланганда) "Аванс/Ойлик" танлови қайта бошидан танланиши
           шарт — эски танлов сирғалиб қолмаслиги учун (фақат таҳрирлаш
           режимида дастлабки очилишдаги қиймат юқорида сақланган). */
        if(newType!==cpType) empPayType = "";
        cpType = newType;
        applyCpTypeUI(); applyEmpPayTypeUI();
      });
    });
    applyCpTypeUI(); applyEmpPayTypeUI(); applyCpOuterLabelUI();
    m.querySelectorAll(".kl-emp-paytype-btn").forEach(function(b){
      b.addEventListener("click", function(){ empPayType = b.getAttribute("data-paytype"); applyEmpPayTypeUI(); });
    });
    wireItemSelectSearch("kl-emp-search", "kl-emp-select");
    /* Жорий шакл ҳолатининг тўлиқ "суратини" олиш — Харидор/Етказиб
       берувчи танлаш ёки "+" орқали янгисини қўшишда бутун "Кирим/Чиқим"
       ойнаси ёпилиб, кейин худди шу киритилган қийматлар билан (фақат
       контрагент янгиланган ҳолда) қайта очилади учун (2026-10-03). */
    function snapshotLedgerDraft(){
      var snap = {
        date: m.querySelector("#kl-date").value,
        counterpartyName: selectedCp.name, counterpartyType: selectedCp.type, counterpartyId: selectedCp.id,
        description: m.querySelector("#kl-note").value,
        bizCount: m.querySelector("#kl-bizflag").checked,
        methods: activeCodes().map(function(mCode){ var s=methodState[mCode]; return {method:mCode, amount:s.amount, usdAmount:s.usdAmount, usdRate:s.usdRate}; })
      };
      if(isEdit) snap.id = t.id;
      return snap;
    }
    m.querySelector("#kl-counterparty-pick").addEventListener("click", function(){
      var snapshot = snapshotLedgerDraft();
      closeModal();
      openKassaCounterpartyPickerModal(direction==="kirim"?"customer":"supplier", function(type, picked){
        snapshot.counterpartyType = type; snapshot.counterpartyId = picked.id; snapshot.counterpartyName = picked.name;
        openKassaLedgerForm(accountId, direction, snapshot);
      }, function(){ openKassaLedgerForm(accountId, direction, snapshot); });
    });

    function recomputeTotal(){
      var total = 0;
      activeCodes().forEach(function(mCode){ total += Number(methodState[mCode].amount)||0; });
      var totalEl = m.querySelector("#kl-total");
      if(totalEl) totalEl.textContent = fmtSum(total);
    }
    function wireRows(){
      activeCodes().forEach(function(mCode){
        if(isUsdMethod(mCode)){
          wireDollarAutoCalc("kl", mCode);
          var usdEl=m.querySelector("#kl-usd-"+mCode), rateEl=m.querySelector("#kl-rate-"+mCode), amtEl=m.querySelector("#kl-amt-"+mCode);
          if(usdEl) usdEl.addEventListener("input", function(){ methodState[mCode].usdAmount=Number(usdEl.value)||0; setTimeout(function(){ methodState[mCode].amount=Number(amtEl.value)||0; recomputeTotal(); },0); });
          if(rateEl) rateEl.addEventListener("input", function(){ methodState[mCode].usdRate=Number(rateEl.value)||0; setTimeout(function(){ methodState[mCode].amount=Number(amtEl.value)||0; recomputeTotal(); },0); });
          if(amtEl) amtEl.addEventListener("input", function(){ methodState[mCode].amount=Number(amtEl.value)||0; recomputeTotal(); });
        } else {
          var amtEl2 = m.querySelector("#kl-amt-"+mCode);
          if(amtEl2) amtEl2.addEventListener("input", function(){ methodState[mCode].amount=Number(amtEl2.value)||0; recomputeTotal(); });
        }
      });
    }
    function renderRows(){
      m.querySelector("#kl-rows").innerHTML = activeCodes().map(function(mCode){return methodAmountRowHtml("kl", mCode, methodState[mCode]);}).join("");
      wireRows();
      recomputeTotal();
    }
    m.querySelectorAll(".method-toggle").forEach(function(btn){
      btn.addEventListener("click", function(){
        var mCode = btn.getAttribute("data-method");
        methodState[mCode].active = !methodState[mCode].active;
        btn.classList.toggle("active", methodState[mCode].active);
        renderRows();
      });
    });
    wireRows();
    recomputeTotal();

    m.querySelector("#kl-counterparty-add").addEventListener("click", function(){
      var snapshot = snapshotLedgerDraft();
      closeModal();
      openCashCounterpartyQuickForm(direction==="kirim"?"customer":"supplier", function(id, name, selType){
        snapshot.counterpartyType = selType; snapshot.counterpartyId = id; snapshot.counterpartyName = name;
        openKassaLedgerForm(accountId, direction, snapshot);
      });
    });

    m.querySelector("[data-save]").addEventListener("click", function(){
      var methodsOut = activeCodes().map(function(mCode){
        var s = methodState[mCode];
        return {method:mCode, amount:Number(s.amount)||0, usdAmount:isUsdMethod(mCode)?(Number(s.usdAmount)||0):0, usdRate:isUsdMethod(mCode)?(Number(s.usdRate)||0):0};
      }).filter(function(mm){ return mm.amount>0 || mm.usdAmount>0; });
      if(!methodsOut.length){ toast("Камида битта тўлов усули бўйича суммани киритинг"); return; }
      if(direction==="chiqim"){
        for(var mi=0; mi<methodsOut.length; mi++){
          var mmChk = methodsOut[mi];
          var valChk = isUsdMethod(mmChk.method) ? mmChk.usdAmount : mmChk.amount;
          if(valChk<=0) continue;
          var availChk = cashMethodBalance(accountId, mmChk.method);
          /* Таҳрирлашда — эски ёзувнинг ўзи ҳали "харажат" сифатида
             ҳисобга олинган, шунга уни қайтариб қўшамиз (у энги янги
             қиймат билан алмаштирилади), акс ҳолда ўзгартирмасдан
             сақлаганда ҳам "етарли эмас" деб чиқиб қолиши мумкин. */
          if(isEdit) availChk += txMethodValue(t, mmChk.method);
          if(valChk>availChk){
            toast("Кассада пул етарли эмас — "+paymentMethodLabel(mmChk.method)+" бўйича қолдиқ: "+(isUsdMethod(mmChk.method)?fmtUsd(availChk):fmtSum(availChk)));
            return;
          }
        }
      }
      var total = methodsOut.reduce(function(s,mm){ return s+(Number(mm.amount)||0); }, 0);
      var counterpartyName = "", counterpartyType = "", counterpartyId = "";
      if(cpType==="employee"){
        var empSelEl = m.querySelector("#kl-emp-select");
        var empSel = empSelEl && empSelEl.value ? employeeById(empSelEl.value) : null;
        if(empSel){ counterpartyName = empSel.fullName; counterpartyType = "employee"; counterpartyId = empSel.id; }
      } else {
        counterpartyName = selectedCp.name||""; counterpartyType = selectedCp.type||""; counterpartyId = selectedCp.id||"";
      }
      /* Ходимга Чиқим бўлса — "Аванс" ёки "Ойлик" танланиши МАЖБУРИЙ,
         акс ҳолда операция сақланмайди. */
      if(direction==="chiqim" && cpType==="employee" && counterpartyType==="employee" && (empPayType!=="avans" && empPayType!=="oylik")){
        toast("Илтимос, «Аванс» ёки «Ойлик»ни танланг");
        return;
      }
      var dollarRow = methodsOut.filter(function(mm){return isUsdMethod(mm.method);})[0];
      if(dollarRow && dollarRow.usdRate>0) STATE.lastUsdRate = dollarRow.usdRate;
      var dateVal = m.querySelector("#kl-date").value || todayISO();
      var data = {
        cashAccountId: accountId, direction: direction, amount: total,
        methods: methodsOut, manual:true,
        bizCount: m.querySelector("#kl-bizflag").checked,
        counterpartyName: counterpartyName, counterpartyType: counterpartyType, counterpartyId: counterpartyId,
        category: direction==="kirim"?"qolga_kirim":"qolga_chiqim",
        description: m.querySelector("#kl-note").value.trim(),
        date: dateVal,
        vatRate: isEdit?(Number(t.vatRate)||0):0, vatSum: isEdit?(Number(t.vatSum)||0):0,
        cancelled:false
      };
      /* "Ойлик" танланган бўлса — расмий батч тўлови билан БИР ХИЛ
         сифатида ҳисобга олиниши учун category="ish_haqi" ва
         payrollYear/payrollMonth тегги (санадан) қўйилади — шунда
         Ҳисобот/Акт сверкадаги «Ойлик тўланган (расмий)»/«Накд туланди»
         ва Иш ҳақи ҳисоблашдаги авто-ҳисоблашларга тўғри тушади. */
      if(direction==="chiqim" && cpType==="employee" && counterpartyType==="employee" && empPayType==="oylik"){
        data.category = "ish_haqi";
        data.payrollYear = Number(dateVal.slice(0,4))||new Date().getFullYear();
        data.payrollMonth = Number(dateVal.slice(5,7))||(new Date().getMonth()+1);
      }
      /* 2026-10-03 сўровига кўра қўшилди: агар ушбу "Кирим" контрагент
         сифатида Мижоз танланган бўлса — тушган пул ўша мижознинг
         қарздор сотувларига ФИФО тартибида (энг аввал яратилган
         сотувдан бошлаб, ошиб тушган қолдиғи кейингисига) автомат
         қўлланади — худди Мижозлар бўйича "Тўлов қабул қилиш" каби,
         шунда Савдо рўйхатидаги ҳолат ҳам тўғри янгиланади. Таҳрирлашда
         — аввал эски қўлланиш БУТУНЛАЙ орқага қайтарилади (debtAmount/
         paidAmount), сўнгра янги суммага кўра қайтадан қўлланади. */
      if(isEdit && !t.cancelled && t.debtAllocations && t.debtAllocations.length) reverseCustomerDebtPayment(t.debtAllocations);
      data.debtAllocations = (direction==="kirim" && counterpartyType==="customer" && counterpartyId && total>0)
        ? applyCustomerDebtPayment(counterpartyId, total) : [];
      if(isEdit){
        dbUpdate("cashTransactions", t.id, data, STATE.cashTransactions);
        toast("Сақланди");
      } else {
        data.createdAt = new Date().toISOString();
        dbAdd("cashTransactions", data, STATE.cashTransactions);
        toast(direction==="kirim"?"Кирим сақланди":"Чиқим сақланди");
      }
      closeModal();
    });
  }

  /* ---- 2-қўшимча) Ходимлар бўйича (иш ҳақи) кўп қаторли тўлов — фақат Чиқим ---- */
  /* Танланган давр (йил-ой) ва шу давр учун сақланган Иш ҳақи ҳисоблаши
     асосида ходимлар рўйхати ва уларга тўланадиган сумма (Пул ўтказмаси
     танланса — Якуний қолдиқ, Нақд танланса — Нақд устуни) автомат
     тўлдирилади; сақлашда ҳар бир ходим учун АЛОҲИДА "Чиқим" ёзуви
     (counterpartyType: "employee") яратилади — булар
     employeeCardAdvancePaidForPeriod() орқали Иш ҳақи ҳисоблашдаги
     "Тўланган аванс (пул ўтказмаси)"да автомат акс этади. */
