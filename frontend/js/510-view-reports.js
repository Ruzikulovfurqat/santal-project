  /* ================= view: reports ================= */
  function reportsSubnav(active){
    var tabs=[["overview","Умумий"],["cashflow","Пул оқими"],["debtors","Карздорлар"],["act","Акт сверка"],["vat","ККС ҳисоботи"],["writeoffs","Хисобдан чиқаришлар"]];
    return '<div class="filter-row" style="margin-bottom:18px;">'+tabs.map(function(t){return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-reportsview="'+t[0]+'">'+t[1]+'</button>';}).join("")+'</div>';
  }
  function wireReportsSubnav(root){
    root.querySelectorAll("[data-reportsview]").forEach(function(b){ b.addEventListener("click", function(){ STATE.reportsView=b.getAttribute("data-reportsview"); render(); }); });
  }
  function viewReports(){
    if(STATE.reportsView==="cashflow") return renderReportsCashflow();
    if(STATE.reportsView==="debtors") return renderReportsDebtors();
    if(STATE.reportsView==="act") return renderReportsAct();
    if(STATE.reportsView==="vat") return renderReportsVat();
    if(STATE.reportsView==="writeoffs") return renderReportsWriteoffs();
    return renderReportsOverview();
  }

  function renderReportsOverview(){
    setTopbar("Ҳисобот ва статистика", todayLabel(), "");
    var stats = computeStats();
    var html = reportsSubnav("overview") + sampleBanner();

    html += '<div class="section"><div class="kpi-grid">'+
      kpiTile("Жами буюртмалар", stats.total, "", "") +
      kpiTile("Жараёнда", stats.progress, "", "accent") +
      kpiTile("Бажарилди", stats.completed, "", "good") +
      kpiTile("Кечикди", stats.overdue, "", stats.overdue>0?"critical":"") +
      '</div></div>';

    var maxMonth = Math.max.apply(null, stats.byMonth.map(function(b){return b.count;}).concat([1]));
    var barsHtml = stats.byMonth.map(function(b){
      var h = Math.round((b.count/maxMonth)*120);
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">'+
        '<div class="num" style="font-size:11.5px;font-weight:700;color:var(--ink-2);">'+b.count+'</div>'+
        '<div class="chart-bar" data-tip="'+esc(b.label+": "+b.count+" та буюртма")+'" style="width:100%;max-width:38px;height:'+Math.max(h,3)+'px;background:var(--accent);border-radius:5px 5px 2px 2px;cursor:pointer;"></div>'+
        '<div style="font-size:11.5px;color:var(--ink-3);font-weight:600;">'+b.label+'</div>'+
        '</div>';
    }).join("");

    var maxStage = Math.max.apply(null, stats.byStage.map(function(s){return s.count;}).concat([1]));
    var hbars = stats.byStage.map(function(s){
      var w = Math.round((s.count/maxStage)*100);
      return '<div class="hbar-row"><div class="hbar-label">'+esc(s.stage)+'</div><div class="hbar-track"><div class="hbar-fill" style="width:'+w+'%"></div></div><div class="hbar-value num">'+s.count+'</div></div>';
    }).join("");

    html += '<div class="two-col">';
    html += '<div class="card chart-card"><h3>Буюртмалар — сўнгги 6 ой</h3><div class="sub">Ойлар кесимида яратилган буюртмалар сони</div>'+
      '<div style="display:flex;align-items:flex-end;gap:10px;height:150px;padding-top:6px;">'+barsHtml+'</div></div>';
    html += '<div class="card chart-card"><h3>Жараёндаги буюртмалар — босқичлар бўйича</h3><div class="sub">Ҳозир қайси босқичда турибди</div>'+hbars+'</div>';
    html += '</div>';

    html += '<div class="two-col">';
    html += '<div class="section" style="margin-bottom:0;"><div class="section-head"><h2>Кам қолган захиралар</h2></div>'+
      (stats.lowStock.length ? '<div class="card" style="padding:8px 14px;"><div class="alert-list" style="padding:8px 0;">'+stats.lowStock.map(function(m){
        return '<div class="alert-row"><span style="color:var(--warning)">'+ICONS.alert+'</span><div class="grow"><div class="t">'+esc(m.name)+'</div><div class="s">Қолди: '+fmtNum(m.quantity)+' '+esc(m.unit)+' · минимум '+fmtNum(m.minQuantity)+'</div></div></div>';
      }).join("")+'</div></div>' : '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3);font-size:13px;">Барча захиралар етарли даражада ✓</div>')+
      '</div>';
    html += '<div class="section" style="margin-bottom:0;"><div class="section-head"><h2>Ходимлар — лавозимлар бўйича</h2></div>'+
      (stats.byPosition.length ? '<div class="card" style="padding:16px 18px;">'+stats.byPosition.slice(0,7).map(function(p){
        var w = Math.round((p.count/stats.totalEmployees)*100);
        return '<div class="hbar-row"><div class="hbar-label" style="width:120px;">'+esc(p.position)+'</div><div class="hbar-track"><div class="hbar-fill" style="width:'+w+'%;background:var(--good);"></div></div><div class="hbar-value num">'+p.count+'</div></div>';
      }).join("")+'</div>' : '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3);font-size:13px;">Ходимлар қўшилмаган</div>')+
      '</div>';
    html += '</div>';

    html += '<div class="section"><div class="section-head"><h2>Меъёридан ортиб кетган захиралар</h2></div>'+
      (stats.overStock.length ? '<div class="card" style="padding:8px 14px;"><div class="alert-list" style="padding:8px 0;">'+stats.overStock.map(function(m){
        return '<div class="alert-row"><span style="color:var(--critical)">'+ICONS.alert+'</span><div class="grow"><div class="t">'+esc(m.name)+'</div><div class="s">Қолди: '+fmtNum(m.quantity)+' '+esc(m.unit)+' · максимум '+fmtNum(m.maxQuantity)+'</div></div></div>';
      }).join("")+'</div></div>' : '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3);font-size:13px;">Меъёридан ошган захира йўқ ✓</div>')+
      '</div>';

    var root = document.getElementById("content");
    root.innerHTML = html;
    wireSampleBanner(root);
    wireReportsSubnav(root);

    var tip = document.getElementById("barTooltip");
    root.querySelectorAll("[data-tip]").forEach(function(barEl){
      barEl.addEventListener("mousemove", function(ev){
        tip.textContent = barEl.getAttribute("data-tip");
        tip.style.left = (ev.clientX+12)+"px"; tip.style.top=(ev.clientY-30)+"px"; tip.style.opacity="1";
      });
      barEl.addEventListener("mouseleave", function(){ tip.style.opacity="0"; });
    });
  }

  function renderReportsCashflow(){
    setTopbar("Пул оқими", todayLabel(), "");
    var root = document.getElementById("content");
    var html = reportsSubnav("cashflow");
    var totalKirim = STATE.cashTransactions.filter(function(t){return t.direction==="kirim";}).reduce(function(s,t){return s+Number(t.amount||0);},0);
    var totalChiqim = STATE.cashTransactions.filter(function(t){return t.direction==="chiqim";}).reduce(function(s,t){return s+Number(t.amount||0);},0);
    html += '<div class="kpi-grid" style="margin-bottom:20px;">'+
      kpiTileFmt("Жами кирим", fmtSum(totalKirim), "", "good")+
      kpiTileFmt("Жами чиқим", fmtSum(totalChiqim), "", "critical")+
      kpiTileFmt("Соф оқим", fmtSum(totalKirim-totalChiqim), "", totalKirim-totalChiqim>=0?"good":"critical")+
      kpiTileFmt("Умумий касса қолдиғи", fmtSum(totalCashBalance()), "", "accent")+
      '</div>';
    if(!STATE.cashAccounts.length){
      html += emptyState("Касса ҳисоблари йўқ","«Касса» бўлимида касса тури яратинг.");
    } else {
      html += '<div class="kpi-grid" style="margin-bottom:20px;">'+STATE.cashAccounts.map(function(a){
        return kpiTileFmt(esc(a.name)+" ("+cashAccountTypeLabel(a.type)+")", fmtSum(cashAccountBalance(a.id)), "", "");
      }).join("")+'</div>';
    }
    var list = STATE.cashTransactions.slice().sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");}).slice(0,60);
    if(!list.length){
      html += emptyState("Ҳали ҳаракат йўқ","Касса бўлимида кирим ёки чиқим киритинг.");
    } else {
      var rows = list.map(function(t){
        return '<tr><td class="cell-muted">'+fmtDateShort(t.date)+'</td><td>'+esc(cashAccountName(t.cashAccountId))+'</td><td class="cell-muted">'+esc(cashCategoryLabel(t.category))+'</td><td class="cell-muted">'+esc(t.description||"—")+'</td><td class="num cell-strong" style="color:'+(t.direction==="kirim"?"var(--good)":"var(--critical)")+';">'+(t.direction==="kirim"?"+":"−")+fmtSum(t.amount)+'</td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Касса</th><th>Категория</th><th>Изоҳ</th><th>Сумма</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireReportsSubnav(root);
  }

  function renderReportsDebtors(){
    setTopbar("Карздорлар", todayLabel(), "");
    var root = document.getElementById("content");
    var html = reportsSubnav("debtors");
    var list = STATE.customers.map(function(c){ return {c:c, debt:customerDebt(c.id), overdue:customerOverdueDebt(c.id)}; }).filter(function(x){return x.debt>0;}).sort(function(a,b){return b.debt-a.debt;});
    html += '<div class="kpi-grid" style="margin-bottom:20px;">'+
      kpiTileFmt("Жами қарз", fmtSum(totalDebt()), "", "warning")+
      kpiTileFmt("Муддати ўтган қарз", fmtSum(totalOverdueDebt()), "", "critical")+
      kpiTile("Қарздор мижозлар", list.length, "", list.length>0?"warning":"") +
      '</div>';
    if(!list.length){
      html += emptyState("Қарздорлар йўқ","Барча мижозлар ҳисоб-китобни тўлиқ амалга оширган ✓");
    } else {
      var rows = list.map(function(x){
        return '<tr><td class="cell-strong">'+esc(x.c.name)+'</td><td class="cell-muted">'+esc(x.c.phone||"—")+'</td><td class="num cell-strong">'+fmtSum(x.debt)+'</td><td class="num" style="color:var(--critical);">'+(x.overdue>0?fmtSum(x.overdue):"—")+'</td><td>'+(x.overdue>0?'<span class="chip chip-critical">'+ICONS.alert+'Муддати ўтган</span>':'<span class="chip chip-warning">Қарздор</span>')+'</td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Мижоз</th><th>Телефон</th><th>Жами қарз</th><th>Муддати ўтган</th><th>Ҳолат</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireReportsSubnav(root);
  }

  /* Акт сверка энди мижоз БИЛАН БИРГА таъминотчини ҳам қўллаб-қувватлайди
     (фойдаланувчи сўровига кўра) — рўйхатдан танлаш "Солиштирма
     далолатнома" бўлимидаги openActWhoPickerModal орқали (Харидор/
     Етказиб берувчи тугли ва излаш билан), токи иккита алоҳида UI
     ёзилмасин. Таъминотчи учун дебет — бизга ёзилган кирим ва ускуна/
     жиҳоз киримлари (биз ким-дир қарздор бўламиз), кредит — биз қилган
     тўловлар ВА лом/металл возвратлари (улар ҳам қарзимизни камайтиради,
     қаранг: supplierLomReturns). */
  function renderReportsAct(){
    setTopbar("Акт сверка", "Мижоз ёки таъминотчи бўйича ҳисоб-китоб тарихи", "");
    var root = document.getElementById("content");
    var html = reportsSubnav("act");
    var actType = STATE.reportActType||"customer";
    var actWho = STATE.reportActWho||"";
    var actWhoName = actWho ? (actType==="customer"?customerName(actWho):supplierName(actWho)) : "";
    html += '<div class="card" style="padding:18px 20px;margin-bottom:20px;"><div class="field-row">'+
      '<div class="field"><label>Мижоз ёки таъминотчи</label>'+
        '<button type="button" class="btn btn-secondary" id="act-who-pick-btn" style="width:100%;justify-content:flex-start;gap:8px;">'+ICONS.search+(actWhoName?(esc(actWhoName)+' <span class="chip chip-neutral" style="margin-left:6px;">'+(actType==="customer"?"Харидор":"Таъминотчи")+'</span>'):'— Танланг —')+'</button>'+
      '</div>'+
      '<div class="field"><label>Бошланиш санаси</label><input id="act-from" type="date" value="'+esc(STATE.reportActFrom||"")+'"></div>'+
      '<div class="field"><label>Тугаш санаси</label><input id="act-to" type="date" value="'+esc(STATE.reportActTo||"")+'"></div>'+
      '</div><button class="btn btn-primary btn-sm" id="act-run">Ҳисоблаш</button></div>';

    if(actWho){
      var from = STATE.reportActFrom, to = STATE.reportActTo;
      var entries = [];
      if(actType==="customer"){
        STATE.sales.filter(function(s){return s.customerId===actWho && !s.cancelled;}).forEach(function(s){
          var d = (s.createdAt||"").slice(0,10);
          if(from && d<from) return; if(to && d>to) return;
          entries.push({date:d, desc:"Сотув", debit:Number(s.totalWithVat||0), credit:Number(s.paidAmount||0)});
        });
        STATE.debtPayments.filter(function(p){return p.customerId===actWho;}).forEach(function(p){
          var d = (p.date||(p.createdAt||"").slice(0,10));
          if(from && d<from) return; if(to && d>to) return;
          entries.push({date:d, desc:"Тўлов"+(p.note?(" — "+p.note):""), debit:0, credit:Number(p.amount||0)});
        });
      } else {
        STATE.receipts.filter(function(r){return !r.cancelled && r.supplierId===actWho;}).forEach(function(r){
          var d = (r.date||r.createdAt||"").slice(0,10);
          if(from && d<from) return; if(to && d>to) return;
          entries.push({date:d, desc:"Кирим — "+(r.itemName||""), debit:Number(r.totalWithVat||0), credit:Number(r.paidAmount||0)});
        });
        STATE.equipmentReceipts.filter(function(r){return !r.cancelled && r.supplierId===actWho;}).forEach(function(r){
          var d = (r.date||r.createdAt||"").slice(0,10);
          if(from && d<from) return; if(to && d>to) return;
          entries.push({date:d, desc:"Ускуна/жиҳоз кирими — "+(r.name||""), debit:Number(r.totalWithVat||0), credit:Number(r.paidAmount||0)});
        });
        STATE.supplierPayments.filter(function(p){return p.supplierId===actWho;}).forEach(function(p){
          var d = (p.date||(p.createdAt||"").slice(0,10));
          if(from && d<from) return; if(to && d>to) return;
          entries.push({date:d, desc:"Тўлов"+(p.note?(" — "+p.note):""), debit:0, credit:Number(p.amount||0)});
        });
        supplierLomReturns(actWho, from, to).filter(function(x){return !x.cancelled;}).forEach(function(x){
          entries.push({date:x.date||(x.createdAt||"").slice(0,10), desc:(x.productType==="metal"?"Металл возврати":"Лом возврати")+" — "+(x.batchNumber||""), debit:0, credit:Number(x.appliedAmt!=null?x.appliedAmt:x.sum||0)});
        });
      }
      entries.sort(function(a,b){ return a.date.localeCompare(b.date); });
      var running = 0;
      var rows = entries.map(function(e){
        running += e.debit-e.credit;
        return '<tr><td class="cell-muted">'+fmtDateShort(e.date)+'</td><td>'+esc(e.desc)+'</td><td class="num">'+(e.debit?fmtSum(e.debit):"—")+'</td><td class="num">'+(e.credit?fmtSum(e.credit):"—")+'</td><td class="num cell-strong">'+fmtSum(running)+'</td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Амалиёт</th><th>Қарз (дебет)</th><th>Тўлов (кредит)</th><th>Қолдиқ</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="cell-muted" style="text-align:center;padding:20px;">Ёзувлар топилмади</td></tr>')+'</tbody></table></div>';
      html += '<div class="card" style="padding:16px 18px;margin-top:16px;max-width:340px;"><div style="display:flex;justify-content:space-between;"><span style="font-weight:800;">Якуний қолдиқ</span><span class="num" style="font-size:18px;font-weight:700;color:'+(running>0?"var(--critical)":"var(--good)")+';">'+fmtSum(running)+'</span></div></div>';
    } else {
      html += emptyState("Танланг","Акт сверкани кўриш учун юқорида мижоз ёки таъминотчини танланг.");
    }
    root.innerHTML = html;
    wireReportsSubnav(root);
    root.querySelector("#act-who-pick-btn").addEventListener("click", function(){
      STATE.reportActFrom = root.querySelector("#act-from").value;
      STATE.reportActTo = root.querySelector("#act-to").value;
      openActWhoPickerModal(function(pickedType, id){
        STATE.reportActType = pickedType;
        STATE.reportActWho = id;
        render();
      });
    });
    root.querySelector("#act-run").addEventListener("click", function(){
      STATE.reportActFrom = root.querySelector("#act-from").value;
      STATE.reportActTo = root.querySelector("#act-to").value;
      render();
    });
  }

  function renderReportsVat(){
    setTopbar("ККС ҳисоботи", todayLabel(), "");
    var root = document.getElementById("content");
    var html = reportsSubnav("vat");
    var inputVat = STATE.receipts.reduce(function(s,r){return s+Number(r.vatSum||0);},0);
    var outputVat = STATE.sales.filter(function(sl){return !sl.cancelled;}).reduce(function(s,sl){return s+Number(sl.vatSum||0);},0);
    var payable = outputVat-inputVat;
    html += '<div class="kpi-grid" style="margin-bottom:20px;">'+
      kpiTileFmt("Кирим бўйича ККС (ҳисобга олинадиган)", fmtSum(inputVat), "", "")+
      kpiTileFmt("Сотув бўйича ККС (ҳисобланган)", fmtSum(outputVat), "", "accent")+
      kpiTileFmt("Тўланадиган ККС (фарқ)", fmtSum(payable), "", payable>=0?"warning":"good")+
      '</div>';
    html += '<div class="two-col">';
    var rcpRows = STATE.receipts.slice().sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");}).slice(0,30).map(function(r){
      return '<tr><td class="cell-muted">'+fmtDateShort(r.date)+'</td><td>'+esc(r.itemName)+'</td><td class="num">'+fmtSum(r.totalNoVat)+'</td><td class="num cell-strong">'+fmtSum(r.vatSum)+'</td></tr>';
    }).join("");
    html += '<div class="section" style="margin-bottom:0;"><div class="section-head"><h2>Кирим бўйича ККС</h2></div>'+
      (rcpRows ? '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Маҳсулот</th><th>Сумма (ККСсиз)</th><th>ККС</th></tr></thead><tbody>'+rcpRows+'</tbody></table></div>' : '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3);font-size:13px;">Кирим йўқ</div>')+
      '</div>';
    var saleRows = STATE.sales.slice().sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");}).slice(0,30).map(function(s){
      return '<tr><td class="cell-muted">'+fmtDateShort((s.createdAt||"").slice(0,10))+'</td><td>'+esc(s.customerName)+'</td><td class="num">'+fmtSum(s.subtotalNoVat)+'</td><td class="num cell-strong">'+fmtSum(s.vatSum)+'</td></tr>';
    }).join("");
    html += '<div class="section" style="margin-bottom:0;"><div class="section-head"><h2>Сотув бўйича ККС</h2></div>'+
      (saleRows ? '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Мижоз</th><th>Сумма (ККСсиз)</th><th>ККС</th></tr></thead><tbody>'+saleRows+'</tbody></table></div>' : '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3);font-size:13px;">Сотув йўқ</div>')+
      '</div>';
    html += '</div>';
    root.innerHTML = html;
    wireReportsSubnav(root);
  }

  function renderReportsWriteoffs(){
    setTopbar("Хисобдан чиқаришлар ҳисоботи", STATE.writeoffs.length+" та акт", "");
    var root = document.getElementById("content");
    var html = reportsSubnav("writeoffs");
    var list = STATE.writeoffs.slice().sort(function(a,b){return (b.actDate||b.createdAt||"").localeCompare(a.actDate||a.createdAt||"");});
    var totalQty = list.reduce(function(s,w){return s+(Number(w.quantity)||0);},0);
    html += '<div class="kpi-grid" style="margin-bottom:20px;">'+
      kpiTile("Жами актлар", list.length, "", "") +
      kpiTileFmt("Жами чиқарилган миқдор", fmtNum(totalQty), "", "warning")+
      '</div>';
    if(!list.length){
      html += emptyState("Хисобдан чиқаришлар йўқ","«Омборлар → Хисобдан чиқариш» бўлимида акт киритилса, шу ерда кўринади.");
    } else {
      var rows = list.map(function(w){
        return '<tr><td class="cell-muted">'+fmtDateShort(w.actDate)+'</td><td class="cell-strong">'+esc(w.itemName||"—")+'</td><td>№'+esc(w.actNumber||"—")+'</td><td class="num cell-strong">'+fmtNum(w.quantity)+'</td><td>'+esc(warehouseName(w.warehouseId))+'</td><td>'+esc(employeeName(w.responsibleEmployeeId))+'</td><td class="cell-muted">'+esc(w.reason||"—")+'</td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Маҳсулот номи</th><th>Акт рақами</th><th>Миқдори</th><th>Омбор</th><th>Масъул шахс</th><th>Сабаби</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireReportsSubnav(root);
  }

