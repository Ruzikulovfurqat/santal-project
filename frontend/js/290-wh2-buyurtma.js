  /* ====== Омбор буюртмаси — 3 босқичли тасдиқлаш (2026-10-19 сўрови) ======
     1-режа: Омбор ходими буюртма киритади — ҳар бир маҳсулот ёнида
             «Буюртмачи» (ишлаб турган ходим) кўрсатилади.
     2-режа: Кассадаги бухгалтер «Омбордан келган буюртма» бўлимида кўриб,
             пули етса тасдиқлайди.
     3-режа: Раҳбар Бошқарув панелидаги «Заявка» ойнасида керакли
             маҳсулотларни белгилаб, кераксизини олиб ташлаб тасдиқлайди.
     Шундан сўнг омбор ходими рўйхатни қоғозга чиқариб беради.
     Эски ёзувларда requestStatus бўлмайди — улар "new" деб қаралади,
     маълумотнинг ўзи ўзгартирилмайди. */
  /* 2026-10-19 сўрови: бухгалтер ва раҳбар тасдиқлари ЎЗАРО БОҒЛИҚ ЭМАС.
     Кассада пул бўлмаса бухгалтер тасдиқламай туриши мумкин — шунда ҳам
     заявка раҳбарга кўриниб туради ва раҳбар ўз тасдиғини қўя олади.
     Ҳолат иккала тасдиқ изидан ҲИСОБЛАНАДИ (requestStatus майдони эса
     мослик учун сақланади, фақат «Қайтарилди» ҳолати ундан олинади). */
  var WH2_REQ_FLOW = [
    ["new","Тасдиқ кутилмоқда (бухгалтер ва раҳбар)","chip-warning"],
    ["acc","Раҳбар тасдиғини кутмоқда","chip-accent"],
    ["dir_wait_acc","Раҳбар тасдиқлади — бухгалтер кутилмоқда","chip-accent"],
    ["dir","Тасдиқланди","chip-good"],
    /* Кирим қилингандан сўнг (2026-10-19 сўрови). */
    ["partial","Қисман етказилди","chip-warning"],
    ["done","Бажарилди","chip-good"],
    ["rejected","Қайтарилди","chip-critical"]
  ];
  /* Буюртма қатори бўйича ФАКТ келган миқдор — Омборлар → Кирим
     бўлимида шу буюртмага боғлаб кирим қилинганда тўпланади. */
  function wh2LineDelivered(ln){ return Number(ln && ln.deliveredQty)||0; }
  function wh2LineFull(ln){ return wh2LineDelivered(ln) >= (Number(ln && ln.qty)||0) - 0.0000001; }
  function wh2DeliveryState(o){
    var lines = wh2ApprovedLines(o);
    if(!lines.length) return "none";
    var any = false, all = true;
    lines.forEach(function(ln){
      if(wh2LineDelivered(ln)>0.0000001) any = true;
      if(!wh2LineFull(ln)) all = false;
    });
    return all ? "done" : (any ? "partial" : "none");
  }
  function wh2AccOk(o){ return !!(o && o.accApprovedAt); }
  function wh2DirOk(o){ return !!(o && o.dirApprovedAt); }
  function wh2ReqStatus(o){
    if(!o) return "new";
    if(String(o.requestStatus||"")==="rejected") return "rejected";
    var a = wh2AccOk(o), d = wh2DirOk(o);
    if(a && d){
      var ds = wh2DeliveryState(o);
      return ds==="done" ? "done" : (ds==="partial" ? "partial" : "dir");
    }
    if(a) return "acc";
    if(d) return "dir_wait_acc";
    /* Эски ёзувларда изи йўқ, лекин requestStatus сақланган бўлиши мумкин. */
    var st = String(o.requestStatus||"");
    if(st==="acc" || st==="dir") return st;
    return "new";
  }
  function wh2ReqFlowOf(o){
    var st = wh2ReqStatus(o);
    return WH2_REQ_FLOW.find(function(x){ return x[0]===st; }) || WH2_REQ_FLOW[0];
  }
  function wh2ReqChip(o){ var f=wh2ReqFlowOf(o); return '<span class="chip '+f[2]+'">'+esc(f[1])+'</span>'; }
  function wh2ReqLabel(o){ return wh2ReqFlowOf(o)[1]; }
  /* Раҳбар тасдиқлагандан сўнг — фақат белгилаб қолдирилган қаторлар
     (approved===false бўлганлари раҳбар томонидан олиб ташланган).
     Бухгалтер тасдиғи бу танловга таъсир қилмайди. */
  function wh2ApprovedLines(o){
    var lines = (o && o.lines) || [];
    if(!wh2DirOk(o) && wh2ReqStatus(o)!=="dir") return lines;
    return lines.filter(function(ln){ return ln.approved!==false; });
  }
  function wh2LineRequesterName(o, ln){ return (ln && ln.requesterName) || (o && o.customerName) || "—"; }
  /* Ишдан бўшатилмаган (ишлаб турган) ходимлар. */
  function wh2ActiveEmployees(){
    var fired = {};
    (STATE.employeeOps||[]).forEach(function(op){ if(op.type==="fire" && !op.cancelled && op.employeeId) fired[op.employeeId]=true; });
    return STATE.employees.filter(function(e){ return !fired[e.id]; });
  }
  /* Ходим танлаш ойнаси — тепасида қидирув майдони. */
  function openEmployeePickerModal(title, onPicked, onClose){
    var pool = wh2ActiveEmployees().slice().sort(function(a,b){ return (a.fullName||"").localeCompare(b.fullName||""); });
    var body = personSelectSearchBoxHtml("epk-search")+'<div id="epk-list" style="max-height:400px;overflow-y:auto;margin-top:8px;"></div>';
    var m = openModal(title||"Ходимни танлаш", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true, onClose);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#epk-list");
    if(!pool.length){
      listEl.innerHTML = emptyState("Ходим йўқ","Аввал «Ходимлар» бўлимида ходим яратинг.");
    } else {
      listEl.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Ф.И.Ш.</th><th>Лавозими</th><th>Категория</th></tr></thead><tbody>'+
        pool.map(function(e){
          return '<tr class="epk-row" data-id="'+esc(e.id)+'" style="cursor:pointer;">'+
            '<td class="cell-strong">'+esc(e.fullName||"—")+'</td>'+
            '<td class="cell-muted">'+esc(e.position||"—")+'</td>'+
            '<td class="cell-muted">'+esc(e.category||"—")+'</td></tr>';
        }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".epk-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var e = STATE.employees.find(function(x){ return x.id===rowEl.getAttribute("data-id"); });
          closeModal();
          onPicked(e||null);
        });
      });
    }
    m.querySelector("#epk-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      listEl.querySelectorAll(".epk-row").forEach(function(r){ r.style.display = (!q || (r.textContent||"").toLowerCase().indexOf(q)>-1) ? "" : "none"; });
    });
  }
  /* Омбордаги маҳсулотни танлаш — қидирув + қолдиқ кўрсатилган ҳолда. */
  function openWh2ItemPickerModal(onPicked, onClose){
    var pool = STATE.items.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var body = personSelectSearchBoxHtml("wip-search")+'<div id="wip-list" style="max-height:400px;overflow-y:auto;margin-top:8px;"></div>';
    var m = openModal("Маҳсулотни танлаш", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true, onClose);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#wip-list");
    if(!pool.length){
      listEl.innerHTML = emptyState("Маҳсулот йўқ","Маҳсулот номи катаги ёнидаги «+» тугмаси орқали янги маҳсулот қўшинг.");
    } else {
      listEl.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Маҳсулот</th><th>Тури</th><th>Бирлик</th><th class="num">Омбордаги қолдиқ</th></tr></thead><tbody>'+
        pool.map(function(it){
          return '<tr class="wip-row" data-id="'+esc(it.id)+'" style="cursor:pointer;">'+
            '<td class="cell-strong">'+esc(it.name)+'</td>'+
            '<td>'+itemTypeChip(it.itemType)+'</td>'+
            '<td class="cell-muted">'+esc(it.unit||"—")+'</td>'+
            '<td class="num">'+fmtNum(totalStockQty(it.id))+'</td></tr>';
        }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".wip-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var it = itemById(rowEl.getAttribute("data-id"));
          closeModal();
          onPicked(it||null);
        });
      });
    }
    m.querySelector("#wip-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      listEl.querySelectorAll(".wip-row").forEach(function(r){ r.style.display = (!q || (r.textContent||"").toLowerCase().indexOf(q)>-1) ? "" : "none"; });
    });
  }
  function wh2PendingAccCount(){ return STATE.wh2Orders.filter(function(o){ return !o.cancelled && wh2ReqStatus(o)!=="rejected" && !wh2AccOk(o); }).length; }
  function wh2PendingDirCount(){ return STATE.wh2Orders.filter(function(o){ return !o.cancelled && wh2ReqStatus(o)!=="rejected" && !wh2DirOk(o); }).length; }
  /* Кирим қилиш учун очиқ буюртмалар — иккала тасдиқ бор, лекин ҳали
     тўлиқ етказиб берилмаган (2026-10-19 сўрови). Қисман етказилгани
     ҳам рўйхатда қолади, шунда қолган маҳсулотлар кейин олиб
     келинганда ўша буюртмани ҚАЙТА танлаш мумкин. */
  function wh2OpenForReceipt(){
    return STATE.wh2Orders.filter(function(o){
      if(o.cancelled) return false;
      var st = wh2ReqStatus(o);
      return st==="dir" || st==="partial";
    }).sort(function(a,b){ return String(b.date||"").localeCompare(String(a.date||"")); });
  }
  /* Буюртманинг ҳали тўлиқ келмаган қаторлари. */
  function wh2RemainingLines(o){
    return wh2ApprovedLines(o).map(function(ln, idx){
      return {ln:ln, idx:(o.lines||[]).indexOf(ln), remain: Math.max(0,(Number(ln.qty)||0)-wh2LineDelivered(ln))};
    }).filter(function(x){ return x.remain > 0.0000001; });
  }
  function wh2SortedOrders(){
    return STATE.wh2Orders.slice().sort(function(a,b){
      return String(b.date||"").localeCompare(String(a.date||"")) || String(b.createdAt||"").localeCompare(String(a.createdAt||""));
    });
  }
  function wh2ActorName(){ var u=currentUser(); return u ? (u.name||u.login||"—") : "—"; }
  /* Омбор буюртмасининг жараёни — «Харидор буюртмаси»даги каби босқичлар
     чизиғи (2026-10-19 сўрови): Буюртма яратилди → Бухгалтер тасдиқлади →
     Раҳбар тасдиқлади → Барча тасдиқлади. Бухгалтер (ёки раҳбар) бекор
     қилса — ўша босқич қизил бўлади, кейингилари очилмайди ва жараён ўша
     ерда якунланади. */
  function wh2RejectedBy(o){
    if(!o || String(o.requestStatus||"")!=="rejected") return "";
    /* Кимдан қайтгани: бухгалтер ҳали тасдиқламаган бўлса — бухгалтердан. */
    return wh2AccOk(o) ? "dir" : "acc";
  }
  function wh2StepperHtml(o){
    var rj = wh2RejectedBy(o);
    var steps = [
      {name:"Буюртма яратилди", done:true, who:(o.createdAt?fmtDateShort((o.createdAt||"").slice(0,10)):"")},
      {name:"Бухгалтер тасдиқлади", done:wh2AccOk(o), rejected:(rj==="acc"),
       who:(wh2AccOk(o)?((o.accApprovedBy||"—")+" · "+fmtDateShort((o.accApprovedAt||"").slice(0,10))):"")},
      {name:"Раҳбар тасдиқлади", done:wh2DirOk(o), rejected:(rj==="dir"),
       who:(wh2DirOk(o)?((o.dirApprovedBy||"—")+" · "+fmtDateShort((o.dirApprovedAt||"").slice(0,10))):"")},
      {name:(rj?"Жараён тўхтатилди":"Барча тасдиқлади"), done:(!rj && wh2AccOk(o) && wh2DirOk(o)), rejected:!!rj, who:""}
    ];
    if(!rj){
      /* 2026-10-19 сўрови: кирим қилингач «Бажарилди» босқичи ҳам
         яшил галочка бўлади. */
      var ds = wh2DeliveryState(o);
      steps.push({name:"Бажарилди", done:(ds==="done"), rejected:false,
        who:(ds==="done" ? (o.deliveredBy?((o.deliveredBy||"")+" · "+fmtDateShort((o.deliveredAt||"").slice(0,10))):"") : (ds==="partial"?"қисман":""))});
    }
    var firstPending = -1;
    for(var i=0;i<steps.length;i++){ if(!steps[i].done && !steps[i].rejected){ firstPending=i; break; } }
    var html = steps.map(function(st,i){
      var cls = st.rejected ? "rejected" : (st.done ? "done" : (i===firstPending && !rj ? "current" : ""));
      var dot = st.rejected ? "✕" : (st.done ? ICONS.check : (i+1));
      return '<div class="step '+cls+'"><div class="step-line"></div><div class="step-dot">'+dot+'</div>'+
        '<div class="step-label">'+esc(st.name)+(st.who?('<div style="font-weight:600;color:var(--ink-3);margin-top:2px;">'+esc(st.who)+'</div>'):'')+'</div></div>';
    }).join("");
    var banner = "";
    if(rj){
      banner = '<div class="banner" style="margin-bottom:12px;border-color:var(--critical);">'+ICONS.alert+
        '<div class="banner-body"><div class="banner-title">'+(rj==="acc"?"Бухгалтер бекор қилди":"Раҳбар бекор қилди")+
        (o.rejectedBy?(' — '+esc(o.rejectedBy)):'')+(o.rejectedAt?(' · '+esc(fmtDateShort((o.rejectedAt||"").slice(0,10)))):'')+'</div>'+
        'Сабаби: '+esc(o.rejectReason||"сабаб кўрсатилмаган")+'. Жараён шу ерда якунланди — буюртмани таҳрирлаб, қайта тасдиқлашга юбориш мумкин.</div></div>';
    }
    return '<div class="stepper">'+html+'</div>'+banner;
  }
  function wh2StampsHtml(o){
    var parts = [];
    if(o.accApprovedAt) parts.push('Бухгалтер: '+esc(o.accApprovedBy||"—")+' · '+esc(fmtDateShort((o.accApprovedAt||"").slice(0,10))));
    if(o.dirApprovedAt) parts.push('Раҳбар: '+esc(o.dirApprovedBy||"—")+' · '+esc(fmtDateShort((o.dirApprovedAt||"").slice(0,10))));
    if(o.rejectedAt) parts.push('Қайтарди: '+esc(o.rejectedBy||"—")+(o.rejectReason?(' — '+esc(o.rejectReason)):""));
    return parts.length ? '<div class="field-hint" style="margin-top:6px;">'+parts.join(' &nbsp;·&nbsp; ')+'</div>' : '';
  }
  /* --- 2-режа: Бухгалтер (Касса) кўриб тасдиқлайдиган ойна --- */
  function openWh2AccountantModal(o){
    if(!o) return;
    var st = wh2ReqStatus(o);
    /* Бекор қилинган бўлса — жараён якунланган, қайта тасдиқлаб
       бўлмайди; омбор ходими буюртмани таҳрирлаб қайта юборади. */
    var accEditable = !wh2AccOk(o) && !o.cancelled && st!=="rejected";
    var rows = (o.lines||[]).map(function(ln,i){
      return '<tr><td class="cell-muted">'+(i+1)+'</td><td class="cell-strong">'+esc(ln.itemName)+'</td>'+
        '<td>'+esc(wh2LineRequesterName(o, ln))+'</td>'+
        '<td class="num">'+fmtNum(ln.qty)+'</td><td class="cell-muted">'+esc(ln.unit||"—")+'</td>'+
        '<td class="num cell-muted">'+fmtNum(totalStockQty(ln.itemId))+'</td></tr>';
    }).join("");
    var body = wh2StepperHtml(o)+
      '<div class="detail-grid">'+
        '<div><div class="dl">Буюртма рақами</div><div class="dd">'+esc(o.orderNumber)+'</div></div>'+
        '<div><div class="dl">Сана</div><div class="dd">'+fmtDateShort(o.date)+'</div></div>'+
        '<div><div class="dl">Етказиб берувчи</div><div class="dd">'+esc(o.supplierName||"—")+'</div></div>'+
        '<div><div class="dl">Ҳолат</div><div class="dd">'+wh2ReqChip(o)+'</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin:12px 0;"><table><thead><tr><th>№</th><th>Маҳсулот</th><th>Буюртмачи</th><th>Миқдори</th><th>Бирлик</th><th class="num">Омборда бор</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      (o.note ? '<div class="field-hint" style="margin-bottom:8px;">Изоҳ: '+esc(o.note)+'</div>' : '')+
      (wh2DirOk(o) ? '<div class="field-hint" style="margin-bottom:8px;">Раҳбар бу заявкани аллақачон тасдиқлаган — белгиланган маҳсулотлар юқорида.</div>' : '')+
      (accEditable ? '<div class="field"><label>Бухгалтер изоҳи <span class="opt">(ихтиёрий)</span></label><textarea id="wh2acc-note">'+esc(o.accNote||"")+'</textarea></div>' : '');
    var foot = accEditable
      ? '<button class="btn btn-secondary" data-close>Ёпиш</button><span style="flex:1"></span><button class="btn btn-secondary" data-reject>'+ICONS.ban+'Қайтариш</button><button class="btn btn-primary" data-ok>Тасдиқлаш</button>'
      : '<button class="btn btn-secondary" data-close>Ёпиш</button>';
    var m = openModal("Омбордан келган буюртма — "+esc(o.orderNumber), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    var okBtn = m.querySelector("[data-ok]");
    if(okBtn) okBtn.addEventListener("click", function(){
      var nt = m.querySelector("#wh2acc-note");
      dbUpdate("wh2Orders", o.id, {
        requestStatus: wh2DirOk(o) ? "dir" : "acc",
        accApprovedAt:new Date().toISOString(), accApprovedBy:wh2ActorName(),
        accNote:(nt?nt.value.trim():""), rejectedAt:"", rejectedBy:"", rejectReason:""
      }, STATE.wh2Orders);
      toast(wh2DirOk(o) ? "Тасдиқланди — раҳбар тасдиғи ҳам бор, рўйхат тайёр" : "Тасдиқланди — раҳбар тасдиғига юборилди");
      closeModal();
      render();
    });
    var rjBtn = m.querySelector("[data-reject]");
    if(rjBtn) rjBtn.addEventListener("click", function(){
      var nt = m.querySelector("#wh2acc-note");
      var reason = nt ? nt.value.trim() : "";
      /* Сабаб мажбурий — раҳбар ва омбор ходими нима учун бекор
         қилинганини кўриб туриши керак (2026-10-19 сўрови). */
      if(!reason){ toast("Бекор қилиш сабабини ёзинг (масалан: кассада пул йўқ)"); if(nt) nt.focus(); return; }
      dbUpdate("wh2Orders", o.id, {
        requestStatus:"rejected", rejectedAt:new Date().toISOString(), rejectedBy:wh2ActorName(), rejectReason:reason, accNote:reason
      }, STATE.wh2Orders);
      toast("Буюртма бекор қилинди — сабаби кўрсатилди");
      closeModal();
      render();
    });
  }
  /* --- 3-режа: Раҳбар (Бошқарув панели → Заявка) тасдиқлайдиган ойна --- */
  function openWh2DirectorModal(o, onBack){
    if(!o) return;
    var st = wh2ReqStatus(o);
    var working = (o.lines||[]).map(function(ln){ return Object.assign({}, ln, {approved: ln.approved!==false}); });
    /* Раҳбар бухгалтер тасдиғини кутмасдан ҳам тасдиқлай олади
       (2026-10-19 сўрови). */
    var editable = !wh2DirOk(o) && !o.cancelled && st!=="rejected";
    var rows = working.map(function(ln,i){
      return '<tr'+(ln.approved?'':' style="opacity:.45;"')+'>'+
        '<td style="text-align:center;"><input type="checkbox" data-zl="'+i+'"'+(ln.approved?" checked":"")+(editable?"":" disabled")+' style="width:18px;height:18px;cursor:pointer;"></td>'+
        '<td class="cell-muted">'+(i+1)+'</td>'+
        '<td class="cell-strong">'+esc(ln.itemName)+'</td>'+
        '<td>'+esc(wh2LineRequesterName(o, ln))+'</td>'+
        '<td class="num">'+fmtNum(ln.qty)+'</td>'+
        '<td class="cell-muted">'+esc(ln.unit||"—")+'</td>'+
        '<td class="num cell-muted">'+fmtNum(totalStockQty(ln.itemId))+'</td></tr>';
    }).join("");
    var body = wh2StepperHtml(o)+
      '<div class="detail-grid">'+
        '<div><div class="dl">Буюртма рақами</div><div class="dd">'+esc(o.orderNumber)+'</div></div>'+
        '<div><div class="dl">Сана</div><div class="dd">'+fmtDateShort(o.date)+'</div></div>'+
        '<div><div class="dl">Етказиб берувчи</div><div class="dd">'+esc(o.supplierName||"—")+'</div></div>'+
        '<div><div class="dl">Ҳолат</div><div class="dd">'+wh2ReqChip(o)+'</div></div>'+
      '</div>'+
      (editable ? '<div class="field-hint" style="margin:8px 0;">Керакли маҳсулотларни белгилаб қолдиринг — белгиси олинганлари буюртмадан чиқарилади.</div>' : '')+
      ((!wh2AccOk(o) && st!=="rejected") ? '<div class="banner" style="margin:8px 0;">'+ICONS.alert+'<div class="banner-body"><div class="banner-title">Бухгалтер ҳали тасдиқламаган</div>Кассада пул етмаслиги мумкин. Сиз барибир тасдиқлашингиз мумкин — рўйхат бухгалтер тасдиғидан сўнг тўлиқ тайёр бўлади.</div></div>' : '')+
      '<div class="table-wrap" style="margin:10px 0;"><table><thead><tr><th style="width:36px;"></th><th>№</th><th>Маҳсулот</th><th>Буюртмачи</th><th>Миқдори</th><th>Бирлик</th><th class="num">Омборда бор</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      (o.note ? '<div class="field-hint" style="margin-bottom:8px;">Омбор изоҳи: '+esc(o.note)+'</div>' : '')+
      (o.accNote ? '<div class="field-hint" style="margin-bottom:8px;">Бухгалтер изоҳи: '+esc(o.accNote)+'</div>' : '')+
      (editable ? '<div class="field"><label>Раҳбар изоҳи <span class="opt">(ихтиёрий)</span></label><textarea id="wh2dir-note">'+esc(o.dirNote||"")+'</textarea></div>' : '');
    var foot = editable
      ? '<button class="btn btn-secondary" data-close>Ёпиш</button><span style="flex:1"></span><button class="btn btn-secondary" data-reject>'+ICONS.ban+'Қайтариш</button><button class="btn btn-primary" data-ok>Тасдиқлаш</button>'
      : '<button class="btn btn-secondary" data-close>Ёпиш</button>';
    var m = openModal("Заявка — "+esc(o.orderNumber), body, foot, true, onBack);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onBack) onBack(); });
    m.querySelectorAll("[data-zl]").forEach(function(cb){
      cb.addEventListener("change", function(){
        var idx = Number(cb.getAttribute("data-zl"));
        if(working[idx]) working[idx].approved = cb.checked;
        var tr = cb.closest("tr");
        if(tr) tr.style.opacity = cb.checked ? "" : ".45";
      });
    });
    var okBtn = m.querySelector("[data-ok]");
    if(okBtn) okBtn.addEventListener("click", function(){
      var kept = working.filter(function(ln){ return ln.approved; });
      if(!kept.length){ toast("Камида битта маҳсулотни белгилаб қолдиринг"); return; }
      var nt = m.querySelector("#wh2dir-note");
      var newLines = (o.lines||[]).map(function(ln,i){ return Object.assign({}, ln, {approved: working[i] ? !!working[i].approved : true}); });
      dbUpdate("wh2Orders", o.id, {
        lines:newLines, requestStatus: wh2AccOk(o) ? "dir" : "dir_wait_acc",
        dirApprovedAt:new Date().toISOString(), dirApprovedBy:wh2ActorName(),
        dirNote:(nt?nt.value.trim():""), rejectedAt:"", rejectedBy:"", rejectReason:""
      }, STATE.wh2Orders);
      toast(wh2AccOk(o) ? "Тасдиқланди — омбор ходими рўйхатни чоп этиши мумкин" : "Тасдиқланди — энди бухгалтер тасдиғи кутилмоқда");
      closeModal();
      if(onBack) onBack(); else render();
    });
    var rjBtn = m.querySelector("[data-reject]");
    if(rjBtn) rjBtn.addEventListener("click", function(){
      var nt = m.querySelector("#wh2dir-note");
      var reason = nt ? nt.value.trim() : "";
      if(!reason){ toast("Бекор қилиш сабабини ёзинг"); if(nt) nt.focus(); return; }
      dbUpdate("wh2Orders", o.id, {
        requestStatus:"rejected", rejectedAt:new Date().toISOString(), rejectedBy:wh2ActorName(), rejectReason:reason, dirNote:reason
      }, STATE.wh2Orders);
      toast("Заявка бекор қилинди — сабаби кўрсатилди");
      closeModal();
      if(onBack) onBack(); else render();
    });
  }
  /* --- 3-режа: Бошқарув панелидаги «Заявка» рўйхати --- */
  function openWh2ZayavkaModal(){
    /* 2026-10-19 сўрови: бухгалтер тасдиқламаган заявкалар ҳам раҳбарга
       кўриниб туради (кассада пул бўлмаса, бухгалтер тасдиқлашни
       кечиктириши мумкин — шунда ҳам раҳбар кўриб, тасдиқлай олсин).
       Тасдиқ кутаётганлари рўйхатнинг тепасида туради. */
    var pool = wh2SortedOrders().filter(function(o){ return !o.cancelled; });
    pool.sort(function(a,b){
      var pa = wh2DirOk(a)?1:0, pb = wh2DirOk(b)?1:0;
      if(pa!==pb) return pa-pb;
      return String(b.date||"").localeCompare(String(a.date||""));
    });
    var body;
    if(!pool.length){
      body = emptyState("Заявка йўқ","«Омборлар → Омбор буюртмаси» бўлимида буюртма яратилса, шу ерда кўринади.");
    } else {
      body = '<div class="table-wrap"><table><thead><tr><th>Буюртма рақами</th><th>Сана</th><th>Буюртмачилар</th><th>Таркиб</th><th>Бухгалтер</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+
        pool.map(function(o){
          var lines = (o.lines||[]);
          var names = [];
          lines.forEach(function(ln){ var nm=wh2LineRequesterName(o,ln); if(nm && names.indexOf(nm)===-1) names.push(nm); });
          var keptTxt = wh2DirOk(o) ? (wh2ApprovedLines(o).length+" / "+lines.length+" та тасдиқланди") : (lines.length+" та маҳсулот");
          var accChip = wh2AccOk(o)
            ? '<span class="chip chip-good">Тасдиқлади</span>'
            : '<span class="chip chip-warning">Кутилмоқда</span>';
          return '<tr'+(wh2DirOk(o)?'':' style="background:var(--surface-2);"')+'><td class="cell-strong">'+esc(o.orderNumber)+'</td>'+
            '<td class="cell-muted">'+fmtDateShort(o.date)+'</td>'+
            '<td>'+esc(names.join(", ")||"—")+'</td>'+
            '<td class="cell-muted">'+esc(keptTxt)+'</td>'+
            '<td>'+accChip+'</td>'+
            '<td>'+wh2ReqChip(o)+'</td>'+
            '<td><button class="btn btn-ghost btn-icon" data-zayavka-eye="'+o.id+'" title="Ичини кўриш">'+ICONS.eye+'</button></td></tr>';
        }).join("")+'</tbody></table></div>';
    }
    var m = openModal("Заявка — раҳбар тасдиғи", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelectorAll("[data-zayavka-eye]").forEach(function(b){
      b.addEventListener("click", function(){
        var o = wh2OrderById(b.getAttribute("data-zayavka-eye"));
        closeModal();
        openWh2DirectorModal(o, function(){ openWh2ZayavkaModal(); });
      });
    });
  }
  /* --- 2-режа: Кассадаги «Амаллар ҳисоботи» ўрнига кўрсатиладиган
     «Омбордан келган буюртма» рўйхати (бухгалтер учун). --- */
  function kassaWh2OrdersCardHtml(){
    var pool = wh2SortedOrders().filter(function(o){ return !o.cancelled; });
    var rows = pool.map(function(o,i){
      var lines = (o.lines||[]);
      var names = [];
      lines.forEach(function(ln){ var nm=wh2LineRequesterName(o,ln); if(nm && nm!=="—" && names.indexOf(nm)===-1) names.push(nm); });
      return '<tr>'+
        '<td class="cell-muted">'+(i+1)+'</td>'+
        '<td class="cell-strong">'+esc(o.orderNumber)+'</td>'+
        '<td class="cell-muted">'+fmtDateShort(o.date)+'</td>'+
        '<td>'+esc(names.join(", ")||o.customerName||"—")+'</td>'+
        '<td>'+esc(o.supplierName||"—")+'</td>'+
        '<td class="cell-muted">'+lines.length+' та маҳсулот</td>'+
        '<td>'+wh2ReqChip(o)+'</td>'+
        '<td><div class="row-actions"><button class="btn btn-ghost btn-icon" data-kwh2-eye="'+o.id+'" title="Ичини кўриш ва тасдиқлаш">'+ICONS.eye+'</button></div></td>'+
        '</tr>';
    }).join("");
    return '<div class="card" style="padding:16px 18px;">'+
      '<div class="section-head" style="align-items:center;"><h2 style="font-size:13.5px;">Амаллар ҳисоботи — Омбордан келган буюртма</h2>'+
        '<span class="field-hint">Кўзча орқали ичига кириб, маҳсулотларни кўриб тасдиқланг.</span></div>'+
      (pool.length
        ? '<div class="table-wrap"><table><thead><tr><th>№</th><th>Буюртма рақами</th><th>Сана</th><th>Буюртмачи (ходим)</th><th>Етказиб берувчи</th><th>Таркиб</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        : '<div class="field-hint">Омбордан келган буюртма йўқ.</div>')+
    '</div>';
  }
  function renderWh2Buyurtma(){
    var list = STATE.wh2Orders.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    setTopbar("Омборлар — Омбор буюртмаси", list.length+" та буюртма", '<button class="btn btn-primary" id="wh2AddOrderBtn">'+ICONS.plus+'Яратиш</button>');
    var root = document.getElementById("content");
    var html = whSubnav("buyurtma");
    if(!list.length){
      html += emptyState("Ҳали буюртма йўқ","«Яратиш» тугмаси орқали биринчи буюртмани киритинг.");
    } else {
      var rows = list.map(function(o){
        var st = o.cancelled ? '<span class="chip chip-critical">Бекор қилинди</span>' : '<span class="chip chip-good">Фаол</span>';
        var actions = '<div class="row-actions">'+
          '<button class="btn btn-ghost btn-icon" data-wh2-view="'+o.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2-edit="'+o.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2-copy="'+o.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2-print="'+o.id+'" title="Қоғозга чиқариш">'+ICONS.printer+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2-excel="'+o.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
          (o.cancelled
            ? '<button class="btn btn-ghost btn-icon" data-wh2-restore="'+o.id+'" title="Тиклаш">'+ICONS.restore+'</button>'
            : '<button class="btn btn-ghost btn-icon" data-wh2-cancel="'+o.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
          '</div>';
        var allLines = (o.lines||[]);
        var tarkibTxt = wh2ReqStatus(o)==="dir"
          ? (wh2ApprovedLines(o).length+' / '+allLines.length+' та тасдиқланди')
          : (allLines.length+' та маҳсулот');
        var names = [];
        allLines.forEach(function(ln){ var nm=wh2LineRequesterName(o,ln); if(nm && nm!=="—" && names.indexOf(nm)===-1) names.push(nm); });
        return '<tr>'+
          '<td class="cell-strong">'+esc(o.orderNumber)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(o.date)+'</td>'+
          '<td>'+esc(names.join(", ")||o.customerName||"—")+'</td>'+
          '<td>'+esc(o.supplierName||"—")+'</td>'+
          '<td class="cell-muted">'+esc(tarkibTxt)+'</td>'+
          '<td>'+wh2ReqChip(o)+'</td>'+
          '<td>'+st+'</td>'+
          '<td>'+actions+'</td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Буюртма рақами</th><th>Сана</th><th>Буюртмачи (ходим)</th><th>Етказиб берувчи</th><th>Таркиб</th><th>Тасдиқлаш</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireWhSubnav(root);
    document.getElementById("wh2AddOrderBtn").addEventListener("click", function(){ openWh2OrderForm(null); });
    root.querySelectorAll("[data-wh2-view]").forEach(function(b){ b.addEventListener("click", function(){ openWh2OrderDetail(wh2OrderById(b.getAttribute("data-wh2-view"))); }); });
    root.querySelectorAll("[data-wh2-edit]").forEach(function(b){ b.addEventListener("click", function(){ openWh2OrderForm(wh2OrderById(b.getAttribute("data-wh2-edit"))); }); });
    root.querySelectorAll("[data-wh2-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var o = wh2OrderById(b.getAttribute("data-wh2-copy")); if(!o) return;
      /* Нусха — id'сиз янги буюртма: эски буюртмага тегмайди (2026-10-21). */
      openWh2OrderForm({orderNumber:wh2FreshOrderNumber(), date:todayISO(), customerName:"",
        supplierName:o.supplierName||"", note:o.note||"",
        lines:(o.lines||[]).map(function(ln){
          return {itemId:ln.itemId||"", itemName:ln.itemName||"", unit:ln.unit||"", qty:Number(ln.qty)||0,
            completed:false, approved:true, requesterEmployeeId:ln.requesterEmployeeId||"", requesterName:ln.requesterName||""};
        })});
      toast("Нусха олинди — текшириб сақланг");
    }); });
    root.querySelectorAll("[data-wh2-print]").forEach(function(b){ b.addEventListener("click", function(){ printWh2Order(wh2OrderById(b.getAttribute("data-wh2-print"))); }); });
    root.querySelectorAll("[data-wh2-excel]").forEach(function(b){ b.addEventListener("click", function(){ exportWh2OrderExcel(wh2OrderById(b.getAttribute("data-wh2-excel"))); }); });
    root.querySelectorAll("[data-wh2-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var o = wh2OrderById(b.getAttribute("data-wh2-cancel")); if(!o) return;
      openConfirm("Буюртмани бекор қилиш","«"+o.orderNumber+"» буюртма бекор қилинсинми? Ёзув тарихда сақланиб қолади ва хоҳласангиз кейин қайта тиклашингиз мумкин.","Ҳа, бекор қилиш", function(){ dbUpdate("wh2Orders", o.id, {cancelled:true}, STATE.wh2Orders); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-wh2-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var o = wh2OrderById(b.getAttribute("data-wh2-restore")); if(!o) return;
      openConfirm("Буюртмани тиклаш","«"+o.orderNumber+"» буюртма қайта тикланиб, фаол ҳолатга қайтарилсинми?","Ҳа, тиклаш", function(){ dbUpdate("wh2Orders", o.id, {cancelled:false}, STATE.wh2Orders); toast("Тикланди"); }, true);
    }); });
  }

  function openWh2OrderForm(existing){
    /* "existing" is either a saved order being edited (.id set), or a
       draft re-entry handed back from a "+" quick-add flow below (item,
       unit, customer, supplier) — it must NOT be discarded in that case,
       exactly like openOrderForm's own draft re-entry pattern. Only .id
       truthiness distinguishes real-edit from draft-reentry. */
    var isEdit = !!(existing && existing.id);
    var fs = existing
      ? {id:existing.id, orderNumber:existing.orderNumber||wh2FreshOrderNumber(), date:existing.date||todayISO(), customerName:existing.customerName||"", supplierName:existing.supplierName||"", note:existing.note||"", lines:(existing.lines||[]).map(function(x){ return Object.assign({completed:false, requesterEmployeeId:"", requesterName:""}, x); })}
      : {orderNumber:wh2FreshOrderNumber(), date:todayISO(), customerName:"", supplierName:"", note:"", lines:[{itemId:"", itemName:"", unit:"", qty:0, completed:false, requesterEmployeeId:"", requesterName:""}]};
    if(!fs.lines.length) fs.lines.push({itemId:"", itemName:"", unit:"", qty:0, completed:false, requesterEmployeeId:"", requesterName:""});

    var supplierOptions = STATE.suppliers.map(function(s){ return '<option value="'+esc(s.name)+'">'; }).join("");

    /* 2026-10-19 сўрови: маҳсулот номи ва буюртмачи энди АЛОҲИДА ОЙНА
       орқали (тепасида қидирув майдони билан) танланади; буюртмачи
       рўйхати — харидорлар эмас, ишлаб турган ХОДИМЛАР. «Бажарилди»
       галочкаси олиб ташланди (тасдиқлаш жараёни билан алмаштирилди). */
    var rowsHtml = function(){
      return fs.lines.map(function(ln,i){
        return '<tr data-wh2row="'+i+'">'+
          '<td class="cell-muted">'+(i+1)+'</td>'+
          '<td><div style="display:flex;gap:4px;align-items:center;">'+
            '<button type="button" class="btn btn-secondary btn-sm" data-wh2-item-pick="'+i+'" style="flex:1;min-width:150px;justify-content:flex-start;font-weight:600;">'+(ln.itemName?esc(ln.itemName):'<span class="cell-muted">— Маҳсулотни танланг —</span>')+'</button>'+
            '<button type="button" class="btn btn-secondary btn-icon" data-wh2-item-add="'+i+'" title="Рўйхатда бўлмаса — янги маҳсулот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></td>'+
          '<td><button type="button" class="btn btn-secondary btn-sm" data-wh2-req-pick="'+i+'" style="width:100%;min-width:150px;justify-content:flex-start;font-weight:600;">'+(ln.requesterName?esc(ln.requesterName):'<span class="cell-muted">— Буюртмачини танланг —</span>')+'</button></td>'+
          '<td><div style="display:flex;gap:4px;align-items:center;"><select data-field="unit" data-row="'+i+'" style="min-width:100px;">'+wh2UnitOptionsHtml(ln.unit)+'</select><button type="button" class="btn btn-secondary btn-icon" data-wh2-unit-add="'+i+'" title="Янги ўлчов бирлиги қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></td>'+
          '<td><input type="number" min="0" step="any" data-field="qty" data-row="'+i+'" value="'+esc(ln.qty)+'" style="width:90px;"></td>'+
          '<td><div style="display:flex;gap:4px;"><button type="button" class="btn btn-ghost btn-icon" data-wh2-addrow="'+i+'" title="Пастига қатор қўшиш">'+ICONS.plus+'</button><button type="button" class="btn btn-ghost btn-icon" data-wh2-delrow="'+i+'" title="Қаторни ўчириш">'+ICONS.trash+'</button></div></td>'+
          '</tr>';
      }).join("");
    };

    var body = ''+
      '<div class="field-row"><div class="field"><label>Буюртма рақами</label><input id="wh2-orderNumber" value="'+esc(fs.orderNumber)+'"></div>'+
      '<div class="field"><label>Сана</label><input id="wh2-date" type="date" value="'+esc(fs.date)+'"></div></div>'+
      '<div class="field-row">'+
      '<div class="field"><label>Етказиб берувчи <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><input id="wh2-supplier" list="wh2-supplier-list" placeholder="Ташкилот номи" value="'+esc(fs.supplierName)+'" style="flex:1;min-width:0;"><button type="button" class="btn btn-secondary btn-icon" id="wh2-supplier-pick" title="Рўйхатдан қидириб танлаш" style="flex-shrink:0;">'+ICONS.search+'</button><button type="button" class="btn btn-secondary btn-icon" id="wh2-supplier-add" title="Янги етказиб берувчи қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><datalist id="wh2-supplier-list">'+supplierOptions+'</datalist></div></div>'+
      '<div class="section-head" style="margin-top:4px;"><h2 style="font-size:13.5px;">Маҳсулотлар</h2></div>'+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Маҳсулот номи</th><th>Буюртмачи</th><th>Ўлчов бирлиги</th><th>Миқдори</th><th></th></tr></thead><tbody id="wh2RowsBody">'+rowsHtml()+'</tbody></table></div>'+
      '<div class="field" style="margin-top:14px;"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="wh2-note">'+esc(fs.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Буюртма қўшиш")+'</button>';
    var m = openModal(isEdit?"Буюртмани таҳрирлаш":"Янги буюртма", body, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var rowsBody = m.querySelector("#wh2RowsBody");
    var snapshotFields = function(){
      fs.orderNumber = m.querySelector("#wh2-orderNumber").value;
      fs.date = m.querySelector("#wh2-date").value;
      fs.supplierName = m.querySelector("#wh2-supplier").value;
      fs.note = m.querySelector("#wh2-note").value;
    };
    rowsBody.addEventListener("input", function(e){
      var t = e.target, field = t.getAttribute("data-field"), row = Number(t.getAttribute("data-row"));
      if(row==null||isNaN(row)) return;
      var ln = fs.lines[row]; if(!ln) return;
      if(field==="qty") ln.qty = Number(t.value)||0;
    });
    rowsBody.addEventListener("change", function(e){
      var t = e.target, field = t.getAttribute("data-field"), row = Number(t.getAttribute("data-row"));
      if(row==null||isNaN(row)) return;
      var ln = fs.lines[row]; if(!ln) return;
      if(field==="unit") ln.unit = t.value;
    });
    rowsBody.addEventListener("click", function(e){
      var addBtn = e.target.closest("[data-wh2-addrow]");
      if(addBtn){
        var idx = Number(addBtn.getAttribute("data-wh2-addrow"));
        var prevReq = fs.lines[idx] || {};
        /* Қулайлик учун: янги қаторга юқоридаги қаторнинг буюртмачиси
           таклиф қилинади (бир ходим бир нечта маҳсулот сўраши мумкин). */
        fs.lines.splice(idx+1, 0, {itemId:"", itemName:"", unit:"", qty:0, completed:false, requesterEmployeeId:prevReq.requesterEmployeeId||"", requesterName:prevReq.requesterName||""});
        rowsBody.innerHTML = rowsHtml();
        return;
      }
      var delBtn = e.target.closest("[data-wh2-delrow]");
      if(delBtn){
        var idx2 = Number(delBtn.getAttribute("data-wh2-delrow"));
        fs.lines.splice(idx2, 1);
        if(!fs.lines.length) fs.lines.push({itemId:"", itemName:"", unit:"", qty:0, completed:false, requesterEmployeeId:"", requesterName:""});
        rowsBody.innerHTML = rowsHtml();
        return;
      }
      var itemPickBtn = e.target.closest("[data-wh2-item-pick]");
      if(itemPickBtn){
        var pIdx = Number(itemPickBtn.getAttribute("data-wh2-item-pick"));
        snapshotFields();
        var pDraft = Object.assign({}, fs);
        if(isEdit) pDraft.id = fs.id;
        closeModal();
        openWh2ItemPickerModal(function(itm){
          if(itm){
            pDraft.lines[pIdx].itemId = itm.id;
            pDraft.lines[pIdx].itemName = itm.name;
            if(!pDraft.lines[pIdx].unit) pDraft.lines[pIdx].unit = itm.unit||"";
          }
          openWh2OrderForm(pDraft);
        }, function(){ openWh2OrderForm(pDraft); });
        return;
      }
      var reqPickBtn = e.target.closest("[data-wh2-req-pick]");
      if(reqPickBtn){
        var rIdx = Number(reqPickBtn.getAttribute("data-wh2-req-pick"));
        snapshotFields();
        var rDraft = Object.assign({}, fs);
        if(isEdit) rDraft.id = fs.id;
        closeModal();
        openEmployeePickerModal("Буюртмачини танлаш (ходимлар)", function(emp){
          if(emp){
            rDraft.lines[rIdx].requesterEmployeeId = emp.id;
            rDraft.lines[rIdx].requesterName = emp.fullName||"";
          }
          openWh2OrderForm(rDraft);
        }, function(){ openWh2OrderForm(rDraft); });
        return;
      }
      var unitAddBtn = e.target.closest("[data-wh2-unit-add]");
      if(unitAddBtn){
        var rowIdx = Number(unitAddBtn.getAttribute("data-wh2-unit-add"));
        snapshotFields();
        var draft = Object.assign({}, fs);
        if(isEdit) draft.id = fs.id;
        closeModal();
        openUnitForm(null, function(newUnitName){
          draft.lines[rowIdx].unit = newUnitName||"";
          openWh2OrderForm(draft);
        });
        return;
      }
      var itemAddBtn = e.target.closest("[data-wh2-item-add]");
      if(itemAddBtn){
        var itemRowIdx = Number(itemAddBtn.getAttribute("data-wh2-item-add"));
        snapshotFields();
        var itemDraft = Object.assign({}, fs);
        if(isEdit) itemDraft.id = fs.id;
        closeModal();
        openItemForm({name:"", itemType:"xomashyo", unit:UNIT_OPTIONS[0], minQuantity:0, price:0, categoryId:"", location:""}, function(newItemId, newItemName){
          var newItem = itemById(newItemId);
          itemDraft.lines[itemRowIdx].itemId = newItemId||"";
          itemDraft.lines[itemRowIdx].itemName = newItemName||"";
          if(newItem && !itemDraft.lines[itemRowIdx].unit) itemDraft.lines[itemRowIdx].unit = newItem.unit||"";
          openWh2OrderForm(itemDraft);
        });
        return;
      }
    });

    var supPickBtn = m.querySelector("#wh2-supplier-pick");
    if(supPickBtn) supPickBtn.addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openNameListPickerModal("Етказиб берувчини танлаш", STATE.suppliers, function(name){
        draft.supplierName = name||"";
        openWh2OrderForm(draft);
      }, function(){ openWh2OrderForm(draft); });
    });
    var supAddBtn = m.querySelector("#wh2-supplier-add");
    if(supAddBtn) supAddBtn.addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openSupplierForm(null, function(supplierId, supplierName){
        draft.supplierName = supplierName||"";
        openWh2OrderForm(draft);
      }, function(){ openWh2OrderForm(draft); });
    });

    m.querySelector("[data-save]").addEventListener("click", function(){
      snapshotFields();
      var orderNumber = fs.orderNumber.trim() || wh2FreshOrderNumber();
      var validLines = fs.lines.filter(function(ln){ return ln.itemId && Number(ln.qty)>0; }).map(function(ln){
        var itm = itemById(ln.itemId);
        return {itemId:ln.itemId, itemName: itm?itm.name:(ln.itemName||"—"), unit: ln.unit||(itm?itm.unit:""), qty: Number(ln.qty)||0,
          completed: !!ln.completed, approved: (ln.approved!==false),
          requesterEmployeeId: ln.requesterEmployeeId||"", requesterName: (ln.requesterName||"").trim()};
      });
      if(!validLines.length){ toast("Камида битта маҳсулот ва миқдорини киритинг"); return; }
      if(validLines.some(function(ln){ return !ln.requesterName; })){ toast("Ҳар бир маҳсулот учун буюртмачини (ходимни) танланг"); return; }
      /* Буюртмачи энди ҳар бир қаторда — буюртма дарajasidagi "customerName"
         эса эски кўринишлар учун қаторлардаги исмлардан йиғилади
         (харидорлар рўйхатига ҲЕЧ НИМА қўшилмайди). */
      var reqNames = [];
      validLines.forEach(function(ln){ if(ln.requesterName && reqNames.indexOf(ln.requesterName)===-1) reqNames.push(ln.requesterName); });
      var supplierName = fs.supplierName.trim();
      var supplier = supplierName ? wh2ResolveOrCreate("suppliers", STATE.suppliers, supplierName) : {id:"", name:""};
      var data = {
        orderNumber: orderNumber, date: fs.date || todayISO(),
        customerId: "", customerName: reqNames.join(", "),
        supplierId: supplier.id, supplierName: supplier.name,
        lines: validLines, note: (fs.note||"").trim()
      };
      if(isEdit){
        /* Таҳрирланса — тасдиқлаш жараёни бошидан бошланади. */
        data.requestStatus = "new";
        data.accApprovedAt = ""; data.accApprovedBy = "";
        data.dirApprovedAt = ""; data.dirApprovedBy = "";
        data.rejectedAt = ""; data.rejectedBy = ""; data.rejectReason = "";
        dbUpdate("wh2Orders", fs.id, data, STATE.wh2Orders);
        toast("Буюртма янгиланди — қайта тасдиқлашга юборилди");
      } else {
        data.cancelled = false;
        data.requestStatus = "new";
        data.createdAt = new Date().toISOString();
        dbAdd("wh2Orders", data, STATE.wh2Orders);
        toast("Буюртма сақланди — бухгалтер тасдиғига юборилди");
      }
      closeModal();
    });
  }

  function openWh2OrderDetail(o){
    if(!o) return;
    var isDir = wh2AccOk(o) && wh2DirOk(o);
    var delState = wh2DeliveryState(o);
    var rows = (o.lines||[]).map(function(ln,i){
      var stChip;
      if(isDir && ln.approved===false) stChip = '<span class="chip chip-critical">Олиб ташланди</span>';
      else if(!isDir) stChip = '<span class="chip chip-neutral">Тасдиқ кутилмоқда</span>';
      else if(delState==="none") stChip = '<span class="chip chip-good">Тасдиқланди</span>';
      else if(wh2LineFull(ln)) stChip = '<span class="chip chip-good">Бажарилди</span>';
      else stChip = '<span class="chip chip-critical">Етказилмади</span>';
      var delTxt = (isDir && ln.approved!==false && delState!=="none")
        ? (fmtNum(wh2LineDelivered(ln))+' / '+fmtNum(ln.qty))
        : '—';
      return '<tr'+(isDir && ln.approved===false ? ' style="opacity:.5;"' : '')+'><td class="cell-muted">'+(i+1)+'</td><td>'+esc(ln.itemName)+'</td><td>'+esc(wh2LineRequesterName(o, ln))+'</td><td class="num">'+fmtNum(ln.qty)+'</td><td>'+esc(ln.unit||"—")+'</td><td class="num cell-muted">'+esc(delTxt)+'</td><td>'+stChip+'</td></tr>';
    }).join("");
    var body = wh2StepperHtml(o)+
      '<div class="detail-grid">'+
      '<div><div class="dl">Буюртма рақами</div><div class="dd">'+esc(o.orderNumber)+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDateShort(o.date)+'</div></div>'+
      '<div><div class="dl">Буюртмачи (ходим)</div><div class="dd">'+esc(o.customerName||"—")+'</div></div>'+
      '<div><div class="dl">Етказиб берувчи</div><div class="dd">'+esc(o.supplierName||"—")+'</div></div>'+
      '<div><div class="dl">Ҳолат</div><div class="dd">'+(o.cancelled?'<span class="chip chip-critical">Бекор қилинди</span>':'<span class="chip chip-good">Фаол</span>')+'</div></div>'+
      '<div><div class="dl">Тасдиқлаш</div><div class="dd">'+wh2ReqChip(o)+'</div></div>'+
      '</div>'+ wh2StampsHtml(o) +
      '<div class="table-wrap" style="margin:14px 0;"><table><thead><tr><th>№</th><th>Маҳсулот</th><th>Буюртмачи</th><th>Миқдори</th><th>Бирлик</th><th class="num">Келди</th><th>Ҳолат</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      (o.note ? '<div class="field"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);line-height:1.5;">'+esc(o.note)+'</div></div>' : '');
    var foot = ''+
      '<button class="btn btn-secondary btn-sm" data-wh2d-print>'+ICONS.printer+'Чоп этиш</button>'+
      '<button class="btn btn-secondary btn-sm" data-wh2d-excel>'+ICONS.download+'Excel</button>'+
      '<span style="flex:1"></span>'+
      (o.cancelled
        ? '<button class="btn btn-secondary btn-sm" data-wh2d-restore>'+ICONS.restore+'Тиклаш</button>'
        : '<button class="btn btn-secondary btn-sm" data-wh2d-cancel>'+ICONS.ban+'Бекор қилиш</button>')+
      '<button class="btn btn-primary btn-sm" data-wh2d-edit>'+ICONS.pencil+'Таҳрирлаш</button>';
    var m = openModal(esc(o.orderNumber), body, foot, true);
    m.querySelector("[data-wh2d-print]").addEventListener("click", function(){ printWh2Order(o); });
    m.querySelector("[data-wh2d-excel]").addEventListener("click", function(){ exportWh2OrderExcel(o); });
    m.querySelector("[data-wh2d-edit]").addEventListener("click", function(){ closeModal(); openWh2OrderForm(o); });
    var cancelBtn = m.querySelector("[data-wh2d-cancel]");
    if(cancelBtn) cancelBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Буюртмани бекор қилиш","«"+o.orderNumber+"» буюртма бекор қилинсинми? Ёзув тарихда сақланиб қолади.","Ҳа, бекор қилиш", function(){ dbUpdate("wh2Orders", o.id, {cancelled:true}, STATE.wh2Orders); toast("Бекор қилинди"); }, true);
    });
    var restoreBtn = m.querySelector("[data-wh2d-restore]");
    if(restoreBtn) restoreBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Буюртмани тиклаш","«"+o.orderNumber+"» буюртма қайта тикланиб, фаол ҳолатга қайтарилсинми?","Ҳа, тиклаш", function(){ dbUpdate("wh2Orders", o.id, {cancelled:false}, STATE.wh2Orders); toast("Тикланди"); }, true);
    });
  }

  function printWh2Order(o){
    if(!o) return;
    /* Раҳбар тасдиқлагандан сўнг — қоғозга ФАҚАТ тасдиқланган маҳсулотлар
       чиқади (2026-10-19 сўрови): омбор ходими шу рўйхатни етказиб
       берувчига беради. */
    var printLines = wh2ApprovedLines(o);
    var rows = printLines.map(function(ln,i){
      return '<tr><td>'+(i+1)+'</td><td>'+esc(ln.itemName)+'</td><td>'+esc(wh2LineRequesterName(o, ln))+'</td><td style="text-align:right;">'+fmtNum(ln.qty)+'</td><td>'+esc(ln.unit||"—")+'</td></tr>';
    }).join("");
    var body = '<table>'+
      '<tr><td style="width:36%;">Буюртмачи</td><td style="text-align:right;">'+esc(o.customerName||"—")+'</td></tr>'+
      '<tr><td>Етказиб берувчи</td><td style="text-align:right;">'+esc(o.supplierName||"—")+'</td></tr>'+
      '<tr><td>Тасдиқлаш ҳолати</td><td style="text-align:right;">'+esc(wh2ReqLabel(o))+'</td></tr>'+
      (o.accApprovedAt?('<tr><td>Бухгалтер тасдиғи</td><td style="text-align:right;">'+esc(o.accApprovedBy||"—")+' · '+esc(fmtDateShort((o.accApprovedAt||"").slice(0,10)))+'</td></tr>'):'')+
      (o.dirApprovedAt?('<tr><td>Раҳбар тасдиғи</td><td style="text-align:right;">'+esc(o.dirApprovedBy||"—")+' · '+esc(fmtDateShort((o.dirApprovedAt||"").slice(0,10)))+'</td></tr>'):'')+
      '<tr><td>Маҳсулотлар сони</td><td style="text-align:right;">'+printLines.length+' та</td></tr>'+
      '</table>'+
      '<table class="wh2-lines" style="margin-top:10px;">'+
        '<colgroup><col class="c-no"><col class="c-name"><col class="c-req"><col class="c-qty"><col class="c-unit"></colgroup>'+
        '<thead><tr><th>№</th><th>Маҳсулот</th><th>Буюртмачи</th><th style="text-align:right;">Миқдори</th><th>Бирлик</th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table>'+
      (o.note ? '<div style="margin-top:10px;font-size:11.5px;">Изоҳ: '+esc(o.note)+'</div>' : '')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell("Омборлар — Буюртма "+esc(o.orderNumber), "Сана: "+esc(fmtDateShort(o.date)), body, "wh2-print");
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function exportWh2OrderExcel(o){
    if(!o) return;
    var headers = ["№","Маҳсулот","Буюртмачи","Миқдори","Бирлик"];
    var rowsArr = wh2ApprovedLines(o).map(function(ln,i){ return [i+1, ln.itemName, wh2LineRequesterName(o, ln), fmtNum(ln.qty), ln.unit||""]; });
    rowsArr.unshift(["Буюртма рақами", o.orderNumber, "Сана", fmtDateShort(o.date)]);
    rowsArr.unshift(["Тасдиқлаш ҳолати", wh2ReqLabel(o), "", ""]);
    rowsArr.unshift(["Буюртмачи", o.customerName||"—", "Етказиб берувчи", o.supplierName||"—"]);
    rowsArr.push([]);
    exportHtmlTableAsExcel("Buyurtma_"+o.orderNumber+".xls", "Буюртма "+o.orderNumber, headers, rowsArr);
  }

