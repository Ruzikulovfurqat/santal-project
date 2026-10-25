  /* ================= view: employees / Иш ҳақи ҳисоблаш (payroll) ================= */
  /* Эски "Иш ҳақи ҳисоблаш" номи энди Наряд бўлими учун ишлатилади (юқорида).
     Бу — янги, алоҳида ойлик иш ҳақи ҳисоб-китоби: Аванслар бўлимидаги
     танланган операция асосида ходимлар рўйхати ва уларнинг аванс-дан
     кейинги қолдиғи автомат келиб тушади, кейин Накд/Карта, Оклад,
     солиқлар ва ўтган ойдан қолган қолдиқ асосида якуний қолдиқ
     ҳисобланади. */
  function payrollRunById(id){ return STATE.payrollRuns.find(function(x){return x.id===id;}); }

  /* Танланган ой давомида шу ходимга кассадан чиқим қилинган (кассада:
     Чиқим → контрагент турини "Ходим" қилиб, шу ходимни танлаб, Пул
     ўтказмаси усулида берилган) суммалар йиғиндиси — "туланган аванслар".
     МУҲИМ: category==="ish_haqi" (яъни "Ойлик" деб танланган, расмий иш
     ҳақи сифатида тўланган) операциялар БУ ЕРГА КИРМАЙДИ — улар алоҳида
     employeeBatchPayrollPaidForPeriod/...Cash орқали ҳисобланади ("Карта
     туланди"/"Накд туланди"). Бу текшир бўлмаса, "Ойлик" тугмаси билан
     пул ўтказмаси орқали берилган тўлов ҳам ХАТО равишда "Аванс карта"га
     қўшилиб кетар ва натижада "Картага тўланиши керак" ҳисобида (ҳам шу
     ердаги Ҳисобот жадвалида, ҳам Иш ҳақи ҳисоблашнинг ўзида) сумма ИККИ
     МАРТА айирилиб кетар эди. */
  function employeeCardAdvancePaidForPeriod(empId, year, month){
    var prefix = year+"-"+String(month).padStart(2,"0");
    var sum = 0;
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled) return;
      if(t.direction!=="chiqim") return;
      if(t.category==="ish_haqi") return;
      if(t.counterpartyType!=="employee" || t.counterpartyId!==empId) return;
      if(!t.date || t.date.slice(0,7)!==prefix) return;
      (t.methods||[]).forEach(function(mm){ if(mm.method==="otkazma") sum += Number(mm.amount)||0; });
    });
    return sum;
  }
  /* "Ходимлар бўйича" (батч) иш ҳақи тўлови воситасида, айнан шу (йил, ой)
     ҳисоблаш даврига тегишли деб БЕЛГИЛАНГАН (payrollYear/payrollMonth/
     category="ish_haqi" тегги) пул ўтказмаси (otkazma) орқали шу ходимга
     тўланган "Картага тўланган ойлик" суммасини қайтаради. Бу — операциянинг
     ҚАЙД САНАСИ (t.date) бўйича эмас, балки ҳисоблаш ДАВРИ тегги бўйича
     фильтрланади (employeeCardAdvancePaidForPeriod дан фарқли равишда). */
  function employeeBatchPayrollPaidForPeriod(empId, year, month){
    var sum = 0;
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled) return;
      if(t.direction!=="chiqim") return;
      if(t.category!=="ish_haqi") return;
      if(t.counterpartyType!=="employee" || t.counterpartyId!==empId) return;
      if(Number(t.payrollYear)!==Number(year) || Number(t.payrollMonth)!==Number(month)) return;
      if(t.methods && t.methods.length){
        t.methods.forEach(function(mm){ if(mm.method==="otkazma") sum += Number(mm.amount)||0; });
      } else {
        sum += Number(t.amount)||0;
      }
    });
    return sum;
  }
  /* "Ходимлар бўйича" (батч) иш ҳақи тўлови воситасида, айнан шу (йил, ой)
     ҳисоблаш даврига тегишли деб БЕЛГИЛАНГАН (payrollYear/payrollMonth/
     category="ish_haqi" тегги) ва НАҚД усули орқали шу ходимга тўланган
     суммани қайтаради — юқоридаги employeeBatchPayrollPaidForPeriod'нинг
     фақат "otkazma" эмас, "naqd" усулини ҳисобловчи жуфти. Ҳисобот
     бўлимидаги "Накд туланди" устуни учун ишлатилади. */
  function employeeBatchPayrollPaidForPeriodCash(empId, year, month){
    var sum = 0;
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled) return;
      if(t.direction!=="chiqim") return;
      if(t.category!=="ish_haqi") return;
      if(t.counterpartyType!=="employee" || t.counterpartyId!==empId) return;
      if(Number(t.payrollYear)!==Number(year) || Number(t.payrollMonth)!==Number(month)) return;
      if(t.methods && t.methods.length){
        t.methods.forEach(function(mm){ if(mm.method==="naqd") sum += Number(mm.amount)||0; });
      }
    });
    return sum;
  }
  /* "Қолдиқларни киритиш" бўлимида шу ходим учун, айнан шу (йил, ой) даврида
     қўлда киритилган қолдиқ бор-йўқлигини текширади. Бор бўлса — шу қиймат
     ходимнинг "Ой бошидаги қолдиғи" сифатида ҳар доим устун туради (пастдаги
     аввалги ойнинг иш ҳақи ҳисоблашидан олинадиган автомат ҳисоблашдан кўра). */
  function manualOpeningBalance(empId, year, month){
    var runs = STATE.balanceEntries.filter(function(r){ return !r.cancelled && r.year===year && r.month===month; })
      .slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    for(var i=0;i<runs.length;i++){
      var list = runs[i].entries || [];
      for(var j=0;j<list.length;j++){
        if(list[j].employeeId===empId) return {found:true, amount:Number(list[j].amount)||0};
      }
    }
    return {found:false, amount:0};
  }
  /* Ўтган ойнинг Якуний қолдиғи — шу ойнинг "Ой бошидаги қолдиғи" бўлади.
     Аммо агар шу ходим учун, айнан шу даврга "Қолдиқларни киритиш" бўлимида
     қўлда қолдиқ киритилган бўлса — ўша қиймат устун туради.
     МУҲИМ (Раунд 35 тузатиши): аввалроқ бу ерда ЎТГАН ойнинг сақлашда
     "қотиб қолган" (frozen) prevRuns[i].employees[empId].closing қиймати
     ўқиларди. Бу сабабли, масалан, сентябрни (тўланмаган ҳолда) сақлаб,
     ундан кейин октябрни ҳам сақлаб, ФАҚАТ ШУНДАН КЕЙИН сентябрни
     картага тўласа — октябрнинг "Ой бошидаги қолдиғи" ҳамон сентябрнинг
     ЭСКИ (тўланмаган) қотган қолдиғидан олинарди, октябрь ёзувини қайта
     очиб қайта сақламагунча тузалмасди (фойдаланувчи хато топди: "Ҳисобот"
     тўғри (0) кўрсатса ҳам, "Иш ҳақи ҳисоблаш" рўйхатида октябрь ҳамон
     хато/шишган сумма кўрсатарди). Энди эса ЎТГАН ойнинг сатрлари ҳар доим
     ЖОРИЙ (live) ҳолда, computePayrollRows орқали ЯНГИДАН ҳисобланади —
     рекурсив равишда, керак бўлса яна ундан олдинги ойга ҳам шундай давом
     этиб — шунинг учун Кассадаги ҳар қандай янги тўлов ҳеч бир ёзувни
     қайта очиб сақламасдан ҳам дарҳол тўғри акс этади. opening/closing
     учун қўлда ўзгартириш имконияти умуман йўқ (фақат кўрсатиладиган,
     ҳисобланадиган устунлар), шунинг учун бу ерда "live" қилиш ҳеч қандай
     фойдаланувчи томонидан киритилган маълумотни йўқотмайди. */
  function previousPayrollClosing(empId, year, month, excludeRunId){
    var manual = manualOpeningBalance(empId, year, month);
    if(manual.found) return manual.amount;
    var py = month>1 ? year : year-1;
    var pm = month>1 ? month-1 : 12;
    var prevRuns = STATE.payrollRuns.filter(function(r){ return !r.cancelled && r.year===py && r.month===pm && r.id!==excludeRunId; })
      .slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    for(var i=0;i<prevRuns.length;i++){
      var prevRun = prevRuns[i];
      if(!(prevRun.employees && prevRun.employees[empId])) continue;
      var liveRows = computePayrollRows(prevRun);
      for(var j=0;j<liveRows.length;j++){
        if(liveRows[j].employeeId===empId) return Number(liveRows[j].closing)||0;
      }
    }
    return 0;
  }

  function computePayrollRows(fs){
    var advRun = advanceRunById(fs.advanceRunId);
    if(!advRun) return [];
    var advTotals = advanceRunTotals(advRun);
    return advTotals.rows.map(function(ar, i){
      var ov = (fs.employees && fs.employees[ar.employeeId]) || {};
      /* Аванслардан кейинги қолдиқ (Аванслар бўлимидаги "Қолдиқ (аванс минус)")
         асосида Карта ва Нақд автомат ҳисобланади: Карта = қолдиқ/2,
         Нақд = қолдиқ − Карта. Фойдаланувчи қайси катакни ўзгартирса,
         фақат ШУ катак қўлда белгиланган қиймат сифатида сақланади (қуйидаги
         алоҳида тингловчилар орқали) — бошқа катак эса ҳамон автомат
         ҳисобланишда давом этади. */
      var advRemaining = Number(ar.remaining)||0;
      var cardAuto = Math.round(advRemaining/2);
      var card = (ov.card!==undefined && ov.card!==null) ? Math.round(Number(ov.card)) : cardAuto;
      var cashAuto = Math.round(Math.max(0, advRemaining - card));
      var cash = (ov.cash!==undefined && ov.cash!==null) ? Math.round(Number(ov.cash)) : cashAuto;
      /* Оклад = Карта/0,88, сўнгра ЮҚОРИГА (яъни охирги 3 та рақами) 100 сўмгача
         яхлитланади (масалан 2 556 818,18 → 2 556 900), одатдаги энг яқин
         юзлик эмас. */
      var okladAuto = Math.ceil((card/0.88)/100)*100;
      var oklad = (ov.okladOverride!==undefined && ov.okladOverride!==null && ov.okladOverride!=="") ? Number(ov.okladOverride) : okladAuto;
      var taxPct = (ov.taxPct!==undefined && ov.taxPct!==null && ov.taxPct!=="") ? Number(ov.taxPct) : 12;
      var socPct = (ov.socPct!==undefined && ov.socPct!==null && ov.socPct!=="") ? Number(ov.socPct) : 11.9;
      var pensionPct = (ov.pensionPct!==undefined && ov.pensionPct!==null && ov.pensionPct!=="") ? Number(ov.pensionPct) : 0.1;
      var taxAmount = oklad*taxPct/100;
      var socAmount = oklad*socPct/100;
      var pensionAmount = oklad*pensionPct/100;
      var col7 = oklad - socAmount - pensionAmount;
      var cardAdvanceAuto = employeeCardAdvancePaidForPeriod(ar.employeeId, fs.year, fs.month);
      /* МУҲИМ (Раунд 35 тузатиши): аввалроқ бу ерда ov.cardAdvance бор
         бўлса — қандай пайдо бўлишидан қатъий назар (фойдаланувчи ўз
         қўли билан ёзганми ёки аввалги сақлашда автомат қиймат "қотиб"
         қолганми) — ўша қотган рақам ишлатиларди. Бу "музлаб қолиш"
         сабабли, Кассада янги тўлов қилинганидан кейин ҳам, аввал
         сақланган ёзувлар ЭСКИ қийматни кўрсатишда давом этарди —
         форма қайта очилиб қайта сақланмагунча. Энди фақат ФОЙДАЛАНУВЧИ
         АЙНАН ШУ катакни ўз қўли билан ўзгартирганда белгиланадиган
         ov.cardAdvanceManual===true бўлган ҳолдагина қотган қиймат
         ишлатилади; акс ҳолда ҳар доим ЖОРИЙ (live) автомат қиймат
         ишлатилади. */
      var cardAdvance = (ov.cardAdvanceManual===true && ov.cardAdvance!==undefined && ov.cardAdvance!==null && ov.cardAdvance!=="") ? Number(ov.cardAdvance) : cardAdvanceAuto;
      /* "Картага тўланган ойлик" — Кассадаги "Ходимлар бўйича" (батч) иш ҳақи
         тўлови воситасида шу ходимга аллақачон тўланган ойлик суммаси.
         МУҲИМ (фойдаланувчи сўровига кўра, Иш ҳақи ҳисоблаш бўлимида АТАЙЛАБ
         Ҳисобот бўлимидан ФАРҚЛИ мантиқ ишлатилади — унга тегмаслик сўралган):
         иш ҳақи одатда ЎЗИ ҳисобланган ойда эмас, КЕЙИНГИ ойда (карта орқали)
         тўланади — масалан, сентябрь учун ҳисобланган ойлик, Кассада
         "сентябрь" даври деб белгиланиб тўланса ҳам, аслида ОКТЯБРЬда қўлга
         тегади. Шунга кўра, бу ерда ЖОРИЙ (fs.year/fs.month) эмас, балки
         ЎТГАН ой учун белгиланган тўловлар қидирилади: октябрь
         ҳисоблашида — сентябрь даври деб белгиланган тўловлар кўринади
         (сентябрнинг ЎЗИДА эса кўринмайди — акс ҳолда бир хил тўлов икки
         марта ҳисобга олинган бўларди: бир марта сентябрнинг ўз
         қолдиғидан, яна бир марта октябрдан). */
      var kartagaPy = fs.month>1 ? fs.year : fs.year-1;
      var kartagaPm = fs.month>1 ? fs.month-1 : 12;
      var kartagaTolanganOylikAuto = employeeBatchPayrollPaidForPeriod(ar.employeeId, kartagaPy, kartagaPm);
      /* Раунд 35: юқоридаги cardAdvance каби — фақат АТАЙЛАБ (Manual)
         фойдаланувчи қўли билан ўзгартирилган бўлса қотган қиймат
         ишлатилади, акс ҳолда ҳар доим ЖОРИЙ автомат қиймат (шу орқали
         "музлаб қолиш" хатоси бутунлай бартараф этилади — масалан,
         октябрни сентябрдан олдин сақлаб қўйган бўлса ҳам, сентябр
         кейинроқ тўланганда октябрнинг бу катаги ҳам дарҳол тўғриланади,
         ёзувни қайта очиб сақлаш шарт эмас). */
      var kartagaTolanganOylik = (ov.kartagaTolanganOylikManual===true && ov.kartagaTolanganOylik!==undefined && ov.kartagaTolanganOylik!==null && ov.kartagaTolanganOylik!=="") ? Number(ov.kartagaTolanganOylik) : kartagaTolanganOylikAuto;
      var opening = previousPayrollClosing(ar.employeeId, fs.year, fs.month, fs.id);
      var closing = opening + col7 - cardAdvance - kartagaTolanganOylik;
      return {
        idx: i+1, employeeId: ar.employeeId, fullName: ar.fullName, workshopName: ar.workshopName,
        advRemaining: advRemaining,
        cash: cash, card: card, okladAuto: okladAuto, oklad: oklad,
        taxPct: taxPct, taxAmount: taxAmount, socPct: socPct, socAmount: socAmount,
        pensionPct: pensionPct, pensionAmount: pensionAmount, col7: col7,
        cardAdvanceAuto: cardAdvanceAuto, cardAdvance: cardAdvance,
        kartagaTolanganOylikAuto: kartagaTolanganOylikAuto, kartagaTolanganOylik: kartagaTolanganOylik,
        opening: opening, closing: closing, note: ov.note||""
      };
    });
  }
  function payrollRunTotals(fs){
    var rows = computePayrollRows(fs);
    var t = {cash:0,card:0,oklad:0,taxAmount:0,socAmount:0,pensionAmount:0,col7:0,cardAdvance:0,kartagaTolanganOylik:0,opening:0,closing:0};
    rows.forEach(function(r){
      t.cash+=r.cash; t.card+=r.card; t.oklad+=r.oklad; t.taxAmount+=r.taxAmount; t.socAmount+=r.socAmount;
      t.pensionAmount+=r.pensionAmount; t.col7+=r.col7; t.cardAdvance+=r.cardAdvance; t.kartagaTolanganOylik+=r.kartagaTolanganOylik; t.opening+=r.opening; t.closing+=r.closing;
    });
    t.empCount = rows.length; t.rows = rows;
    return t;
  }

  function renderPayrollTab(){
    setTopbar("Иш ҳақи ҳисоблаш", STATE.payrollRuns.length+" та ҳисоблаш", '<button class="btn btn-primary" id="payrollCreateBtn">'+ICONS.plus+'Яратиш</button>');
    var root = document.getElementById("content");
    var html = empSubnav("payroll")+sampleBanner();
    /* Саналар энди ЯРАТИЛГАН вақти эмас, балки киритилган санаси (r.date)
       бўйича камайиш тартибида сараланади; давр (йил) тугмаси орқали
       фақат танланган йилга тегишли ҳисоблашлар кўрсатилади (2026-10-01). */
    var allList = STATE.payrollRuns.slice().sort(function(a,b){
      var ad=a.date||(a.createdAt||"").slice(0,10), bd=b.date||(b.createdAt||"").slice(0,10);
      if(ad!==bd) return bd.localeCompare(ad);
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    html += '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:4px;">'+
      yearPickerHtml("payrollList", STATE.payrollListYear, STATE.payrollListYearWin)+
      onlyActiveCheckboxHtml("payrollList-onlyactive", STATE.payrollListOnlyActive)+
      '</div>';
    var yearList = allList.filter(function(r){ return (r.year||0)===STATE.payrollListYear; });
    var list = STATE.payrollListOnlyActive!==false ? yearList.filter(function(r){ return !r.cancelled; }) : yearList;
    if(!allList.length){
      html += emptyState("Ҳали иш ҳақи ҳисоби йўқ", "«Яратиш» тугмаси орқали аванслар асосида ойлик иш ҳақини ҳисобланг.");
    } else if(!yearList.length){
      html += emptyState("Бу йилда ҳисоблаш йўқ", "Бошқа йилни танланг ёки «Яратиш» тугмаси орқали янги ҳисоблаш киритинг.");
    } else if(!list.length){
      html += emptyState("Ҳеч нарса топилмади", "Бу йилда фақат бекор қилинган ёзувлар бор — уларни кўриш учун «Фақат бажарилганлар» белгисини олиб ташланг.");
    } else {
      var rows = list.map(function(r, idx){
        var periodLabel = (MONTHS_FULL[(r.month||1)-1]||"")+" "+r.year+" йил";
        var totals = payrollRunTotals(r);
        return '<tr'+(r.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(r.date||(r.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(periodLabel)+'</td>'+
          '<td class="num cell-muted">'+totals.empCount+' та ходим</td>'+
          '<td class="num cell-strong">'+fmtSum(totals.closing)+'</td>'+
          '<td>'+(r.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-pr-copy="'+r.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-pr-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-pr-cancel="'+r.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (r.cancelled?'<button class="btn btn-ghost btn-icon" data-pr-restore="'+r.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-pr-print="'+r.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-pr-export="'+r.id+'" title="Excel’га юклаш">'+ICONS.download+'</button>'+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Давр</th><th>Ходимлар</th><th>Якуний қолдиқ жами</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireEmpSubnav(root);
    wireYearPicker(root, "payrollList",
      function(){ return STATE.payrollListYear; }, function(y){ STATE.payrollListYear=y; },
      function(){ return STATE.payrollListYearWin; }, function(w){ STATE.payrollListYearWin=w; },
      renderPayrollTab);
    var payrollListOnlyActiveEl = document.getElementById("payrollList-onlyactive");
    if(payrollListOnlyActiveEl) payrollListOnlyActiveEl.addEventListener("change", function(){ STATE.payrollListOnlyActive = payrollListOnlyActiveEl.checked; renderPayrollTab(); });
    document.getElementById("payrollCreateBtn").addEventListener("click", function(){ openPayrollForm(null); });
    root.querySelectorAll("[data-pr-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-pr-copy");}); if(!r) return;
      var c = JSON.parse(JSON.stringify(r));
      delete c.id; c.cancelled=false; c.createdAt="";
      openPayrollForm(c);
      toast("Нусха олинди — даврни текшириб сақланг");
    }); });
    root.querySelectorAll("[data-pr-edit]").forEach(function(b){ b.addEventListener("click", function(){ openPayrollForm(list.find(function(x){return x.id===b.getAttribute("data-pr-edit");})); }); });
    root.querySelectorAll("[data-pr-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-pr-cancel");});
      openConfirm("Ҳисоблашни бекор қилиш", "Бу иш ҳақи ҳисоблаши бекор қилинсинми? Ёзув тарихда сақланиб қолади.", "Ҳа, бекор қилиш", function(){ dbUpdate("payrollRuns", r.id, {cancelled:true}, STATE.payrollRuns); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-pr-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-pr-restore");});
      openConfirm("Ҳисоблашни тиклаш", "Бу иш ҳақи ҳисоблаши қайта тикланиб, фаол ҳолатга қайтарилсинми?", "Ҳа, тиклаш", function(){ dbUpdate("payrollRuns", r.id, {cancelled:false}, STATE.payrollRuns); toast("Тикланди"); }, true);
    }); });
    root.querySelectorAll("[data-pr-print]").forEach(function(b){ b.addEventListener("click", function(){
      printPayrollRun(list.find(function(x){return x.id===b.getAttribute("data-pr-print");}));
    }); });
    root.querySelectorAll("[data-pr-export]").forEach(function(b){ b.addEventListener("click", function(){
      exportPayrollRunDetail(list.find(function(x){return x.id===b.getAttribute("data-pr-export");}));
    }); });
  }

  function openPayrollForm(existing){
    var isEdit = !!(existing && existing.id);
    var curY = new Date().getFullYear();
    var fs = {
      id: existing?existing.id:undefined,
      date: (existing && existing.date) || todayISO(),
      year: (existing && existing.year) || curY,
      month: (existing && existing.month) || (new Date().getMonth()+1),
      advanceRunId: (existing && existing.advanceRunId) || "",
      employees: (existing && existing.employees) ? JSON.parse(JSON.stringify(existing.employees)) : {}
    };
    function advanceRunOptions(){
      return STATE.advanceRuns.filter(function(r){ return !r.cancelled && r.year===fs.year && r.month===fs.month; })
        .slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    }
    var head = '<div class="field-row">'+
        '<div class="field"><label>Сана</label><input type="date" id="pr-date" value="'+esc(fs.date)+'"></div>'+
        '<div class="field"><label>Давр</label><div class="field-row" style="grid-template-columns:1fr 1fr;gap:8px;">'+
          '<input type="number" id="pr-year" value="'+esc(fs.year||curY)+'">'+
          '<select id="pr-month">'+MONTHS_FULL.map(function(mn,i){return '<option value="'+(i+1)+'"'+(fs.month===(i+1)?" selected":"")+'>'+mn+'</option>';}).join("")+'</select>'+
        '</div></div>'+
      '</div>'+
      '<div class="field"><label>Аванс операцияси</label><select id="pr-advrun"></select></div>'+
      '<div id="pr-rows"></div>'+
      '<div id="pr-summary"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Ҳисоблашни таҳрирлаш":"Янги ҳисоблаш", head, foot, true);
    m.querySelector(".modal").classList.add("xxxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    function syncFromInputs(){
      var dEl=m.querySelector("#pr-date"); if(dEl) fs.date=dEl.value;
      var yEl=m.querySelector("#pr-year"); if(yEl) fs.year=Number(yEl.value)||fs.year;
      var moEl=m.querySelector("#pr-month"); if(moEl) fs.month=Number(moEl.value)||fs.month;
      var arEl=m.querySelector("#pr-advrun"); if(arEl) fs.advanceRunId=arEl.value;
      /* Эслатма: Нақд, Карта ва Оклад катаклари бу ерда ЎҚИЛМАЙДИ — улар
         автомат ҳисобланади (Карта=Қолдиқ/2, Нақд=Қолдиқ−Карта, Оклад=
         Карта/0,88) ва фақат ФОЙДАЛАНУВЧИ АЙНАН ШУ катакни ўзгартирганда
         (қуйидаги алоҳида тингловчилар орқали) қўлда белгиланган қиймат
         сифатида сақланади. Агар бу ерда ҳар доим ўқилса, бошқа бирор
         катак ўзгарганда ҳам экрандаги ЭСКИ (ҳали қайта ҳисобланмаган)
         қиймат "қўлда киритилган" деб хато сақланиб, автомат ҳисоблаш
         бузилиб қоларди. */
      m.querySelectorAll("[data-pr-taxpct]").forEach(function(inp){ var k=inp.getAttribute("data-pr-taxpct"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].taxPct=Number(inp.value)||0; });
      m.querySelectorAll("[data-pr-socpct]").forEach(function(inp){ var k=inp.getAttribute("data-pr-socpct"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].socPct=Number(inp.value)||0; });
      m.querySelectorAll("[data-pr-pensionpct]").forEach(function(inp){ var k=inp.getAttribute("data-pr-pensionpct"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].pensionPct=Number(inp.value)||0; });
      /* Эслатма: "Тўланган аванс (пул ўтказмаси)" (cardAdvance) ва "Картага
         тўланган ойлик" (kartagaTolanganOylik) ҲАМ юқоридагидек — бу ерда
         ЎҚИЛМАЙДИ. Улар ҳам худди Нақд/Карта/Оклад каби ҳар доим (давр —
         йил/ой — бўйича) автомат қайта ҳисобланиши керак (employeeCard
         AdvancePaidForPeriod/employeeBatchPayrollPaidForPeriod орқали), фақат
         фойдаланувчи АЙНАН ШУ катакни ўзгартирганда қўлда белгиланган қиймат
         сифатида сақланади (пастдаги алоҳида тингловчилар). Аввал бу ерда ҳам
         ўқилгани сабабли, фойдаланувчи фақат ойни (#pr-month) алмаштирганда
         ҳам ЭСКИ ойнинг экрандаги (ҳали қайта ҳисобланмаган) қиймати янги
         ойга "қўлда киритилган" деб хато музлаб қолар эди — натижада, масалан,
         сентябрь ойи учун кўрсатилган "Тўланган аванс"нинг қиймати, ой
         октябрга алмаштирилганда, октябрга кўчиб ўтиб қолар эди. */
      m.querySelectorAll("[data-pr-note]").forEach(function(inp){ var k=inp.getAttribute("data-pr-note"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].note=inp.value; });
    }
    function renderAdvRunSelect(){
      var opts = advanceRunOptions();
      var sel = m.querySelector("#pr-advrun");
      if(!opts.length){
        sel.innerHTML = '<option value="">— бу давр учун аванс операцияси топилмади —</option>';
        fs.advanceRunId = "";
      } else {
        var stillValid = opts.some(function(r){return r.id===fs.advanceRunId;});
        if(!stillValid) fs.advanceRunId = opts[0].id;
        sel.innerHTML = opts.map(function(r){
          var t = advanceRunTotals(r);
          return '<option value="'+r.id+'"'+(fs.advanceRunId===r.id?" selected":"")+'>'+fmtDateShort(r.date||(r.createdAt||"").slice(0,10))+' · '+t.empCount+' та ходим</option>';
        }).join("");
      }
    }
    function renderRows(){
      var rows = computePayrollRows(fs);
      var rowsHtml = rows.length ? rows.map(function(r){
        return '<tr>'+
          '<td class="cell-muted">'+r.idx+'</td>'+
          '<td class="cell-strong">'+esc(r.fullName)+'</td>'+
          '<td class="num cell-muted" title="Аванслар бўйича: наряд қолдиғи − берилган аванс">'+fmtSum(r.advRemaining)+'</td>'+
          '<td><input class="sr-input" type="text" inputmode="decimal" style="width:88px;" data-pr-cash="'+esc(r.employeeId)+'" value="'+esc(r.cash||0)+'" title="Авто: Қолдиқ − Карта — қўлда ҳам ўзгартириш мумкин. Эксцелдагидай: +сон+сон... ёзиб Enter босса қўшилади"></td>'+
          '<td><input class="sr-input" type="text" inputmode="decimal" style="width:88px;" data-pr-card="'+esc(r.employeeId)+'" value="'+esc(r.card||0)+'" title="Авто: Қолдиқ/2 — қўлда ҳам ўзгартириш мумкин. Эксцелдагидай: +сон+сон... ёзиб Enter босса қўшилади"></td>'+
          '<td><input class="sr-input" type="number" min="0" step="any" style="width:96px;" data-pr-oklad="'+esc(r.employeeId)+'" value="'+esc(r.oklad||0)+'" title="Авто: Карта/0,88 (юқорига 100 сўмгача яхлитланган) — қўлда ҳам ўзгартириш мумкин"></td>'+
          '<td class="num cell-muted" data-pr-taxamt="'+esc(r.employeeId)+'">'+fmtSum(r.taxAmount)+'<div style="margin-top:2px;"><input class="sr-input" type="number" min="0" step="any" style="width:52px;font-size:11px;" data-pr-taxpct="'+esc(r.employeeId)+'" value="'+esc(r.taxPct)+'">%</div></td>'+
          '<td class="num cell-muted" data-pr-socamt="'+esc(r.employeeId)+'">'+fmtSum(r.socAmount)+'<div style="margin-top:2px;"><input class="sr-input" type="number" min="0" step="any" style="width:52px;font-size:11px;" data-pr-socpct="'+esc(r.employeeId)+'" value="'+esc(r.socPct)+'">%</div></td>'+
          '<td class="num cell-muted" data-pr-pensionamt="'+esc(r.employeeId)+'">'+fmtSum(r.pensionAmount)+'<div style="margin-top:2px;"><input class="sr-input" type="number" min="0" step="any" style="width:52px;font-size:11px;" data-pr-pensionpct="'+esc(r.employeeId)+'" value="'+esc(r.pensionPct)+'">%</div></td>'+
          '<td class="num cell-strong" data-pr-col7="'+esc(r.employeeId)+'">'+fmtSum(r.col7)+'</td>'+
          '<td><input class="sr-input" type="number" min="0" step="any" style="width:96px;" data-pr-cardadv="'+esc(r.employeeId)+'" value="'+esc(r.cardAdvance||0)+'" title="Авто: пул ўтказмасидан тўланган аванс (кассадан) — қўлда ҳам ўзгартириш мумкин"></td>'+
          '<td><input class="sr-input" type="number" min="0" step="any" style="width:96px;" data-pr-kartagatolangan="'+esc(r.employeeId)+'" value="'+esc(r.kartagaTolanganOylik||0)+'" title="Авто: «Ходимлар бўйича» орқали шу давр учун картага тўланган ойлик (кассадан) — қўлда ҳам ўзгартириш мумкин"></td>'+
          '<td class="num cell-muted" data-pr-opening="'+esc(r.employeeId)+'">'+fmtSum(r.opening)+'</td>'+
          '<td class="num cell-strong" data-pr-closing="'+esc(r.employeeId)+'" style="'+(r.closing<0?"color:var(--critical);":"")+'">'+fmtSum(r.closing)+'</td>'+
          '<td><input class="sr-input" type="text" style="width:110px;" data-pr-note="'+esc(r.employeeId)+'" value="'+esc(r.note||"")+'"></td>'+
        '</tr>';
      }).join("") : '<tr><td colspan="15" class="cell-muted" style="text-align:center;padding:20px;">Аванс операциясини танланг</td></tr>';
      /* Эслатма: қуйидаги иккита сарлавҳа ("ЯИТ" ва "Даромад солиғи") атайин
         алмаштирилган — фойдаланувчининг сўровига кўра фақат НОМЛАР ўрин
         алмашди, устунлар остидаги маълумот (taxPct/taxAmount, keyingi navbatda
         socPct/socAmount) ЎЗГАРМАДИ. */
      m.querySelector("#pr-rows").innerHTML = '<div class="table-wrap table-frozen-fio"><table class="sr-table"><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Қолдиқ (аванс)</th><th>Нақд</th><th>Карта</th><th>Оклад</th><th>ЯИТ</th><th>Даромад солиғи</th><th>0,1%</th><th>Ҳисобланган</th><th>Тўланган аванс (пул ўтказмаси)</th><th>Картага тўланган ойлик</th><th>Ой бошидаги қолдиқ</th><th>Якуний қолдиқ</th><th>Изоҳ</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>';
      renderSummary(rows);
      /* Карта, Нақд ва Оклад катаклари алоҳида — уларнинг "change" ҳодисаси
         фақат шу катакнинг ЎЗИ таҳрирланганда қўлда белгиланган қиймат
         сифатида сақлайди (юқоридаги изоҳга қаранг), кейин эса умумий
         синхронизация ва қайта чизиш амалга оширилади. */
      m.querySelectorAll("[data-pr-oklad]").forEach(function(inp){
        inp.addEventListener("change", function(){
          var k = inp.getAttribute("data-pr-oklad");
          fs.employees[k] = fs.employees[k]||{};
          fs.employees[k].okladOverride = inp.value===""?null:Number(inp.value);
          syncFromInputs(); renderRows();
        });
      });
      m.querySelectorAll("[data-pr-card]").forEach(function(inp){
        /* Эслатма: катак type="text" (Эксцелдагидай "+" ёзиш имконияти учун),
           шунинг учун DOM'ни (renderRows орқали) ЎЗГАРТИРИШни keydown/change
           ҳодисасининг ЎЗИДА эмас, балки setTimeout(...,0) орқали КЕЙИНГИ
           "tick"да бажарамиз — акс ҳолда браузер шу input'нинг ўзида ҳали
           танлов (selection)ни тозалаётган пайтда катак DOM'дан олиб
           ташланиб, "node is no longer a child" хатоси чиқиши мумкин. */
        inp.addEventListener("change", function(){
          var k = inp.getAttribute("data-pr-card");
          var val = inp.value===""?undefined:parsePlusSumExpr(inp.value);
          setTimeout(function(){
            fs.employees[k] = fs.employees[k]||{};
            fs.employees[k].card = val;
            syncFromInputs(); renderRows();
          }, 0);
        });
        /* Эксцелдагидай "+" орқали қўшиш: катакда автомат сон турганда
           фойдаланувчи "+1000000+500000" деб ёзиб Enter босса, катак
           қийматлари йиғиндисига алмаштирилади. */
        inp.addEventListener("keydown", function(e){
          if(e.key!=="Enter") return;
          e.preventDefault();
          var k = inp.getAttribute("data-pr-card");
          var sum = parsePlusSumExpr(inp.value);
          setTimeout(function(){
            fs.employees[k] = fs.employees[k]||{};
            fs.employees[k].card = sum;
            syncFromInputs(); renderRows();
          }, 0);
        });
      });
      m.querySelectorAll("[data-pr-cash]").forEach(function(inp){
        inp.addEventListener("change", function(){
          var k = inp.getAttribute("data-pr-cash");
          var val = inp.value===""?undefined:parsePlusSumExpr(inp.value);
          setTimeout(function(){
            fs.employees[k] = fs.employees[k]||{};
            fs.employees[k].cash = val;
            syncFromInputs(); renderRows();
          }, 0);
        });
        inp.addEventListener("keydown", function(e){
          if(e.key!=="Enter") return;
          e.preventDefault();
          var k = inp.getAttribute("data-pr-cash");
          var sum = parsePlusSumExpr(inp.value);
          setTimeout(function(){
            fs.employees[k] = fs.employees[k]||{};
            fs.employees[k].cash = sum;
            syncFromInputs(); renderRows();
          }, 0);
        });
      });
      m.querySelectorAll("[data-pr-cardadv]").forEach(function(inp){
        inp.addEventListener("change", function(){
          var k = inp.getAttribute("data-pr-cardadv");
          fs.employees[k] = fs.employees[k]||{};
          /* Раунд 35: фақат МАНА ШУ ерда, фойдаланувчи катакни ўз қўли
             билан ўзгартирганда, "Manual" белгиси ҳам қўйилади — шунда
             бу қиймат сақлашда ҳақиқий (атайлаб) қўлда белгиланган
             қиймат сифатида музлатилади. Катак бўшатилса — Manual
             белгиси ҳам олиб ташланади (яна автоматга қайтади). */
          fs.employees[k].cardAdvance = inp.value===""?undefined:Number(inp.value);
          fs.employees[k].cardAdvanceManual = inp.value===""?undefined:true;
          syncFromInputs(); renderRows();
        });
      });
      m.querySelectorAll("[data-pr-kartagatolangan]").forEach(function(inp){
        inp.addEventListener("change", function(){
          var k = inp.getAttribute("data-pr-kartagatolangan");
          fs.employees[k] = fs.employees[k]||{};
          /* Раунд 35: cardAdvance каби — фақат фойдаланувчи ўз қўли
             билан ўзгартирганда Manual белгиси қўйилади. */
          fs.employees[k].kartagaTolanganOylik = inp.value===""?undefined:Number(inp.value);
          fs.employees[k].kartagaTolanganOylikManual = inp.value===""?undefined:true;
          syncFromInputs(); renderRows();
        });
      });
      m.querySelectorAll("#pr-rows input:not([data-pr-oklad]):not([data-pr-card]):not([data-pr-cash])").forEach(function(inp){
        inp.addEventListener("change", function(){ syncFromInputs(); renderRows(); });
      });
    }
    function renderSummary(rows){
      if(!rows.length){ m.querySelector("#pr-summary").innerHTML=""; return; }
      var t = {cash:0,card:0,oklad:0,taxAmount:0,socAmount:0,pensionAmount:0,col7:0,cardAdvance:0,kartagaTolanganOylik:0,opening:0,closing:0};
      rows.forEach(function(r){ t.cash+=r.cash; t.card+=r.card; t.oklad+=r.oklad; t.taxAmount+=r.taxAmount; t.socAmount+=r.socAmount; t.pensionAmount+=r.pensionAmount; t.col7+=r.col7; t.cardAdvance+=r.cardAdvance; t.kartagaTolanganOylik+=r.kartagaTolanganOylik; t.opening+=r.opening; t.closing+=r.closing; });
      /* Эслатма: "ЯИТ" ва "Даромад солиғи" тугмачалари учун ҳам худди
         жадвал сарлавҳаларидагидек — taxAmount энди "ЯИТ", socAmount эса
         "Даромад солиғи" деб кўрсатилади (номлар алмашган, рақамлар эмас). */
      m.querySelector("#pr-summary").innerHTML = '<div class="section-head" style="margin:14px 0 8px;"><h2 style="font-size:14px;">Жами (барча ходимлар бўйича)</h2></div>'+
        '<div class="kpi-grid">'+
        '<div class="kpi"><div class="kpi-label">Ходим сони</div><div class="kpi-value" style="font-size:16px;">'+rows.length+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">Нақд</div><div class="kpi-value" style="font-size:16px;">'+fmtSum(t.cash)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">Оклад</div><div class="kpi-value" style="font-size:16px;">'+fmtSum(t.oklad)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">ЯИТ</div><div class="kpi-value" style="font-size:16px;">'+fmtSum(t.taxAmount)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">Даромад солиғи</div><div class="kpi-value" style="font-size:16px;">'+fmtSum(t.socAmount)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">ИНПС</div><div class="kpi-value" style="font-size:16px;">'+fmtSum(t.pensionAmount)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">Якуний қолдиқ</div><div class="kpi-value" style="font-size:16px;">'+fmtSum(t.closing)+'</div></div>'+
        '</div>';
    }

    m.querySelector("#pr-date").addEventListener("change", syncFromInputs);
    m.querySelector("#pr-year").addEventListener("change", function(){ syncFromInputs(); renderAdvRunSelect(); renderRows(); });
    m.querySelector("#pr-month").addEventListener("change", function(){ syncFromInputs(); renderAdvRunSelect(); renderRows(); });
    m.querySelector("#pr-advrun").addEventListener("change", function(){ syncFromInputs(); renderRows(); });

    renderAdvRunSelect();
    renderRows();

    m.querySelector("[data-save]").addEventListener("click", function(){
      syncFromInputs();
      if(!fs.advanceRunId){ toast("Аванс операциясини танланг"); return; }
      var computedRows = computePayrollRows(fs);
      var employeesOut = {};
      computedRows.forEach(function(r){
        var ovIn = fs.employees[r.employeeId] || {};
        /* Раунд 35: cardAdvanceManual/kartagaTolanganOylikManual белгилари
           ҳам сақланади — шунда фақат ФОЙДАЛАНУВЧИ АЙНАН ШУ сессияда ўз
           қўли билан ўзгартирган қиймат "қотган" (Manual) сифатида
           белгиланади, акс ҳолда (белги йўқ/false бўлса) кейинги
           ўқишларда ҳар доим ЖОРИЙ автомат қиймат ишлатилади — эски
           (аввалги версияларда сақланган) ёзувларда бу белги йўқ, шунинг
           учун улар ҳам автоматик равишда ЖОРИЙ ҳолатга ўтади. */
        employeesOut[r.employeeId] = {
          cash:r.cash, card:r.card, okladOverride:(ovIn.okladOverride!=null)?ovIn.okladOverride:null,
          taxPct:r.taxPct, socPct:r.socPct, pensionPct:r.pensionPct,
          cardAdvance:r.cardAdvance, cardAdvanceManual: ovIn.cardAdvanceManual===true,
          kartagaTolanganOylik:r.kartagaTolanganOylik, kartagaTolanganOylikManual: ovIn.kartagaTolanganOylikManual===true,
          opening:r.opening, closing:r.closing, note:r.note
        };
      });
      var data = { date: fs.date, year: fs.year, month: fs.month, advanceRunId: fs.advanceRunId, employees: employeesOut, cancelled:false };
      if(isEdit){ dbUpdate("payrollRuns", existing.id, data, STATE.payrollRuns); toast("Сақланди"); }
      else { data.createdAt = new Date().toISOString(); dbAdd("payrollRuns", data, STATE.payrollRuns); toast("Ҳисоблаш сақланди"); }
      closeModal();
    });
  }

  function printPayrollRun(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var totals = payrollRunTotals(run);
    var rows = "";
    totals.rows.forEach(function(r){
      rows += '<tr><td>'+r.idx+'</td><td>'+esc(r.fullName)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.advRemaining)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.cash)+'</td><td style="text-align:right;">'+fmtSum(r.card)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.oklad)+'</td><td style="text-align:right;">'+fmtSum(r.taxAmount)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.socAmount)+'</td><td style="text-align:right;">'+fmtSum(r.pensionAmount)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.col7)+'</td><td style="text-align:right;">'+fmtSum(r.cardAdvance)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.kartagaTolanganOylik)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.opening)+'</td><td style="text-align:right;font-weight:700;">'+fmtSum(r.closing)+'</td></tr>';
    });
    /* Эслатма: "ЯИТ" ва "Даромад солиғи" сарлавҳалари атайин алмаштирилган
       (фақат номлар — қуйидаги маълумот устунлари ўз тартибида қолди). */
    var body = '<table><tr><th>№</th><th>Ф.И.Ш.</th><th style="text-align:right;">Қолдиқ (аванс)</th><th style="text-align:right;">Нақд</th><th style="text-align:right;">Карта</th>'+
      '<th style="text-align:right;">Оклад</th><th style="text-align:right;">ЯИТ</th><th style="text-align:right;">Даромад солиғи</th><th style="text-align:right;">0,1%</th>'+
      '<th style="text-align:right;">Ҳисобланган</th><th style="text-align:right;">Тўланган аванс</th><th style="text-align:right;">Картага тўланган ойлик</th><th style="text-align:right;">Ой бошидаги қолдиқ</th><th style="text-align:right;">Якуний қолдиқ</th></tr>'+
      rows+
      '<tr><td colspan="2" style="font-weight:700;background:#f4f5f7;">Жами</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.rows.reduce(function(s,r){return s+r.advRemaining;},0))+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.cash)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.card)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.oklad)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.taxAmount)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.socAmount)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.pensionAmount)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.col7)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.cardAdvance)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.kartagaTolanganOylik)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.opening)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.closing)+'</td></tr>'+
      '</table>'+
      '<div class="v-sign"><div>Ҳисоблади</div><div>Тасдиқлади</div></div>';
    var html = voucherShell("Иш ҳақи ведомости", "Давр: "+esc(periodLabel)+" · Сана: "+esc(fmtDateShort(run.date||"")), body, "wide payroll-print");
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function exportPayrollRunDetail(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var totals = payrollRunTotals(run);
    var headers = ["№","Ф.И.Ш.","Қолдиқ (аванс)","Нақд","Карта","Оклад","ЯИТ","Даромад солиғи","0,1%","Ҳисобланган","Тўланган аванс","Картага тўланган ойлик","Ой бошидаги қолдиқ","Якуний қолдиқ","Изоҳ"];
    /* Сон устунлари endi fmtNum() орқали чиқарилади — "." эмас "," билан
       ўнлик ва бўш жой билан минглик ажратилган матн (масалан
       "4 807 550,48"), худди экрандаги кўриниш каби (2026-10-01 сўрови). */
    var dataRows = totals.rows.map(function(r){
      return [r.idx, r.fullName, fmtNum(r.advRemaining), fmtNum(r.cash), fmtNum(r.card), fmtNum(r.oklad),
        fmtNum(r.taxAmount), fmtNum(r.socAmount), fmtNum(r.pensionAmount),
        fmtNum(r.col7), fmtNum(r.cardAdvance), fmtNum(r.kartagaTolanganOylik), fmtNum(r.opening), fmtNum(r.closing), r.note||""];
    });
    /* Ходимлар рўйхати тугагандан кейин пастда "Жами" қатори — барча сон
       устунларининг йиғиндиси билан (2026-10-01 сўрови). */
    var advRemainingTotal = totals.rows.reduce(function(s,r){ return s+(Number(r.advRemaining)||0); }, 0);
    dataRows.push(["", "Жами", fmtNum(advRemainingTotal), fmtNum(totals.cash), fmtNum(totals.card), fmtNum(totals.oklad),
      fmtNum(totals.taxAmount), fmtNum(totals.socAmount), fmtNum(totals.pensionAmount),
      fmtNum(totals.col7), fmtNum(totals.cardAdvance), fmtNum(totals.kartagaTolanganOylik), fmtNum(totals.opening), fmtNum(totals.closing), ""]);
    exportHtmlTableAsExcel("Ish_haqi_"+run.year+"_"+String(run.month).padStart(2,"0")+".xls", "Иш ҳақи — "+periodLabel, headers, dataRows);
    toast("Excel файли юкланмоқда");
  }

