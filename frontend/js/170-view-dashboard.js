  /* ================= view: dashboard ================= */
  /* Таъминотчи томонидаги "муддати ўтган қарз неча кун кечикди" —
     худди customerOverdueDays каби, лекин таъминотчининг энг эрта муддати
     ўтган кирим (receipts) ёки ускуна/жиҳоз кирими (equipmentReceipts)
     бўйича ҳисобланади (2026-10-01 дашборд сўровига кўра қўшилди). */
  function supplierOverdueDays(supplierId){
    var today = todayISO();
    var earliestDue = null;
    STATE.receipts.forEach(function(r){
      if(r.cancelled || r.supplierId!==supplierId || !(Number(r.payableAmount||0)>0) || !r.dueDate || !(r.dueDate<today)) return;
      if(earliestDue===null || r.dueDate<earliestDue) earliestDue = r.dueDate;
    });
    STATE.equipmentReceipts.forEach(function(r){
      if(r.cancelled || r.supplierId!==supplierId || !(Number(r.payableAmount||0)>0) || !r.dueDate || !(r.dueDate<today)) return;
      if(earliestDue===null || r.dueDate<earliestDue) earliestDue = r.dueDate;
    });
    if(!earliestDue) return 0;
    return -daysDiff(earliestDue);
  }
  function financeStats(){
    var finItems = STATE.items.filter(function(it){ return it.itemType==="mahsulot" || it.itemType==="yarim_tayyor"; });
    var finishedCount = 0, finishedSum = 0, finishedGoodsList = [];
    finItems.forEach(function(it){
      var q = totalStockQty(it.id);
      if(q>0) finishedCount++;
      finishedSum += q*Number(it.price||0);
      finishedGoodsList.push({id:it.id, name:it.name, unit:it.unit, qty:q, sum:q*Number(it.price||0)});
    });
    finishedGoodsList.sort(function(a,b){ return b.qty-a.qty || (a.name||"").localeCompare(b.name||""); });
    var monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    var salesThisMonth = STATE.sales.filter(function(s){ var d=new Date(s.date||s.createdAt); return !isNaN(d) && d>=monthStart && !s.cancelled; }).reduce(function(sum,s){return sum+Number(s.totalWithVat||0);},0);
    /* "Харажатлар суммаси" — шу ойдаги барча касса чиқими (бекор
       қилинганлар ҳисобга олинмайди), худди "Пул оқими" ҳисоботидаги
       умумий чиқим мантиғи каби, лекин фақат жорий ой кесимида. */
    var expensesThisMonth = STATE.cashTransactions.filter(function(t){
      var d = new Date(t.date||t.createdAt);
      return t.direction==="chiqim" && !t.cancelled && !isNaN(d) && d>=monthStart;
    }).reduce(function(sum,t){return sum+Number(t.amount||0);},0);
    var bestMap = {};
    STATE.sales.forEach(function(s){ if(s.cancelled) return; (s.items||[]).forEach(function(it){
      if(!bestMap[it.itemId]) bestMap[it.itemId]={name:it.name, qty:0, revenue:0};
      bestMap[it.itemId].qty += Number(it.qty)||0; bestMap[it.itemId].revenue += Number(it.lineTotal)||0;
    }); });
    var bestSellers = Object.keys(bestMap).map(function(k){return bestMap[k];}).sort(function(a,b){return b.revenue-a.revenue;}).slice(0,5);
    var custMap = {};
    STATE.sales.forEach(function(s){
      if(!s.customerId || s.cancelled) return;
      if(!custMap[s.customerId]) custMap[s.customerId]={name:s.customerName, spend:0};
      custMap[s.customerId].spend += Number(s.totalWithVat||0);
    });
    var topCustomers = Object.keys(custMap).map(function(k){return custMap[k];}).sort(function(a,b){return b.spend-a.spend;}).slice(0,10);
    /* Муддати ўтган қарздорлар — ҳар бир мижоз/таъминотчи учун суммадан
       ТАШҚАРИ, берилган муддатнинг ЎЗИНИ (энг эрта муддати ўтгани) ва неча
       кун кечикканини ҳам қайтаради (2026-10-01 дашборд сўровига кўра). */
    function overdueEarliest(dates){
      if(!dates.length) return null;
      var earliest = dates.reduce(function(a,b){ return b<a?b:a; });
      return { dueDate:earliest, days:-daysDiff(earliest) };
    }
    var today = todayISO();
    var overdueDebtors = STATE.customers.map(function(c){
      var dd = STATE.sales.filter(function(s){ return s.customerId===c.id && !s.cancelled && Number(s.debtAmount||0)>0 && s.dueDate && s.dueDate<today; }).map(function(s){return s.dueDate;});
      var info = overdueEarliest(dd);
      if(!info) return null;
      return { name:c.name, overdue:customerOverdueDebt(c.id), dueDate:info.dueDate, days:info.days };
    }).filter(Boolean).sort(function(a,b){return b.overdue-a.overdue;});
    var overdueSuppliers = STATE.suppliers.map(function(s){
      var dd = STATE.receipts.filter(function(r){ return r.supplierId===s.id && Number(r.payableAmount||0)>0 && r.dueDate && r.dueDate<today; }).map(function(r){return r.dueDate;})
        .concat(STATE.equipmentReceipts.filter(function(r){ return r.supplierId===s.id && Number(r.payableAmount||0)>0 && r.dueDate && r.dueDate<today; }).map(function(r){return r.dueDate;}));
      var info = overdueEarliest(dd);
      if(!info) return null;
      return { name:s.name, overdue:supplierOverduePayable(s.id), dueDate:info.dueDate, days:info.days };
    }).filter(Boolean).sort(function(a,b){return b.overdue-a.overdue;});
    return {
      finishedCount:finishedCount, finishedSum:finishedSum, finishedGoodsList:finishedGoodsList,
      salesThisMonth:salesThisMonth, expensesThisMonth:expensesThisMonth,
      bestSellers:bestSellers, topCustomers:topCustomers,
      overdueDebtors:overdueDebtors, overdueSuppliers:overdueSuppliers
    };
  }

  /* 2026-10-01 сўровига кўра бошқарув панели тўлиқ қайта қурилди: энди
     фақат 7 та аниқ белгиланган блокдан иборат (касса қолдиғи, тайёр
     маҳсулот қолдиғи, кам қолган материаллар, сўнгги бажарилмаган
     буюртмалар, муддати ўтган қарздорлар — иккала томон ҳам, топ-10
     мижоз, бир ойлик савдо/харажат/фойда) — эски "созлаш" (виджетларни
     ёқиб-ўчириш) тизими олиб ташланди, чунки энди таркиб қатъий белгилаб
     қўйилган. */
  function viewDashboardOverall(){
    setTopbar("Бошқарув панели — умумий", todayLabel(), '<button class="btn btn-secondary" id="dashBackBtn">'+ICONS.arrowLeft+'Цехлар</button>');
    var fin = financeStats();
    var lowMaterials = STATE.items.filter(function(it){ return it.itemType==="xomashyo" && totalStockQty(it.id) <= Number(it.minQuantity||0); }).map(function(it){
      return { name:it.name, unit:it.unit, qty:totalStockQty(it.id) };
    });
    var unfinishedOrders = STATE.orders.filter(function(o){ return !o.completed && !o.cancelled; })
      .sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    void fin; void lowMaterials;

    var html = '';
    html += sampleBanner();

    /* 2026-10-23 (3-сўров) бўйича «Умумий кўриниш» қайта қурилди:
       касса қолдиғи, қарздорлик жадваллари, ТОП-10 мижоз ва график
       олиб ташланди; тайёр маҳсулот ва кам қолган материаллар барча
       категориялар бўйича; молиявий натижа Ҳисобот бўлимидан; пастда
       Молия бўлимидаги фойда тақсимоти. */

    /* 1) Тайёр маҳсулот қолдиғи — барча категориялардаги тайёр маҳсулот
       ва товарлар. */
    var fgAll = dwFinishedAll();
    html += '<div class="section"><div class="section-head"><h2>Тайёр маҳсулот қолдиғи</h2><span class="hint" data-goto="warehouse" style="cursor:pointer;">Омборлар → Ҳисобот '+ICONS.arrowRight+'</span></div>'+
      (fgAll.length ? '<div class="table-wrap table-frozen"><table><thead><tr><th>Маҳсулот номи</th><th>Категория</th><th>Тури</th><th class="num">Қолдиқ</th>'+
        '<th class="num">Йил бошидан</th><th class="num">Ой бошидан</th><th class="num">Кечаги</th></tr></thead><tbody>'+
        fgAll.map(function(g){
          var cs = g.low ? ' style="color:var(--critical);font-weight:800;"' : '';
          return '<tr><td class="cell-strong"'+cs+'>'+esc(g.name)+'</td>'+
            '<td class="cell-muted">'+esc(g.cat)+'</td>'+
            '<td>'+itemTypeChip(g.itemType)+'</td>'+
            '<td class="num"'+cs+'>'+fmtNum(g.qty)+' '+esc(g.unit)+'</td>'+
            '<td class="num">'+fmtNum(g.yearQty)+'</td>'+
            '<td class="num">'+fmtNum(g.monthQty)+'</td>'+
            '<td class="num">'+fmtNum(g.yestQty)+'</td></tr>';
        }).join("")+
        '</tbody></table></div>'+
        '<div class="field-hint" style="margin-top:8px;">«Йил бошидан», «Ой бошидан» ва «Кечаги» — шу давр ичида ишлаб чиқарилган жами сони. Минимал захирадан кам қолган маҳсулот қизил кўринади.</div>'
        : emptyState("Ҳали тайёр маҳсулот йўқ","Ишлаб чиқариш амалга оширилгач, шу ерда кўринади."))+
      '</div>';

    /* 2) Кам қолган материаллар — сони кўринади, устига босилса рўйхат
       очилади (барча категориялардаги хомашё ва ярим тайёр маҳсулот). */
    var lowAll = dwLowRawList();
    html += '<div class="section"><div class="section-head"><h2>Кам қолган материаллар</h2></div>'+
      '<div class="card" style="padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">'+
        '<div><div style="font-weight:800;font-size:14px;'+(lowAll.length?'color:var(--critical);':'')+'">'+
          (lowAll.length?('Тугаган ва кам қолган: '+lowAll.length+' та'):'Барча материаллар етарли даражада ✓')+'</div>'+
        '<div class="field-hint">Барча категориялардаги хомашё ва ярим тайёр маҳсулотлар.</div></div>'+
        '<button type="button" class="btn '+(lowAll.length?"btn-primary":"btn-secondary")+'" id="dashLowRawBtn">'+ICONS.box+'Рўйхатни кўриш</button>'+
      '</div></div>';

    /* 3) Сўнгги (бажарилмаган) буюртмалар — барча цех/категориялар бўйича. */
    html += '<div class="section"><div class="section-head"><h2>Сўнгги буюртмалар</h2><span class="hint" data-goto="orders" style="cursor:pointer;">Барчасини кўриш '+ICONS.arrowRight+'</span></div>'+
      (unfinishedOrders.length ? ordersTable(unfinishedOrders, true) : emptyState("Бажарилмаган буюртма йўқ","Барча буюртмалар якунланган ✓"))+
      '</div>';

    /* 4) Молиявий натижа — Ҳисобот бўлимидаги ёпилган ойлардан:
       йил бошидан ва ўтган ой. */
    html += '<div class="section"><div class="section-head"><h2>Молиявий натижа</h2>'+
      '<span class="hint" data-goto="hisobot" style="cursor:pointer;">Ҳисобот бўлими '+ICONS.arrowRight+'</span></div>'+
      dwFinResultHtml(null)+'</div>';

    /* 5) Фойда тақсимоти — Молия бўлимидаги БАРЧА категориялар фойдаси
       жамланиб, тақсимот турлари бўйича кўрсатилади. */
    var dashFinRes = finCompute();
    var dashAc = dashFinRes.accs[FIN_ALL_ACC] || finBlankAcc();
    var dashProf = dwProfitBaseAll(dashAc);
    html += '<div class="section"><div class="section-head"><h2>Фойда тақсимоти</h2>'+
      '<span class="hint" data-goto="moliya" style="cursor:pointer;">Молия бўлими '+ICONS.arrowRight+'</span></div>'+
      dwProfitDistHtml(dashProf.base, dashProf.reserve, "Барча категориялар жамланган. ")+'</div>';

    var root = document.getElementById("content");
    root.innerHTML = html;
    wireSampleBanner(root);
    var g = root.querySelector('[data-goto="orders"]');
    if(g) g.addEventListener("click", function(){ STATE.view="orders"; render(); });
    var gw = root.querySelector('[data-goto="warehouse"]');
    if(gw) gw.addEventListener("click", function(){ STATE.view="warehouse"; STATE.whView="stock"; render(); });
    var gh = root.querySelector('[data-goto="hisobot"]');
    if(gh) gh.addEventListener("click", function(){ STATE.view="hisobot"; STATE.hisobotCatId=""; render(); window.scrollTo(0,0); });
    var gm = root.querySelector('[data-goto="moliya"]');
    if(gm) gm.addEventListener("click", function(){ STATE.view="moliya"; render(); window.scrollTo(0,0); });
    var lowBtn2 = root.querySelector("#dashLowRawBtn");
    if(lowBtn2) lowBtn2.addEventListener("click", openDwLowRawModal);
    var dashBack = document.getElementById("dashBackBtn");
    if(dashBack) dashBack.addEventListener("click", function(){ STATE.dashWs=""; render(); window.scrollTo(0,0); });
    wireOrderRowButtons(root);
  }

