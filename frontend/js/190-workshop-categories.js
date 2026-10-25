  /* ================= Цех ↔ КАТЕГОРИЯ боғланиши (2026-10-23) =================
     Фойдаланувчи сўровига кўра бошқарув панелидаги рақамлар энди
     «Молия бўлими», «Ҳисобот» ва «Омборлар → Ҳисобот» бўлимларидаги
     КАТЕГОРИЯ кесимидан олинади. Боғланиш икки йўл билан:
       • категорияга «Цехга бириктириш» ойнасидан қўйилган dashKey;
       • ёки категория номидаги калит сўз (Радиатор, Токар, Газ, Кўмир).
     Ҳеч қандай мавжуд маълумот ўзгармайди — фақат ихтиёрий dashKey
     майдони ёзилади. */
  function dwCatIds(key){
    return STATE.categories.filter(function(c){
      if(c.dashKey==="__none__") return false;
      if(c.dashKey) return c.dashKey===key;
      return dwKeyFromText(c.name)===key;
    }).map(function(c){ return c.id; });
  }
  function dwCatKeyOf(catId){
    var c = STATE.categories.find(function(x){ return x.id===catId; });
    if(!c) return "";
    if(c.dashKey==="__none__") return "";
    if(c.dashKey && dwOf(c.dashKey)) return c.dashKey;
    return dwKeyFromText(c.name);
  }
  function dwCatNames(key){
    var ids = dwCatIds(key);
    return STATE.categories.filter(function(c){ return ids.indexOf(c.id)>-1; }).map(function(c){ return c.name; });
  }
  /* Молия бўлимидаги шу цех категориялари бўйича жами сумма ва
     харажат турлари (маҳсулот харажат турлари). */
  function dwFinanceOf(key, ac){
    var ids = dwCatIds(key), total = 0, reserve = 0, buckets = {};
    FIN_BUCKETS.forEach(function(b){ buckets[b.key] = 0; });
    ids.forEach(function(cid){
      var cat = ac && ac.cats ? ac.cats[cid] : null; if(!cat) return;
      total += finCatTotal(cat);
      reserve += Number(cat.reserve)||0;
      FIN_BUCKETS.forEach(function(b){ buckets[b.key] += Number(cat.buckets[b.key])||0; });
    });
    return {catIds:ids, total:total, reserve:reserve, buckets:buckets};
  }
  /* Ҳисобот бўлимидаги ЁПИЛГАН ойлар бўйича жами даромад/харажат/фойда
     (шу цехга тегишли барча категориялар, барча йиллар). */
  function dwClosedTotals(key){
    var ids = dwCatIds(key).map(String);
    var income = 0, expense = 0, months = 0;
    STATE.monthlyReports.forEach(function(r){
      if(r.cancelled) return;
      if(ids.indexOf(String(r.categoryId))===-1) return;
      income += Number(r.income)||0;
      expense += Number(r.expense)||0;
      months++;
    });
    return {income:income, expense:expense, profit:income-expense, months:months};
  }
  function dwDay(d){ return (d||"").slice(0,10); }
  /* Ҳисобот бўлимидаги ЁПИЛГАН ойлик ҳисоботлар бўйича: жорий йил
     бошидан жамланма ва ўтган ой кўрсаткичлари (2026-10-23 сўрови).
     catIds бўш бўлса — барча категориялар («Бошқарув бўлими»дан
     ташқари, чунки унинг харажати бошқа категорияларга бўлинади). */
  function dwPeriodTotals(catIds){
    var now = new Date(), y = now.getFullYear();
    var pY = y, pM = now.getMonth();
    if(pM===0){ pY = y-1; pM = 12; }
    var all = !catIds || !catIds.length;
    var ids = (catIds||[]).map(String);
    var ytd = {income:0, expense:0, months:0};
    var prev = {income:0, expense:0, months:0};
    STATE.monthlyReports.forEach(function(r){
      if(r.cancelled) return;
      if(all){ if(hbIsAdminCat(r.categoryId)) return; }
      else if(ids.indexOf(String(r.categoryId))===-1) return;
      var inc = Number(r.income)||0, exp = Number(r.expense)||0;
      if(Number(r.year)===y){ ytd.income+=inc; ytd.expense+=exp; ytd.months++; }
      if(Number(r.year)===pY && Number(r.month)===pM){ prev.income+=inc; prev.expense+=exp; prev.months++; }
    });
    ytd.profit = ytd.income-ytd.expense;
    prev.profit = prev.income-prev.expense;
    prev.label = (MONTHS_FULL[pM-1]||"")+" "+pY;
    return {ytd:ytd, prev:prev, year:y};
  }
  /* «Молиявий натижа» панели — Ҳисобот бўлимидан олинган даромад,
     харажат ва фойда: йил бошидан ва ўтган ой кесимида. */
  function dwFinResultHtml(catIds){
    var t = dwPeriodTotals(catIds);
    function row(label, a, b, color){
      return '<tr><td class="cell-strong">'+esc(label)+'</td>'+
        '<td class="num cell-strong" style="color:'+color+';">'+fmtSum(a)+'</td>'+
        '<td class="num cell-strong" style="color:'+color+';">'+fmtSum(b)+'</td></tr>';
    }
    return '<div class="table-wrap"><table><thead><tr><th>Кўрсаткич</th>'+
        '<th class="num">Йил бошидан ('+t.year+')</th><th class="num">Ўтган ой ('+esc(t.prev.label)+')</th></tr></thead><tbody>'+
        row("Савдо суммаси", t.ytd.income, t.prev.income, "var(--good)")+
        row("Харажатлар суммаси", t.ytd.expense, t.prev.expense, "var(--critical)")+
        row("Фойда", t.ytd.profit, t.prev.profit, (t.ytd.profit>=0?"var(--accent)":"var(--critical)"))+
      '</tbody></table></div>'+
      '<div class="field-hint" style="margin-top:8px;">Манба: «Ҳисобот» бўлимидаги ЁПИЛГАН ойлик ҳисоботлар'+
        (t.ytd.months ? (' · йил бошидан '+t.ytd.months+' та ой ёпилган') : ' · бу йил ҳали бирорта ой ёпилмаган')+
        (t.prev.months ? '' : ' · ўтган ой ҳали ёпилмаган')+'</div>';
  }
  /* «Фойда тақсимоти» панели — Молия бўлимидаги «Фойда → Тақсимот»
     бўлимлари ва фоизлари бўйича. */
  function dwProfitDistHtml(base, reserve, note){
    var splits = finSplits("profit");
    if(!splits.length) return '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3);font-size:13px;">Молия бўлимидаги «Фойда → Тақсимот» бўлимлари ҳали яратилмаган.</div>';
    var dist = Math.max(0, base-reserve);
    var pctSum = splits.reduce(function(sm,x){ return sm+(Number(x.pct)||0); }, 0);
    var tones = ["accent","good","warning","critical"];
    return '<div class="kpi-grid">'+
        splits.map(function(x,i){
          var extra = (x.name===FIN_RESERVE_NAME) ? reserve : 0;
          return kpiTileFmt(x.name, fmtSum(dist*(Number(x.pct)||0)/100 + extra),
            (Number(x.pct)||0)+"% улуш", tones[i%tones.length]);
        }).join("")+
      '</div>'+
      '<div class="field-hint" style="margin-top:10px;">'+(note||"")+'Тақсимланадиган фойда: <b>'+fmtSum(base)+'</b> · тақсимланган: <b>'+pctSum+'%</b>'+
        (pctSum<100 ? ' · тақсимланмай қолган: '+(100-pctSum)+'% — '+fmtSum(dist*(100-pctSum)/100) : '')+
        (pctSum>100 ? ' · <span style="color:var(--critical);font-weight:700;">фоизлар йиғиндиси 100% дан ошиб кетди</span>' : '')+
      '</div>';
  }
  /* Барча категориялар бўйича Молиядаги фойда (тақсимот учун асос). */
  function dwProfitBaseAll(ac){
    var base = 0, reserve = 0;
    Object.keys((ac && ac.cats) || {}).forEach(function(ck){
      var cat = ac.cats[ck];
      base += Number(cat.buckets.profit)||0;
      reserve += Number(cat.reserve)||0;
    });
    return {base:base, reserve:reserve};
  }
  /* Барча категориялар бўйича тайёр маҳсулот ва товар қолдиғи. */
  function dwFinishedAll(){
    return STATE.items.filter(function(it){
      return it.itemType==="mahsulot" || it.itemType==="tovar";
    }).map(function(it){
      var q = totalStockQty(it.id), mn = Number(it.minQuantity||0);
      var st = dwProducedStats(it.id);
      return {id:it.id, name:it.name, unit:it.unit, itemType:it.itemType, cat:categoryName(it.categoryId),
        qty:q, min:mn, low:(q<=0 || q<=mn), yearQty:st.year, monthQty:st.month, yestQty:st.yest};
    }).sort(function(a,b){ return (a.cat||"").localeCompare(b.cat||"") || (a.name||"").localeCompare(b.name||""); });
  }
  /* Шу маҳсулот бўйича ишлаб чиқарилган сони: йил бошидан, ой бошидан
     ва кеча (бекор қилинганлари ҳисобга олинмайди). */
  function dwProducedStats(itemId){
    var now = new Date();
    var yStart = now.getFullYear()+"-01-01";
    var mStart = now.toISOString().slice(0,8)+"01";
    var yest = new Date(now.getTime()-86400000).toISOString().slice(0,10);
    var y=0, m=0, d=0;
    STATE.productions.forEach(function(p){
      if(p.cancelled || p.productItemId!==itemId) return;
      var dt = dwDay(p.date||p.createdAt), q = Number(p.quantity)||0;
      if(dt>=yStart) y+=q;
      if(dt>=mStart) m+=q;
      if(dt===yest) d+=q;
    });
    return {year:y, month:m, yest:d};
  }
  /* «Омборлар → Ҳисобот»даги «Тайёр маҳсулот» ва «Товар» қолдиғи —
     категория кесимида. */
  function dwFinishedByCat(key){
    var ids = dwCatIds(key);
    return STATE.items.filter(function(it){
      return (it.itemType==="mahsulot" || it.itemType==="tovar") && ids.indexOf(it.categoryId)>-1;
    }).map(function(it){
      var q = totalStockQty(it.id), mn = Number(it.minQuantity||0);
      var st = dwProducedStats(it.id);
      return {id:it.id, name:it.name, unit:it.unit, itemType:it.itemType, qty:q, min:mn,
        low:(q<=0 || q<=mn), yearQty:st.year, monthQty:st.month, yestQty:st.yest};
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
  }
  /* «Омборлар»даги тугаган ва кам қолган хомашё + ярим тайёр маҳсулотлар. */
  function dwLowRawList(){
    return STATE.items.filter(function(it){
      if(it.itemType!=="xomashyo" && it.itemType!=="yarim_tayyor") return false;
      var q = totalStockQty(it.id);
      return q<=0 || q<=Number(it.minQuantity||0);
    }).map(function(it){
      var q = totalStockQty(it.id);
      return {name:it.name, unit:it.unit, itemType:it.itemType, qty:q,
        min:Number(it.minQuantity||0), cat:categoryName(it.categoryId)};
    }).sort(function(a,b){ return (a.qty-a.min)-(b.qty-b.min) || (a.name||"").localeCompare(b.name||""); });
  }
  function openDwLowRawModal(){
    var list = dwLowRawList();
    var body = list.length
      ? '<div class="field-hint" style="margin-bottom:8px;">«Омборлар» бўйича жами қолдиқ минимал захирадан кам ёки тугаган хомашё ва ярим тайёр маҳсулотлар.</div>'+
        '<div class="table-wrap"><table><thead><tr><th>Номи</th><th>Тури</th><th>Категория</th><th class="num">Қолдиқ</th><th class="num">Минимал</th><th>Ҳолат</th></tr></thead><tbody>'+
        list.map(function(m){
          return '<tr><td class="cell-strong" style="color:var(--critical);">'+esc(m.name)+'</td>'+
            '<td>'+itemTypeChip(m.itemType)+'</td>'+
            '<td class="cell-muted">'+esc(m.cat)+'</td>'+
            '<td class="num" style="color:var(--critical);font-weight:800;">'+fmtNum(m.qty)+' '+esc(m.unit)+'</td>'+
            '<td class="num cell-muted">'+fmtNum(m.min)+' '+esc(m.unit)+'</td>'+
            '<td>'+(m.qty<=0?'<span class="chip chip-critical">Тугаган</span>':'<span class="chip chip-warning">Кам қолган</span>')+'</td></tr>';
        }).join("")+'</tbody></table></div>'
      : '<div class="field-hint">Барча хомашё ва ярим тайёр маҳсулотлар етарли даражада ✓</div>';
    var m = openModal("Тугаган ва кам қолган материаллар", body,
      '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }

  /* ---------- Дебиторлар / Кредиторлар (Солиштирма далолатнома асосида) ---------- */
  function dwActBalances(type){
    var list = type==="customer" ? STATE.customers : STATE.suppliers;
    return list.map(function(c){
      var ent = buildActLedgerEntries(type, c.id);
      var bal = ent.reduce(function(sm,e){ return sm + (Number(e.kirim)||0) - (Number(e.chiqim)||0); }, 0);
      return {id:c.id, name:c.name, count:ent.length, bal:bal,
        debt: type==="customer" ? -bal : bal};
    }).filter(function(x){ return x.count>0; })
      .sort(function(a,b){ return b.debt-a.debt; });
  }
  function dwActDebtTotal(type){
    return dwActBalances(type).reduce(function(sm,x){ return sm + (x.debt>0.004 ? x.debt : 0); }, 0);
  }
  function openDwActListModal(type){
    var rows = dwActBalances(type);
    var isCust = type==="customer";
    var title = isCust ? "Дебиторлар — харидорлар" : "Кредиторлар — етказиб берувчилар";
    var sumDebt = rows.reduce(function(sm,x){ return sm + (x.debt>0?x.debt:0); }, 0);
    var body = rows.length
      ? '<div class="field-hint" style="margin-bottom:8px;">«Солиштирма далолатнома» бўйича жорий қолдиқ. '+
          (isCust?'Мусбат сумма — харидор бизга қарздор.':'Мусбат сумма — биз етказиб берувчига қарздормиз.')+'</div>'+
        '<div class="table-wrap"><table><thead><tr><th>№</th><th>'+(isCust?'Харидор':'Етказиб берувчи')+'</th>'+
          '<th class="num">Ёзувлар</th><th class="num">Қарз</th></tr></thead><tbody>'+
        rows.map(function(x,i){
          return '<tr>'+
            '<td class="num">'+(i+1)+'</td>'+
            '<td class="cell-strong">'+esc(x.name)+'</td>'+
            '<td class="num cell-muted">'+x.count+'</td>'+
            '<td class="num cell-strong" style="color:'+(x.debt>0.004?"var(--critical)":(x.debt<-0.004?"var(--good)":"var(--ink-3)"))+';">'+
              (Math.abs(x.debt)<=0.004 ? '0' : (x.debt>0 ? fmtSum(x.debt) : ("олдиндан "+fmtSum(-x.debt))))+'</td></tr>';
        }).join("")+
        '<tr><td></td><td class="cell-strong">ЖАМИ ҚАРЗ</td><td></td>'+
          '<td class="num cell-strong" style="color:var(--critical);font-size:15px;">'+fmtSum(sumDebt)+'</td></tr>'+
        '</tbody></table></div>'
      : '<div class="field-hint">Ҳали ёзув йўқ.</div>';
    var m = openModal(title, body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }

  function viewDashboard(){
    if(STATE.dashWs==="all") return viewDashboardOverall();
    if(STATE.dashWs && dwOf(STATE.dashWs)) return viewDashboardWorkshop(STATE.dashWs);
    return viewDashboardCards();
  }

  function viewDashboardCards(){
    /* 2026-10-23 сўрови: ўнг тепада — «Молия бўлими»даги тақсимланмаган пул. */
    var finRes = finCompute();
    var finAc = finRes.accs[FIN_ALL_ACC] || finBlankAcc();
    setTopbar("Бошқарув панели", todayLabel(),
      '<button type="button" class="btn btn-secondary" id="dwUnallocBtn" title="Молия бўлими — тақсимланмаган пул">'+ICONS.wallet+'Тақсимланмаган пул: '+fmtSum(finAc.unalloc)+'</button>');
    var html = sampleBanner();
    var unItems = STATE.items.filter(function(it){ return !dwItemKeys(it).length; }).length;
    var unCash = STATE.cashAccounts.filter(function(a){ return !dwAccKey(a); }).length;
    var unOrders = STATE.orders.filter(function(o){
      if(o.cancelled) return false;
      var w = o.workshopId ? workshopById(o.workshopId) : null;
      return !(w && dwKeyOfRecord(w));
    }).length;
    var unRecipes = dwLatestRecipes().filter(function(r){ return !dwRecipeKey(r); }).length;
    if(unRecipes){
      html += '<div class="banner">'+ICONS.alert+'<div class="banner-body"><div class="banner-title">Цехга тегишли эмас калькуляциялар: '+unRecipes+' та</div>Бу калькуляцияларнинг харажати ҳеч бир цех ҳисобига кирмаяпти — категорияси ёки маҳсулот номидан цех аниқланмади.</div><button class="btn btn-secondary btn-sm" id="dwRecipesBtn" style="flex-shrink:0;">Бириктириш</button></div>';
    }
    if(unItems || unCash || unOrders){
      var parts = [];
      if(unItems) parts.push(unItems+" та маҳсулот/хомашё");
      if(unCash) parts.push(unCash+" та касса");
      if(unOrders) parts.push(unOrders+" та буюртма");
      html += '<div class="banner">'+ICONS.alert+'<div class="banner-body"><div class="banner-title">Цехга бириктирилмаган маълумотлар бор</div>'+parts.join(", ")+' ҳали 4 та цехдан бирортасига бириктирилмаган, шунинг учун цех ҳисоботларида кўринмайди. Цехга кириб, «Цехга бириктириш» тугмаси орқали маҳсулот ва кассаларни бириктиринг; буюртмалар эса буюртма шаклидаги «Цех» майдони орқали бириктирилади.</div></div>';
    }
    /* 2026-10-23 сўрови: цех картасидаги рақамлар — «Молия бўлими»даги
       категория бўйича жами сумма ва «Ҳисобот»даги ЁПИЛГАН ойларнинг
       жами даромади, харажати ва фойдаси. */
    html += '<div class="dw-grid">'+DASH_WORKSHOPS.map(function(d){
      var mf = dwFinanceOf(d.key, finAc), cl = dwClosedTotals(d.key);
      return '<button type="button" class="dw-card dw-'+d.tone+'" data-dw="'+d.key+'">'+
        '<div class="dw-head"><div class="dw-icon">'+ICONS.grid+'</div><div class="dw-name">'+esc(d.name)+'</div><div class="dw-go">'+ICONS.arrowRight+'</div></div>'+
        '<div class="dw-stats">'+
          '<div><div class="dw-k">Молия бўлими (жами)</div><div class="dw-v num">'+fmtNum(mf.total)+'</div></div>'+
          '<div><div class="dw-k">Даромад</div><div class="dw-v num" style="color:var(--good);">'+fmtNum(cl.income)+'</div></div>'+
          '<div><div class="dw-k">Харажат</div><div class="dw-v num" style="color:var(--critical);">'+fmtNum(cl.expense)+'</div></div>'+
          '<div><div class="dw-k">Фойда</div><div class="dw-v num" style="color:'+(cl.profit>=0?"var(--accent)":"var(--critical)")+';">'+fmtNum(cl.profit)+'</div></div>'+
        '</div></button>';
    }).join("")+'</div>';
    html += '<div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">'+
      '<button type="button" class="btn btn-secondary" id="dwAllBtn">'+ICONS.chart+'Умумий кўриниш (барча цехлар бирга)</button>'+
      /* 2026-10-19 сўрови: «Заявка» — бухгалтер тасдиқлаган омбор
         буюртмалари; раҳбар керакли маҳсулотларни белгилаб тасдиқлайди. */
      '<button type="button" class="btn '+(wh2PendingDirCount()?"btn-primary":"btn-secondary")+'" id="dwZayavkaBtn">'+ICONS.clipboard+'Заявка'+(wh2PendingDirCount()?(' · '+wh2PendingDirCount()):'')+'</button>'+
      '</div>';

    /* 2026-10-23 сўрови: «Заявка» тугмаси пастида — «Касса» бўлимидаги
       умумий касса қолдиғи (худди ўша жадвал), ундан пастда эса
       «Дебиторлар» ва «Кредиторлар» тугмалари. */
    var kb = kassaAllBalances();
    var kRate = finRes.rateToday;
    var kTotal = kb.naqd + kb.karta + kb.otkazma + (kb.dollar + (kb.otkazma_usd||0))*kRate;
    html += '<div class="section" style="margin-top:18px;"><div class="section-head"><h2>Умумий касса қолдиғи</h2>'+
      '<span class="hint" data-goto="kassa" style="cursor:pointer;">Кассага ўтиш '+ICONS.arrowRight+'</span></div>'+
      '<div class="card" style="padding:16px 18px;">'+
        '<div class="table-wrap"><table><thead><tr>'+
          '<th class="num">Ҳисоб рақам (сўм)</th><th class="num">Ҳисоб рақам ($)</th><th class="num">Нақд</th>'+
          '<th class="num">Нақд ($)</th><th class="num">Карта</th><th class="num">Жами сумма (сўм)</th><th class="num">Курс</th>'+
        '</tr></thead><tbody><tr>'+
          '<td class="num cell-strong">'+fmtSum(kb.otkazma)+'</td>'+
          '<td class="num cell-strong">'+fmtUsd(kb.otkazma_usd||0)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(kb.naqd)+'</td>'+
          '<td class="num cell-strong">'+fmtUsd(kb.dollar)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(kb.karta)+'</td>'+
          '<td class="num cell-strong" style="color:var(--accent);">'+fmtSum(kTotal)+'</td>'+
          '<td class="num">'+fmtNum(kRate)+'</td>'+
        '</tr></tbody></table></div>'+
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">'+
          '<button type="button" class="btn btn-secondary" id="dwDebtorsBtn">'+ICONS.users+'Дебиторлар: '+fmtSum(dwActDebtTotal("customer"))+'</button>'+
          '<button type="button" class="btn btn-secondary" id="dwCreditorsBtn">'+ICONS.users+'Кредиторлар: '+fmtSum(dwActDebtTotal("supplier"))+'</button>'+
        '</div>'+
      '</div></div>';

    var root = document.getElementById("content");
    root.innerHTML = html;
    wireSampleBanner(root);
    root.querySelectorAll("[data-dw]").forEach(function(b){
      b.addEventListener("click", function(){ STATE.dashWs = b.getAttribute("data-dw"); render(); window.scrollTo(0,0); });
    });
    var dwRecBtn = root.querySelector("#dwRecipesBtn");
    if(dwRecBtn) dwRecBtn.addEventListener("click", openDashRecipeAssignModal);
    var allBtn = root.querySelector("#dwAllBtn");
    if(allBtn) allBtn.addEventListener("click", function(){ STATE.dashWs="all"; render(); window.scrollTo(0,0); });
    var zayavkaBtn = root.querySelector("#dwZayavkaBtn");
    if(zayavkaBtn) zayavkaBtn.addEventListener("click", openWh2ZayavkaModal);
    var unallocBtn = document.getElementById("dwUnallocBtn");
    if(unallocBtn) unallocBtn.addEventListener("click", function(){ openFinUnallocModal(null, finAc); });
    var debBtn = root.querySelector("#dwDebtorsBtn");
    if(debBtn) debBtn.addEventListener("click", function(){ openDwActListModal("customer"); });
    var creBtn = root.querySelector("#dwCreditorsBtn");
    if(creBtn) creBtn.addEventListener("click", function(){ openDwActListModal("supplier"); });
    var gk2 = root.querySelector('[data-goto="kassa"]');
    if(gk2) gk2.addEventListener("click", function(){ STATE.view="kassa"; render(); window.scrollTo(0,0); });
  }

  function viewDashboardWorkshop(key){
    var d = dwOf(key), st = dwStats(key);
    /* 2026-10-23 сўрови: бу саҳифадаги рақамлар «Молия бўлими» ва
       «Ҳисобот» бўлимларидаги КАТЕГОРИЯ кесимидан олинади. */
    var finRes = finCompute();
    var finAc = finRes.accs[FIN_ALL_ACC] || finBlankAcc();
    var mf = dwFinanceOf(key, finAc);
    var cl = dwClosedTotals(key);
    var catNames = dwCatNames(key);
    setTopbar(d.name, todayLabel(), '<button class="btn btn-secondary" id="dashBackBtn">'+ICONS.arrowLeft+'Цехлар</button><button class="btn btn-primary" id="dwAttachBtn">'+ICONS.gear+'Цехга бириктириш</button>');
    var html = '';
    function sect(title, body, hint){
      return '<div class="section"><div class="section-head"><h2>'+title+'</h2>'+(hint||"")+'</div>'+body+'</div>';
    }
    function card(msg){ return '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3);font-size:13px;">'+msg+'</div>'; }

    /* 1) 2026-10-23 (2-сўров): «Касса қолдиғи» жадвали бу саҳифадан
       олиб ташланди — касса қолдиғи бошқарув панелининг бош саҳифасида
       («Умумий касса қолдиғи») кўрсатилади.
       1-б) «Молия бўлими»даги шу цех категорияси бўйича маҳсулот
       харажат турлари. */
    var mfRows = FIN_BUCKETS.filter(function(b){ return Math.abs(mf.buckets[b.key]||0)>0.004; });
    html += sect("Молия бўлими — харажат турлари", mf.catIds.length ?
      ((mfRows.length ?
        '<div class="table-wrap"><table><thead><tr><th>Харажат тури</th><th class="num">Сумма</th></tr></thead><tbody>'+
          mfRows.map(function(b){
            return '<tr class="fin-row" data-dwfin="'+esc(b.key)+'" style="cursor:pointer;"><td class="cell-strong">'+esc(b.name)+'</td>'+
              '<td class="num cell-strong">'+fmtSum(mf.buckets[b.key]||0)+'</td></tr>';
          }).join("")+
          '<tr><td class="cell-strong">ЖАМИ</td><td class="num cell-strong" style="color:var(--accent);font-size:15px;">'+fmtSum(mf.total)+'</td></tr>'+
        '</tbody></table></div>'
        : card("Бу категория бўйича Молия бўлимида ҳали тақсимланган пул йўқ."))+
      '<div class="field-hint" style="margin-top:8px;">Категория: '+esc(catNames.join(", "))+'</div>')
      : emptyState("Категория боғланмаган","«Цехга бириктириш» ойнасидаги «Категориялар» бўлимидан шу цехнинг категориясини белгиланг — Молия, Ҳисобот ва омбор қолдиғи шу орқали олинади."),
      '<span class="hint" data-goto="moliya" style="cursor:pointer;">Молия бўлими '+ICONS.arrowRight+'</span>');

    /* 2) Тайёр маҳсулот қолдиғи — «Омборлар → Ҳисобот»даги «Тайёр
       маҳсулот» ва «Товар» қолдиғи, категория кесимида. Минимал
       захирадан кам қолгани қизил кўринади; ёнида йил бошидан, ой
       бошидан ва кеча ишлаб чиқарилган сони (2026-10-23 сўрови). */
    var fgList = dwFinishedByCat(key);
    html += sect("Тайёр маҳсулот қолдиғи", fgList.length ?
      '<div class="table-wrap"><table><thead><tr><th>Маҳсулот номи</th><th>Тури</th><th class="num">Қолдиқ</th>'+
        '<th class="num">Йил бошидан</th><th class="num">Ой бошидан</th><th class="num">Кечаги</th></tr></thead><tbody>'+
        fgList.map(function(g){
          var cs = g.low ? ' style="color:var(--critical);font-weight:800;"' : '';
          return '<tr><td class="cell-strong"'+cs+'>'+esc(g.name)+'</td>'+
            '<td>'+itemTypeChip(g.itemType)+'</td>'+
            '<td class="num"'+cs+'>'+fmtNum(g.qty)+' '+esc(g.unit)+'</td>'+
            '<td class="num">'+fmtNum(g.yearQty)+'</td>'+
            '<td class="num">'+fmtNum(g.monthQty)+'</td>'+
            '<td class="num">'+fmtNum(g.yestQty)+'</td></tr>';
        }).join("")+
      '</tbody></table></div>'+
      '<div class="field-hint" style="margin-top:8px;">«Йил бошидан», «Ой бошидан» ва «Кечаги» — шу давр ичида ишлаб чиқарилган жами сони. Минимал захирадан кам қолган маҳсулот қизил кўринади.</div>'
      : emptyState("Бу категория бўйича тайёр маҳсулот ёки товар йўқ","Маҳсулот карточкасидаги «Категория» майдони шу цех категориясига танланса, қолдиқ шу ерда кўринади."),
      '<span class="hint" data-goto="warehouse" style="cursor:pointer;">Омборлар → Ҳисобот '+ICONS.arrowRight+'</span>');

    /* 3) Кам қолган материаллар — рўйхат ўрнига тугма (2026-10-23). */
    var lowCnt = dwLowRawList().length;
    html += sect("Материаллар захираси",
      '<div class="card" style="padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">'+
        '<div><div style="font-weight:800;font-size:14px;'+(lowCnt?'color:var(--critical);':'')+'">'+(lowCnt?('Тугаган ва кам қолган: '+lowCnt+' та'):'Барча материаллар етарли ✓')+'</div>'+
        '<div class="field-hint">«Омборлар»даги хомашё ва ярим тайёр маҳсулотлар рўйхати.</div></div>'+
        '<button type="button" class="btn '+(lowCnt?"btn-primary":"btn-secondary")+'" id="dwLowRawBtn">'+ICONS.box+'Рўйхатни кўриш</button>'+
      '</div>');

    /* 4) Сўнгги (бажарилмаган) буюртмалар. */
    html += sect("Сўнгги буюртмалар", st.unfinishedOrders.length ? ordersTable(st.unfinishedOrders.slice(0,8), true) : emptyState("Бажарилмаган буюртма йўқ","Бу цех бўйича барча буюртмалар якунланган ✓"),
      '<span class="hint" data-goto="orders" style="cursor:pointer;">Барчасини кўриш '+ICONS.arrowRight+'</span>');

    /* 5) 2026-10-23 сўрови: «Биз қарздор — таъминотчилар» ва «Бизга
       қарздор — мижозлар» жадваллари бу саҳифадан олиб ташланди —
       улар энди бошқарув панелидаги «Дебиторлар»/«Кредиторлар»
       тугмалари орқали кўрилади. */

    /* 6-7) 2026-10-23 сўрови: «Даромад» ва «Харажат» жадваллари бу
       саҳифадан олиб ташланди — улар «Ҳисобот» бўлимидаги ёпилган
       ойлар жамланмаси сифатида цех картасида кўрсатилади. */

    /* 8-а) 2026-10-23 (3-сўров): «Молиявий натижа» — шу цех
       категорияси бўйича Ҳисобот бўлимидаги ёпилган ойлардан
       (йил бошидан ва ўтган ой). */
    html += sect("Молиявий натижа", dwFinResultHtml(mf.catIds),
      '<span class="hint" data-goto="hisobot" style="cursor:pointer;">Ҳисобот бўлими '+ICONS.arrowRight+'</span>');

    /* 8-б) «Фойда тақсимоти» — Молия бўлимидаги шу категория фойдаси
       тақсимот турлари бўйича. */
    html += sect("Фойда тақсимоти", dwProfitDistHtml(mf.buckets.profit||0, mf.reserve||0, ""),
      '<span class="hint" data-goto="moliya" style="cursor:pointer;">Молия бўлими '+ICONS.arrowRight+'</span>');
    void cl;

    var root = document.getElementById("content");
    root.innerHTML = html;
    document.getElementById("dashBackBtn").addEventListener("click", function(){ STATE.dashWs=""; render(); window.scrollTo(0,0); });
    document.getElementById("dwAttachBtn").addEventListener("click", function(){ openDashAttachModal(key); });
    var gk = root.querySelector('[data-goto="kassa"]');
    if(gk) gk.addEventListener("click", function(){ STATE.view="kassa"; render(); });
    var go = root.querySelector('[data-goto="orders"]');
    if(go) go.addEventListener("click", function(){ STATE.view="orders"; STATE.ordersWorkshopFilter = st.ids[0]||""; render(); });
    root.querySelectorAll('[data-goto="moliya"]').forEach(function(x){ x.addEventListener("click", function(){ STATE.view="moliya"; render(); window.scrollTo(0,0); }); });
    root.querySelectorAll('[data-goto="hisobot"]').forEach(function(x){ x.addEventListener("click", function(){ STATE.view="hisobot"; STATE.hisobotCatId=""; render(); window.scrollTo(0,0); }); });
    var gwh = root.querySelector('[data-goto="warehouse"]');
    if(gwh) gwh.addEventListener("click", function(){ STATE.view="warehouse"; STATE.whView="stock"; render(); window.scrollTo(0,0); });
    var lowBtn = root.querySelector("#dwLowRawBtn");
    if(lowBtn) lowBtn.addEventListener("click", openDwLowRawModal);
    root.querySelectorAll("[data-dwfin]").forEach(function(tr){ tr.addEventListener("click", function(){
      var bk = tr.getAttribute("data-dwfin");
      if(mf.catIds.length===1) openFinBucketModal(null, mf.catIds[0], bk, finAc);
      else { STATE.view="moliya"; render(); window.scrollTo(0,0); }
    }); });
    wireOrderRowButtons(root);
  }

  /* Цехга тегишли эмас калькуляцияларни цехга бириктириш (фақат ихтиёрий
     "workshopKey" майдони ёзилади; категория ва бошқа маълумотлар ўзгармайди). */
  function openDashRecipeAssignModal(){
    var list = dwLatestRecipes().filter(function(r){ return !dwRecipeKey(r); });
    if(!list.length){ toast("Барча калькуляциялар цехга бириктирилган"); return; }
    var rows = list.map(function(r){
      return '<tr><td class="cell-strong">'+esc(r.productName||"—")+'</td><td class="cell-muted">'+esc(r.category||"—")+'</td>'+
        '<td><select data-dw-rec="'+esc(r.id)+'" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg);font-size:12.5px;"><option value="">— танланг —</option>'+DASH_WORKSHOPS.map(function(d){ return '<option value="'+d.key+'">'+esc(d.name)+'</option>'; }).join("")+'</select></td></tr>';
    }).join("");
    var body = '<div class="field-hint" style="margin-bottom:8px;">Калькуляциянинг харажати танланган цехнинг «Харажат» қисмига киради.</div><div class="table-wrap"><table><thead><tr><th>Маҳсулот</th><th>Категория</th><th>Цех</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    var m = openModal("Калькуляцияларни цехга бириктириш", body, '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>', true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var n = 0;
      m.querySelectorAll("[data-dw-rec]").forEach(function(sel){
        if(!sel.value) return;
        dbUpdate("recipes", sel.getAttribute("data-dw-rec"), {workshopKey:sel.value}, STATE.recipes); n++;
      });
      toast(n ? "Сақланди" : "Ўзгариш йўқ");
      closeModal();
    });
  }
  /* Цехга бириктириш ойнаси: маҳсулот/хомашё ва кассаларни шу цехга
     белгилаш. Фақат ихтиёрий "workshopIds"/"workshopId" майдони ёзилади —
     бошқа ҳеч қандай мавжуд маълумот ўзгармайди. */
  function openDashAttachModal(key){
    var d = dwOf(key), ids = dwIds(key);
    function itemRow(it){
      var mine = dwItemIn(it, ids);
      var others = dwItemKeys(it).filter(function(k){ return k!==key; }).map(function(k){ return dwOf(k).name; });
      return '<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-size:13.5px;"><input type="checkbox" data-dw-item="'+esc(it.id)+'" style="width:auto;"'+(mine?" checked":"")+'><span>'+esc(it.name)+'</span>'+(others.length?'<span class="cell-muted" style="font-size:11.5px;">('+esc(others.join(", "))+')</span>':'')+'</label>';
    }
    var groups = ITEM_TYPES.map(function(t){
      var list = STATE.items.filter(function(it){ return it.itemType===t[0]; }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
      return list.length ? '<div style="font-weight:800;font-size:12.5px;margin:12px 0 4px;color:var(--ink-2);">'+esc(t[1])+'</div>'+list.map(itemRow).join("") : '';
    }).join("");
    var accRows = STATE.cashAccounts.map(function(a){
      var k = dwAccKey(a), mine = k===key;
      return '<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-size:13.5px;"><input type="checkbox" data-dw-acc="'+esc(a.id)+'" style="width:auto;"'+(mine?" checked":"")+'><span>'+esc(a.name)+'</span>'+((k&&!mine)?'<span class="cell-muted" style="font-size:11.5px;">('+esc(dwOf(k).name)+')</span>':'')+'</label>';
    }).join("");
    /* 2026-10-23 сўрови: Молия, Ҳисобот ва омбор қолдиғи КАТЕГОРИЯ
       кесимида олингани учун — шу ердан категорияни цехга бириктириш.
       Категориянинг номи цех номига мос бўлса, автоматик бириктирилган
       ҳисобланади; бу ерда фақат ихтиёрий dashKey майдони ёзилади. */
    var catRows = STATE.categories.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); }).map(function(c){
      var k = dwCatKeyOf(c.id), mine = k===key, auto = !c.dashKey && mine;
      return '<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-size:13.5px;"><input type="checkbox" data-dw-cat="'+esc(c.id)+'" style="width:auto;"'+(mine?" checked":"")+'><span>'+esc(c.name)+'</span>'+
        (auto?'<span class="cell-muted" style="font-size:11.5px;">(номи бўйича автоматик)</span>':'')+
        ((k&&!mine)?'<span class="cell-muted" style="font-size:11.5px;">('+esc(dwOf(k).name)+')</span>':'')+'</label>';
    }).join("");
    var body = '<div class="field-hint" style="margin-bottom:6px;">Белгиланган категория, маҳсулот ва кассалар «'+esc(d.name)+'» ҳисоботига киради. «Молия бўлими», «Ҳисобот» ва тайёр маҳсулот қолдиғи — КАТЕГОРИЯ бўйича олинади. Хомашё бир нечта цехга ҳам тегишли бўлиши мумкин; касса эса фақат битта цехга бириктирилади.</div>'+
      '<div style="max-height:56vh;overflow-y:auto;padding-right:4px;">'+
        '<div style="font-weight:800;font-size:13.5px;margin:6px 0 2px;">Категориялар</div>'+(catRows||'<div class="cell-muted" style="font-size:13px;">Категория йўқ</div>')+
        '<div style="font-weight:800;font-size:13.5px;margin:16px 0 2px;">Кассалар</div>'+(accRows||'<div class="cell-muted" style="font-size:13px;">Касса йўқ</div>')+
        '<div style="font-weight:800;font-size:13.5px;margin:16px 0 2px;">Маҳсулот ва хомашё</div>'+(groups||'<div class="cell-muted" style="font-size:13px;">Ҳали маҳсулот/хомашё йўқ</div>')+
      '</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Цехга бириктириш — "+esc(d.name), body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var primary = dwEnsure(key);
      var curIds = dwIds(key); if(curIds.indexOf(primary)===-1) curIds.push(primary);
      var changed = 0;
      m.querySelectorAll("[data-dw-cat]").forEach(function(cb){
        var cid = cb.getAttribute("data-dw-cat");
        var c = STATE.categories.find(function(x){ return x.id===cid; }); if(!c) return;
        var has = dwCatKeyOf(cid)===key;
        if(cb.checked===has) return;
        dbUpdate("categories", cid, {dashKey: cb.checked ? key : "__none__"}, STATE.categories); changed++;
      });
      m.querySelectorAll("[data-dw-item]").forEach(function(cb){
        var it = itemById(cb.getAttribute("data-dw-item")); if(!it) return;
        var cur = dwItemIds(it), has = cur.some(function(x){ return curIds.indexOf(x)>-1; });
        if(cb.checked===has) return;
        var next = cur.filter(function(x){ return curIds.indexOf(x)===-1; });
        if(cb.checked) next.push(primary);
        dbUpdate("items", it.id, {workshopIds:next}, STATE.items); changed++;
      });
      m.querySelectorAll("[data-dw-acc]").forEach(function(cb){
        var a = cashAccountById(cb.getAttribute("data-dw-acc")); if(!a) return;
        var has = dwAccKey(a)===key;
        if(cb.checked===has) return;
        dbUpdate("cashAccounts", a.id, {workshopId: cb.checked ? primary : ""}, STATE.cashAccounts); changed++;
      });
      toast(changed ? "Сақланди" : "Ўзгариш йўқ");
      closeModal();
    });
  }
  function todayLabel(){
    var d = new Date();
    return "Бугун, "+fmtDate(d.toISOString().slice(0,10));
  }
  function kpiTile(label, value, sub, tone){
    return '<div class="kpi'+(tone?" tone-"+tone:"")+'"><div class="kpi-label">'+esc(label)+'</div><div class="kpi-value num">'+fmtNum(value)+'</div>'+(sub?'<div class="kpi-sub">'+esc(sub)+'</div>':'')+'</div>';
  }
  /* kpiTile фақат хом сон (fmtNum) кўрсатади — сўм/доллар белгиси ёки
     бошқа тайёр форматланган матн (fmtSum/fmtUsd натижаси) кўрсатиш керак
     бўлганда шуни ишлатамиз (олдин "kpiTile(...).replace(...)" усули
     ишлатилган, лекин fmtNum(0) "0,00" қайтаргани учун "0" изланмасди —
     replace ҳеч нарса топмай, тайл доим 0,00 кўрсатиб турарди). */
  function kpiTileFmt(label, valueHtml, sub, tone){
    return '<div class="kpi'+(tone?" tone-"+tone:"")+'"><div class="kpi-label">'+esc(label)+'</div><div class="kpi-value num">'+valueHtml+'</div>'+(sub?'<div class="kpi-sub">'+esc(sub)+'</div>':'')+'</div>';
  }
  function emptyState(title, body, actionHtml){
    return '<div class="card empty-state">'+ICONS.inbox+'<div class="empty-title">'+esc(title)+'</div><div class="empty-body">'+esc(body)+'</div>'+(actionHtml||"")+'</div>';
  }

