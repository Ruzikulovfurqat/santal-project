  /* ================= Ведомостлар =================
     Фойдаланувчи сўровига кўра (2026-10-16): Касса → Чиқим → харажат тури
     «Иш ҳақи» → «Ведомост бўйича» бўлимига кирганда БАРЧА ойлардаги
     ведомостлар рўйхати кўринади. Ҳар бир «Иш ҳақи ҳисоблаш» ёзувининг
     якуний қисмидан ИККИТА ведомост шаклланади:
       1) КАРТА (пластик) ведомости — ҳар бир ходимнинг «Якуний қолдиғи»
          (пластик картага ёзиладиган ойлик);
       2) НАҚД ведомости — ҳар бир ходимнинг «Нақд» устуни.
     Ҳолат шу ведомостга (payrollRunId + тўлов усули) боғланган касса
     чиқимлари бўйича ЖОРИЙ ҳисобланади: тўлиқ тўланса «Тўланди», қисман
     тўланса «Қисман тўланди — шунча қолди». Ведомост суммасидан ортиқча
     тўлаб бўлмайди (openKassaEmployeeBatchPayForm'даги текширув). */
  var VEDOMOST_KINDS = [
    {key:"card", method:"otkazma", name:"Карта (пластик)", chip:"chip-accent"},
    {key:"cash", method:"naqd",    name:"Нақд",            chip:"chip-warning"}
  ];
  function vedomostKind(key){ return VEDOMOST_KINDS.filter(function(k){ return k.key===key; })[0] || VEDOMOST_KINDS[0]; }
  /* Шу ведомост (иш ҳақи ҳисоблаши + усул) бўйича аллақачон тўланган
     суммалар: ходим кесимида, жами ва қайси касса амаллари орқали. */
  function vedomostPaidMap(runId, method){
    var map = {}, total = 0, ops = [];
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled) return;
      if(t.direction!=="chiqim" || t.category!=="ish_haqi") return;
      if(t.payrollRunId!==runId) return;
      var amt = 0;
      (t.methods||[]).forEach(function(mm){ if(mm.method===method) amt += Number(mm.amount)||0; });
      if(!amt) return;
      map[t.counterpartyId] = (map[t.counterpartyId]||0) + amt;
      total += amt;
      ops.push({id:t.id, date:t.date||(t.createdAt||"").slice(0,10), employeeId:t.counterpartyId,
                fullName:t.counterpartyName||employeeName(t.counterpartyId), amount:amt, note:t.description||""});
    });
    ops.sort(function(a,b){ return (a.date||"").localeCompare(b.date||""); });
    return {byEmp:map, total:total, ops:ops};
  }
  /* Битта ведомостнинг тўлиқ тавсифи. catName берилса — фақат шу
     категориядаги ходимлар (Кассадаги Чиқим категорияси билан мос). */
  function buildVedomost(run, kindKey, catName){
    var k = vedomostKind(kindKey);
    var allRows = computePayrollRows(run);
    var cat = String(catName||"").trim().toLowerCase();
    var rows = cat ? allRows.filter(function(r){
      var emp = employeeById(r.employeeId);
      return emp && String(emp.category||"").trim().toLowerCase()===cat;
    }) : allRows;
    var paid = vedomostPaidMap(run.id, k.method);
    var lines = rows.map(function(r){
      var due = Math.max(0, Math.round(Number(kindKey==="card" ? r.closing : r.cash)||0));
      var pd = Math.min(due, Number(paid.byEmp[r.employeeId])||0);
      return {employeeId:r.employeeId, fullName:r.fullName, workshopName:r.workshopName||"",
              due:due, paid:pd, left:Math.max(0, due-pd)};
    }).filter(function(l){ return l.due>0 || l.paid>0; });
    var total = lines.reduce(function(sm,l){ return sm+l.due; }, 0);
    var paidSum = lines.reduce(function(sm,l){ return sm+l.paid; }, 0);
    var empIds = {}; lines.forEach(function(l){ empIds[l.employeeId]=true; });
    return {
      runId: run.id, run: run, kind: kindKey, method: k.method, kindName: k.name, kindChip: k.chip,
      year: run.year, month: run.month, date: run.date || (run.createdAt||"").slice(0,10),
      periodLabel: (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил",
      lines: lines, empCount: lines.length, allCount: allRows.length, catName: catName||"",
      total: total, paid: paidSum, left: Math.max(0, total-paidSum),
      ops: paid.ops.filter(function(o){ return !cat || empIds[o.employeeId]; })
    };
  }
  function vedomostStatus(v){
    if(v.total<=0) return {text:"Сумма йўқ", chip:"chip-neutral"};
    if(v.paid >= v.total-0.004) return {text:"Тўланди", chip:"chip-good"};
    if(v.paid > 0.004) return {text:"Қисман тўланди · қолди "+fmtSum(v.left), chip:"chip-warning"};
    return {text:"Тўланмаган · "+fmtSum(v.left), chip:"chip-critical"};
  }
  /* Барча ойлардаги ведомостлар. Тартиб рақами энг эски ведомостдан
     бошлаб берилади — янги ёзув қўшилганда аввалгиларнинг рақами
     ўзгармайди. */
  function buildVedomostList(catName){
    var runs = STATE.payrollRuns.filter(function(r){ return !r.cancelled; }).slice().sort(function(a,b){
      if((a.year||0)!==(b.year||0)) return (a.year||0)-(b.year||0);
      if((a.month||0)!==(b.month||0)) return (a.month||0)-(b.month||0);
      var ad=a.date||(a.createdAt||"").slice(0,10), bd=b.date||(b.createdAt||"").slice(0,10);
      if(ad!==bd) return ad.localeCompare(bd);
      return (a.createdAt||"").localeCompare(b.createdAt||"");
    });
    var out = [];
    runs.forEach(function(r){
      VEDOMOST_KINDS.forEach(function(k){
        var v = buildVedomost(r, k.key, catName);
        if(v.total<=0 && v.paid<=0) return;
        out.push(v);
      });
    });
    out.forEach(function(v,i){ v.no = i+1; });
    return out;
  }
  /* «Кўзча» тугмаси — ведомост қаердан шаклланганини кўрсатади: қайси
     «Иш ҳақи ҳисоблаш» ёзувидан, қайси устундан, ходимлар кесимида
     ҳисобланган/тўланган/қолган суммалар ва тўловлар тарихи. */
  function openVedomostSourceModal(v, onBack){
    var st = vedomostStatus(v);
    var head = '<div class="card" style="padding:12px 14px;margin-bottom:12px;background:var(--surface-2);">'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;">'+
        '<span>Ведомост №: <b>'+v.no+'</b></span>'+
        '<span>Сана: <b>'+esc(fmtDateShort(v.date))+'</b></span>'+
        '<span>Давр: <b>'+esc(v.periodLabel)+'</b></span>'+
        '<span>Тури: <b>'+esc(v.kindName)+'</b></span>'+
        '<span>Ҳолати: <span class="chip '+st.chip+'">'+esc(st.text)+'</span></span>'+
      '</div>'+
      '<div class="field-hint" style="margin-top:8px;">Манба: «Ходимлар → Иш ҳақи ҳисоблаш» бўлимидаги '+
        esc(fmtDateShort(v.date))+' санали ёзувнинг якуний қисми — '+
        (v.kind==="card" ? '«Якуний қолдиқ» (пластик картага ёзиладиган ойлик) устуни' : '«Нақд» устуни')+
        (v.catName ? (' · фақат «'+esc(v.catName)+'» категориясидаги ходимлар ('+v.empCount+' та, ёзувда жами '+v.allCount+' та)') : '')+
        '.</div>'+
    '</div>';
    var rows = v.lines.map(function(l, i){
      var leftTxt = l.left<=0.004 ? '<span class="chip chip-good">тўланди</span>' : fmtSum(l.left);
      return '<tr><td>'+(i+1)+'</td><td class="cell-strong">'+esc(l.fullName)+'</td>'+
        '<td class="cell-muted">'+esc(l.workshopName||"—")+'</td>'+
        '<td class="num">'+fmtSum(l.due)+'</td><td class="num">'+fmtSum(l.paid)+'</td><td class="num">'+leftTxt+'</td></tr>';
    }).join("");
    var body = head+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Цех / категория</th>'+
        '<th class="num">Ҳисобланган</th><th class="num">Тўланган</th><th class="num">Қолди</th></tr></thead>'+
        '<tbody>'+(rows||'<tr><td colspan="6" class="cell-muted">Ходим йўқ</td></tr>')+'</tbody>'+
        '<tfoot><tr><th colspan="3">Жами</th><th class="num">'+fmtSum(v.total)+'</th>'+
          '<th class="num">'+fmtSum(v.paid)+'</th><th class="num">'+fmtSum(v.left)+'</th></tr></tfoot>'+
      '</table></div>'+
      '<div style="margin-top:14px;font-weight:800;font-size:13px;">Шу ведомост бўйича касса тўловлари</div>'+
      (v.ops.length
        ? '<div class="table-wrap" style="margin-top:6px;"><table><thead><tr><th>№</th><th>Сана</th><th>Ф.И.Ш.</th><th class="num">Сумма</th><th>Изоҳ</th></tr></thead><tbody>'+
            v.ops.map(function(o,i){ return '<tr><td>'+(i+1)+'</td><td>'+esc(fmtDateShort(o.date))+'</td>'+
              '<td class="cell-strong">'+esc(o.fullName||"—")+'</td><td class="num">'+fmtSum(o.amount)+'</td>'+
              '<td class="cell-muted">'+esc(o.note||"—")+'</td></tr>'; }).join("")+
          '</tbody></table></div>'
        : '<div class="field-hint" style="margin-top:6px;">Бу ведомост бўйича ҳали тўлов қилинмаган.</div>');
    var mv = openModal("Ведомост қандай шаклланган", body,
      '<button class="btn btn-secondary" data-cancel>'+ICONS.arrowLeft+'Орқага</button>', true, onBack||null);
    mv.querySelector(".modal").classList.add("xwide");
    mv.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onBack) onBack(); });
  }

  function openKassaEmployeeBatchPayForm(accountId, editRow, opts){
    opts = opts || {};
    var acc = cashAccountById(accountId);
    var curY = new Date().getFullYear();
    var isEdit = !!(editRow && editRow.isBatch);
    var firstMember = isEdit ? editRow.members[0] : null;
    var fs = isEdit ? {
      date: editRow.date || todayISO(),
      year: firstMember.payrollYear || curY,
      month: firstMember.payrollMonth || (new Date().getMonth()+1),
      payrollRunId: firstMember.payrollRunId || "",
      method: (firstMember.methods && firstMember.methods[0] && firstMember.methods[0].method) || "otkazma"
    } : { date: opts.date || todayISO(), year: curY, month: (new Date().getMonth()+1), payrollRunId: "", method: opts.method || "otkazma" };
    /* ВЕДОМОСТ РЕЖИМИ (2026-10-16): «Ведомост бўйича» рўйхатидан танланган
       ведомост — давр, иш ҳақи ҳисоблаши ва тўлов усулини ўзи белгилайди
       (улар шаклда қулфланади) ва тўлов суммаси ведомостнинг ҚОЛГАН
       қисмидан ошиб кетмайди. */
    var vedRef = (!isEdit && opts.vedomost) ? opts.vedomost : null;
    function currentVedomost(){
      if(!vedRef) return null;
      /* Тартиб рақами умумий рўйхат бўйича берилгани учун — ведомост
         шу рўйхатдан топилади (топилмаса, ўзи қайта ҳисобланади). */
      var all = buildVedomostList(vedRef.catName||"");
      for(var i=0;i<all.length;i++){
        if(all[i].runId===vedRef.runId && all[i].kind===vedRef.kind) return all[i];
      }
      var run = payrollRunById(vedRef.runId);
      return run ? buildVedomost(run, vedRef.kind, vedRef.catName||"") : null;
    }
    var vedInit = currentVedomost();
    if(vedInit){
      fs.year = vedInit.year; fs.month = vedInit.month;
      fs.payrollRunId = vedInit.runId; fs.method = vedInit.method;
    }
    /* Тахрирлашда ҳар бир аввалги ёзув ЎЗ ID сини (_origId) сақлаб қолади —
       сақлашда шу ID бўйича ЯНГИЛАНАДИ (ҳеч қачон ўчирилмайди); рўйхатдан
       олиб ташланган (ёки суммаси 0 қилинган) аввалги ёзув эса БЕКОР
       ҚИЛИНАДИ (cancelled:true), янги қўшилган ходим эса ХУДДИ ШУ
       batchGroupId билан янги ёзув сифатида яратилади. */
    var entries = isEdit ? editRow.members.map(function(m){
      return {employeeId:m.counterpartyId, fullName:m.counterpartyName, amount:Number(m.amount)||0, _origId:m.id};
    }) : [];

    /* Чиқим шаклида танланган КАТЕГОРИЯ бўйича фильтр (2026-10-15 сўрови):
       ходимнинг «Категория»си шу категорияга тенг бўлганлар кўрсатилади.
       Категория берилмаса — олдингидек касса бириктирилган цех бўйича. */
    var catFilterName = String(opts.categoryName||"").trim();
    var wsKey = (!isEdit && !catFilterName && acc) ? dwAccKey(acc) : "";
    var wsLabel = wsKey ? (DASH_WORKSHOPS.filter(function(d){ return d.key===wsKey; })[0]||{}).name : "";
    function payrollRunOptions(){
      return STATE.payrollRuns.filter(function(r){ return !r.cancelled && r.year===fs.year && r.month===fs.month; })
        .slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    }
    /* Сумма автомат тўлдирилиши — Иш ҳақи ҳисоблашнинг ЎЗИДАГИ (r.closing/
       r.cash, тўлов ёзилган пайтда "қотиб қолиши" мумкин) қийматдан ЭМАС,
       балки Ходимлар → Ҳисобот бўлимидаги ЖОРИЙ (қолган — аллақачон
       тўланганлар айирилган) "Картага тўланиши керак"/"Накд тўлаш керак"
       қийматидан олинади — шунда, масалан, аввалроқ Чиқимда «Ойлик»
       тугмаси орқали қисман тўлов қилинган бўлса, «Ходимлар бўйича»
       тугмаси очилганда фақат ҚОЛГАН сумма таклиф қилинади. */
    function defaultAmountFor(row, reportByEmp){
      var rr = reportByEmp ? reportByEmp[row.employeeId] : null;
      if(fs.method==="otkazma") return rr ? (Number(rr.closing)||0) : (Number(row.closing)||0);
      return rr ? (Number(rr.cashOwed)||0) : (Number(row.cash)||0);
    }
    function populateFromRun(){
      var ved = currentVedomost();
      if(ved){
        /* Ведомост режимида ҳар бир ходимга фақат ҚОЛГАН сумма таклиф
           қилинади (аллақачон тўланган қисми айирилган). */
        entries = ved.lines.filter(function(l){ return l.left>0; })
          .map(function(l){ return {employeeId:l.employeeId, fullName:l.fullName, amount:l.left}; });
        var nEl = m && m.querySelector ? m.querySelector("#keb-catnote") : null;
        if(nEl) nEl.textContent = "Ведомост №"+ved.no+" · "+ved.periodLabel+" · "+ved.kindName+
          " — жами "+fmtSum(ved.total)+", тўланган "+fmtSum(ved.paid)+", қолди "+fmtSum(ved.left)+
          (ved.catName ? (" (фақат «"+ved.catName+"» категорияси)") : "");
        return;
      }
      var run = payrollRunById(fs.payrollRunId);
      if(!run){ entries = []; return; }
      var reportByEmp = {};
      computeMonthlyEmployeeReport(fs.year, fs.month).rows.forEach(function(rr){ reportByEmp[rr.employeeId] = rr; });
      var allRows = computePayrollRows(run);
      /* Касса цехга бириктирилган бўлса — фақат ходимнинг «Категория»си шу
         цехга тўғри келадиганлар (Радиатор кассаси → Радиатор Цех ходимлари). */
      var rows = allRows;
      if(catFilterName){
        rows = allRows.filter(function(r){
          var emp = employeeById(r.employeeId);
          return emp && String(emp.category||"").trim().toLowerCase()===catFilterName.toLowerCase();
        });
      } else if(wsKey){
        rows = allRows.filter(function(r){
          var emp = employeeById(r.employeeId);
          return emp && dwKeyFromText(emp.category||"")===wsKey;
        });
      }
      entries = rows.map(function(r){ return {employeeId:r.employeeId, fullName:r.fullName, amount: defaultAmountFor(r, reportByEmp)}; });
      var noteEl = m && m.querySelector ? m.querySelector("#keb-catnote") : null;
      if(noteEl && catFilterName){
        noteEl.textContent = "Фақат «"+catFilterName+"» категориясидаги ходимлар кўрсатилди: "+rows.length+" та (давр бўйича жами "+allRows.length+" та ходим)";
        return;
      }
      if(noteEl) noteEl.textContent = wsKey ? ("Фақат «"+wsLabel+"» категориясидаги ходимлар кўрсатилди: "+rows.length+" та (давр бўйича жами "+allRows.length+" та ходимдан). Бошқа ходимни «Ходим қўшиш» орқали қўлда қўшиш мумкин.") : "";
    }

    var body = '<div class="field-row">'+
        '<div class="field"><label>Сана</label><input type="date" id="keb-date" value="'+esc(fs.date)+'"></div>'+
        '<div class="field"><label>Давр (қайси ойлик тўланмоқда)</label><div class="field-row" style="grid-template-columns:1fr 1fr;gap:8px;">'+
          '<input type="number" id="keb-year" value="'+esc(fs.year||curY)+'">'+
          '<select id="keb-month">'+MONTHS_FULL.map(function(mn,i){return '<option value="'+(i+1)+'"'+(fs.month===(i+1)?" selected":"")+'>'+mn+'</option>';}).join("")+'</select>'+
        '</div></div>'+
      '</div>'+
      '<div class="field-hint" style="margin:-6px 0 12px;">Эслатма: «Иш ҳақи ҳисоблаши»даги «Тўланган аванс (пул ўтказмаси)» устуни автомат тўлдирилиши учун санани шу давр ойи ичида қолдиринг.</div>'+
      '<div class="field"><label>Иш ҳақи ҳисоблаши</label><select id="keb-run"></select></div>'+
      '<div class="field-hint" id="keb-catnote" style="margin:-6px 0 12px;color:var(--accent);font-weight:600;"></div>'+
      (vedInit ? '<div style="display:flex;align-items:center;gap:8px;margin:-4px 0 12px;">'+
          '<button type="button" class="btn btn-secondary btn-sm" id="keb-ved-eye">'+ICONS.eye+'Ведомост қандай шаклланган</button>'+
          '<span class="field-hint" style="margin:0;">Ведомост суммасидан ортиқча тўлаб бўлмайди.</span>'+
        '</div>' : '')+
      '<div class="field"><label>Тўлов усули</label><div class="seg" id="keb-method" data-methodgroup="keb">'+
        '<button type="button" class="method-toggle active" data-keb-method="otkazma">Пул ўтказмаси</button>'+
        '<button type="button" class="method-toggle" data-keb-method="naqd">Нақд</button>'+
      '</div></div>'+
      '<div id="keb-rows"></div>'+
      '<div style="margin:4px 0 14px;"><button type="button" class="btn btn-secondary" id="keb-add-row">'+ICONS.plus+'Ходим қўшиш</button></div>'+
      (opts.bucket ? '<div class="field-hint" style="margin:-6px 0 12px;">«'+esc(finBucketName(opts.bucket))+'» харажат турида'+(opts.categoryName?(' («'+esc(opts.categoryName)+'»)'):'')+' ажратилган сумма: <b id="keb-alloc">0 сўм</b> — чиқим шу суммадан ошмайди.</div>' : '')+
      '<div class="field" style="margin-top:-6px;"><div class="field-hint">Жами: <span id="keb-total" style="font-weight:700;color:var(--ink);">0 сўм</span> · Кассада мавжуд: <span id="keb-avail" style="font-weight:700;">0 сўм</span></div></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="keb-note"></textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var goBack = typeof opts.onBack==="function" ? opts.onBack : null;
    var foot2 = goBack
      ? '<button class="btn btn-secondary" data-cancel>'+ICONS.arrowLeft+'Орқага</button><button class="btn btn-primary" data-save>Сақлаш</button>'
      : foot;
    var modalTitle = isEdit ? "Ходимлар бўйича тўлов — тахрирлаш"
      : (vedInit ? ("Ведомост №"+vedInit.no+" бўйича тўлов — "+vedInit.periodLabel+" · "+vedInit.kindName)
                 : "Ходимлар бўйича тўлов — Чиқим");
    var m = openModal(modalTitle+(acc?(" · "+esc(acc.name)):""), body, foot2, true, goBack || null);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(goBack) goBack(); });

    function syncEntriesFromInputs(){
      entries.forEach(function(en, idx){
        var sel = m.querySelector('[data-keb-emp="'+idx+'"]');
        if(sel) en.employeeId = sel.value;
        var am = m.querySelector('[data-keb-amount="'+idx+'"]');
        if(am) en.amount = Number(am.value)||0;
      });
    }
    function allocAvailNow(){
      if(!opts.bucket) return Infinity;
      var a = finBucketAvailFor(opts.categoryId||"", opts.bucket);
      if(isEdit && editRow && editRow.members){
        a += editRow.members.reduce(function(sm,mem){ return mem.cancelled ? sm : sm+(Number(mem.amount)||0); }, 0);
      }
      return a;
    }
    function recomputeTotal(){
      var total = entries.reduce(function(s,en){ return s+(Number(en.amount)||0); }, 0);
      var totalEl = m.querySelector("#keb-total"); if(totalEl) totalEl.textContent = fmtSum(total);
      var avail = cashMethodBalance(accountId, fs.method);
      var availEl = m.querySelector("#keb-avail");
      if(availEl){ availEl.textContent = fmtSum(avail)+" ("+paymentMethodLabel(fs.method)+")"; availEl.style.color = total>avail ? "var(--critical)" : ""; }
      var allocEl = m.querySelector("#keb-alloc");
      if(allocEl){
        var al = allocAvailNow();
        allocEl.textContent = fmtSum(al);
        allocEl.style.color = (total>al+0.004) ? "var(--critical)" : "var(--good)";
        if(totalEl) totalEl.style.color = (total>al+0.004) ? "var(--critical)" : "var(--ink)";
      }
    }
    function renderRows(){
      var rowsHtml = entries.length ? entries.map(function(en, idx){
        var usedIds = entries.map(function(x,xi){ return xi!==idx ? x.employeeId : null; }).filter(Boolean);
        var lockEmp = isEdit && en._origId;
        var empCell = lockEmp
          ? '<div class="field" style="margin-bottom:0;"><label>Ф.И.Ш.</label><input disabled value="'+esc(en.fullName||"")+'"></div>'
          : ('<div class="field" style="margin-bottom:0;"><label>Ф.И.Ш.</label><select data-keb-emp="'+idx+'"><option value="">— танланг —</option>'+
              STATE.employees.slice().sort(function(a,b){return (a.fullName||"").localeCompare(b.fullName||"");}).filter(function(x){return usedIds.indexOf(x.id)===-1;}).map(function(x){
                return '<option value="'+x.id+'"'+(en.employeeId===x.id?" selected":"")+'>'+esc(x.fullName)+(x.position?(" — "+esc(x.position)):"")+'</option>';
              }).join("")+
            '</select></div>');
        return '<div class="field-row" style="grid-template-columns:40px 1fr 160px 34px;align-items:end;gap:8px;margin-bottom:8px;">'+
          '<div class="field" style="margin-bottom:0;"><label>№</label><input disabled value="'+(idx+1)+'"></div>'+
          empCell+
          '<div class="field" style="margin-bottom:0;"><label>Сумма</label><input type="number" min="0" step="any" data-keb-amount="'+idx+'" value="'+esc(en.amount||0)+'"></div>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-keb-remove="'+idx+'" title="'+(lockEmp?"Ушбу ходимга тўловни бекор қилиш":"Ўчириш")+'" style="margin-bottom:2px;">'+ICONS.trash+'</button>'+
        '</div>';
      }).join("") : '<div class="field-hint" style="margin-bottom:10px;">Давр ва иш ҳақи ҳисоблашини танланг — ходимлар рўйхати автомат тўлдирилади (кейин ҳам қўлда тузатиш, қўшиш ёки ўчириш мумкин).</div>';
      m.querySelector("#keb-rows").innerHTML = rowsHtml;
      m.querySelectorAll('[data-keb-remove]').forEach(function(btn){
        btn.addEventListener("click", function(){
          syncEntriesFromInputs();
          entries.splice(Number(btn.getAttribute("data-keb-remove")), 1);
          renderRows(); recomputeTotal();
        });
      });
      m.querySelectorAll('[data-keb-emp],[data-keb-amount]').forEach(function(inp){
        inp.addEventListener("change", function(){ syncEntriesFromInputs(); recomputeTotal(); });
      });
    }
    function renderRunSelect(){
      var opts = payrollRunOptions();
      var sel = m.querySelector("#keb-run");
      if(!opts.length){
        sel.innerHTML = '<option value="">— бу давр учун иш ҳақи ҳисоблаши топилмади —</option>';
        fs.payrollRunId = "";
      } else {
        var stillValid = opts.some(function(r){return r.id===fs.payrollRunId;});
        if(!stillValid) fs.payrollRunId = opts[0].id;
        sel.innerHTML = opts.map(function(r){
          var t = payrollRunTotals(r);
          return '<option value="'+r.id+'"'+(fs.payrollRunId===r.id?" selected":"")+'>'+fmtDateShort(r.date||(r.createdAt||"").slice(0,10))+' · '+t.empCount+' та ходим</option>';
        }).join("");
      }
    }
    function reloadFromRun(){ populateFromRun(); renderRows(); recomputeTotal(); }

    m.querySelector("#keb-date").addEventListener("change", function(){ fs.date = m.querySelector("#keb-date").value; });
    m.querySelector("#keb-year").addEventListener("change", function(){ fs.year=Number(m.querySelector("#keb-year").value)||curY; renderRunSelect(); reloadFromRun(); });
    m.querySelector("#keb-month").addEventListener("change", function(){ fs.month=Number(m.querySelector("#keb-month").value)||1; renderRunSelect(); reloadFromRun(); });
    m.querySelector("#keb-run").addEventListener("change", function(){ fs.payrollRunId = m.querySelector("#keb-run").value; reloadFromRun(); });
    m.querySelectorAll('[data-keb-method]').forEach(function(btn){
      btn.addEventListener("click", function(){
        fs.method = btn.getAttribute("data-keb-method");
        m.querySelectorAll('[data-keb-method]').forEach(function(b2){ b2.classList.toggle("active", b2===btn); });
        reloadFromRun();
      });
    });
    m.querySelector("#keb-add-row").addEventListener("click", function(){
      syncEntriesFromInputs();
      entries.push({employeeId:"", amount:0});
      renderRows(); recomputeTotal();
    });

    if(isEdit){
      /* Тахрирлашда давр/иш ҳақи ҳисоблаши/усул ЎЗГАРТИРИЛМАЙДИ (бу тўлов
         қайси ҳисоб-китобга тегишли эканини сақлаб қолиш учун) — фақат
         сана, изоҳ ва ходимлар/суммалар рўйхати таҳрирланади. */
      var runEl = m.querySelector("#keb-run");
      var runObj = payrollRunById(fs.payrollRunId);
      runEl.innerHTML = '<option value="'+esc(fs.payrollRunId)+'">'+(runObj?fmtDateShort(runObj.date||(runObj.createdAt||"").slice(0,10)):"—")+'</option>';
      runEl.disabled = true;
      m.querySelector("#keb-year").disabled = true;
      m.querySelector("#keb-month").disabled = true;
      m.querySelectorAll('[data-keb-method]').forEach(function(b2){
        b2.classList.toggle("active", b2.getAttribute("data-keb-method")===fs.method);
        b2.disabled = true;
      });
      renderRows();
      recomputeTotal();
    } else if(vedInit){
      /* Ведомост режими: давр, иш ҳақи ҳисоблаши ва тўлов усули
         ведомостдан олинади ва ўзгартирилмайди. */
      var runEl2 = m.querySelector("#keb-run");
      var runObj2 = payrollRunById(fs.payrollRunId);
      runEl2.innerHTML = '<option value="'+esc(fs.payrollRunId)+'">Ведомост №'+vedInit.no+' · '+
        esc(fmtDateShort(runObj2?(runObj2.date||(runObj2.createdAt||"").slice(0,10)):vedInit.date))+' · '+esc(vedInit.kindName)+'</option>';
      runEl2.disabled = true;
      m.querySelector("#keb-year").disabled = true;
      m.querySelector("#keb-month").disabled = true;
      m.querySelectorAll('[data-keb-method]').forEach(function(b2){
        b2.classList.toggle("active", b2.getAttribute("data-keb-method")===fs.method);
        b2.disabled = true;
      });
      var eyeBtn = m.querySelector("#keb-ved-eye");
      if(eyeBtn) eyeBtn.addEventListener("click", function(){
        var vNow = currentVedomost(); if(!vNow) return;
        var reopen = function(){ openKassaEmployeeBatchPayForm(accountId, null, opts); };
        closeModal();
        openVedomostSourceModal(vNow, reopen);
      });
      reloadFromRun();
    } else {
      renderRunSelect();
      reloadFromRun();
    }

    m.querySelector("[data-save]").addEventListener("click", function(){
      syncEntriesFromInputs();
      if(!fs.payrollRunId){ toast("Иш ҳақи ҳисоблашини танланг"); return; }
      var cleanEntries = entries.filter(function(en){ return en.employeeId && Number(en.amount)>0; }).map(function(en){
        var emp = employeeById(en.employeeId);
        return {employeeId:en.employeeId, fullName: emp?emp.fullName:en.fullName, amount: Number(en.amount)||0, _origId: en._origId};
      });
      if(!cleanEntries.length){ toast("Камида битта ходим ва суммани киритинг"); return; }
      var total = cleanEntries.reduce(function(s,en){return s+en.amount;},0);
      var avail = cashMethodBalance(accountId, fs.method);
      if(isEdit){
        /* Аввалги (ҳали бекор қилинмаган) ёзувларнинг ШУ усул бўйича
           суммаси, гўёки улар ҳали киритилмагандек, қолдиққа қайтариб
           қўшилади — акс ҳолда тахрирлашда ўша ёзувларнинг ЎЗИ "тўсиқ"
           бўлиб қолади. */
        avail += editRow.members.reduce(function(s,mem){
          if(mem.cancelled) return s;
          var mm = (mem.methods||[]).find(function(x){return x.method===fs.method;});
          return s + (mm ? (Number(mm.amount)||0) : 0);
        }, 0);
      }
      if(total>avail){ toast("Кассада пул етарли эмас — "+paymentMethodLabel(fs.method)+" бўйича қолдиқ: "+fmtSum(avail)); return; }
      /* Фойдаланувчи сўровига кўра (2026-10-15): кассада пул бўлса ҳам,
         шу КАТЕГОРИЯнинг «Иш ҳақи» харажат турига ажратилган суммадан
         ортиғини чиқим қилиб бўлмайди — қолган пул бошқа харажат
         турларига тегишли. */
      /* Фойдаланувчи сўровига кўра (2026-10-16): ведомостдан ортиқча
         тўлаб бўлмайди — жами сумма ведомостнинг қолган қисмидан ошмайди,
         ҳар бир ходим бўйича ҳам ўз қолдиғидан ошмайди. */
      var vedNow = currentVedomost();
      if(vedNow){
        if(total > vedNow.left+0.004){
          toast("Ведомост №"+vedNow.no+" бўйича қолган сумма "+fmtSum(vedNow.left)+" — ундан ортиқча тўлаб бўлмайди (киритилди: "+fmtSum(total)+")");
          return;
        }
        var leftByEmp = {};
        vedNow.lines.forEach(function(l){ leftByEmp[l.employeeId] = l.left; });
        var bad = null;
        cleanEntries.forEach(function(en){
          if(bad) return;
          var lim = Number(leftByEmp[en.employeeId]);
          if(!(lim>0)) { bad = {name:en.fullName, lim:0}; return; }
          if(en.amount > lim+0.004) bad = {name:en.fullName, lim:lim};
        });
        if(bad){
          toast(bad.lim>0
            ? ("«"+bad.name+"» бўйича ведомостда қолган сумма "+fmtSum(bad.lim)+" — ундан ортиқча тўлаб бўлмайди")
            : ("«"+bad.name+"» бу ведомостда йўқ ёки аллақачон тўлиқ тўланган"));
          return;
        }
      }
      var allocLimit = allocAvailNow();
      if(total > allocLimit+0.004){
        toast("«"+finBucketName(opts.bucket||"wage")+"»"+(opts.categoryName?(" («"+opts.categoryName+"»)"):"")+" харажат турида ажратилган сумма етарли эмас. Мавжуд: "+fmtSum(allocLimit)+", талаб: "+fmtSum(total));
        return;
      }
      var dateVal = m.querySelector("#keb-date").value || todayISO();
      var noteVal = m.querySelector("#keb-note").value.trim();
      var periodLabel = (MONTHS_FULL[(fs.month||1)-1]||"")+" "+fs.year+" йил";

      if(isEdit){
        var keptOrigIds = {};
        cleanEntries.forEach(function(en){
          if(en._origId){
            keptOrigIds[en._origId] = true;
            dbUpdate("cashTransactions", en._origId, {
              amount: en.amount,
              methods: [{method: fs.method, amount: en.amount, usdAmount:0, usdRate:0}],
              date: dateVal,
              description: "Иш ҳақи тўлови — "+periodLabel+(noteVal?(" · "+noteVal):"")
            }, STATE.cashTransactions);
          } else {
            var newData = {
              cashAccountId: accountId, direction:"chiqim", amount: en.amount,
              methods: [{method: fs.method, amount: en.amount, usdAmount:0, usdRate:0}],
              counterpartyName: en.fullName, counterpartyType:"employee", counterpartyId: en.employeeId,
              category: "ish_haqi",
              description: "Иш ҳақи тўлови — "+periodLabel+(noteVal?(" · "+noteVal):""),
              date: dateVal, manual:true, vatRate:0, vatSum:0, cancelled:false,
              payrollRunId: fs.payrollRunId, payrollYear: fs.year, payrollMonth: fs.month,
              batchGroupId: editRow.batchGroupId, batchEmployeeCount: cleanEntries.length, batchPeriodLabel: periodLabel
            };
            recordCashTx(accountId, "chiqim", en.amount, "ish_haqi", newData);
          }
        });
        /* Рўйхатдан олиб ташланган (ёки суммаси 0 қилинган) аввалги
           аъзолар ҲЕЧ ҚАЧОН ЎЧИРИЛМАЙДИ — фақат бекор қилинади. */
        editRow.members.forEach(function(mem){
          if(!keptOrigIds[mem.id] && !mem.cancelled){
            dbUpdate("cashTransactions", mem.id, {cancelled:true}, STATE.cashTransactions);
          }
        });
        toast("Тўлов тахрирланди — "+cleanEntries.length+" та ходим");
        closeModal();
        return;
      }

      /* Ҳар бир ходимга АЛОҲИДА cashTransactions ёзуви (ички ҳисоб-китоблар
         — иш ҳақи ҳисоблаш, ҳисобот ва бошқалар — учун ҳар доим шундай
         қолиши шарт), лекин уларнинг ҳаммаси БИР ХИЛ batchGroupId билан
         белгиланади — бу фақат Кассадаги операциялар РЎЙХАТИНИ (қуйида
         renderKassaLedgerTab'да) битта умумий сатр сифатида кўрсатиш учун
         ишлатилади, маълумотнинг ўзи (ходимлар бўйича алоҳида ёзувлар)
         ҳеч қачон ўчирилмайди ёки бирлаштирилмайди. */
      var batchGroupId = uid();
      cleanEntries.forEach(function(en){
        var data = {
          cashAccountId: accountId, direction:"chiqim", amount: en.amount,
          methods: [{method: fs.method, amount: en.amount, usdAmount:0, usdRate:0}],
          counterpartyName: en.fullName, counterpartyType:"employee", counterpartyId: en.employeeId,
          category: "ish_haqi",
          description: "Иш ҳақи тўлови — "+periodLabel+(noteVal?(" · "+noteVal):""),
          date: dateVal, manual:true, vatRate:0, vatSum:0, cancelled:false,
          payrollRunId: fs.payrollRunId, payrollYear: fs.year, payrollMonth: fs.month,
          batchGroupId: batchGroupId, batchEmployeeCount: cleanEntries.length, batchPeriodLabel: periodLabel,
          payType: "ish_haqi", bucket: opts.bucket || "wage", categoryId: opts.categoryId || "",
          docNumber: kassaNextDocNumber("chiqim"), cashier: kassaCashierName()
        };
        recordCashTx(accountId, "chiqim", en.amount, "ish_haqi", data);
      });
      toast("Тўловлар сақланди — "+cleanEntries.length+" та ходим");
      closeModal();
    });
  }

