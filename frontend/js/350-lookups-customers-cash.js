  /* ================= lookups: customers / cash ================= */
  function customerById(id){ return STATE.customers.find(function(x){return x.id===id;}); }
  function customerName(id){ var c=customerById(id); return c?c.name:"—"; }
  function resolveCustomerByName(name){
    name = (name||"").trim().toLowerCase();
    if(!name) return null;
    return STATE.customers.find(function(c){ return (c.name||"").trim().toLowerCase()===name; }) || null;
  }
  function cashAccountById(id){ return STATE.cashAccounts.find(function(x){return x.id===id;}); }
  function cashAccountName(id){ var a=cashAccountById(id); return a?a.name:"—"; }
  /* ===== Харидор тўловини сотувлар бўйича "эскисидан бошлаб" тақсимлаш
     (2026-10-15 сўровига кўра) =====
     Харидор кассага қанча пул ташлаган бўлса (Касса → Кирим, қарз тўлови,
     сотув пайтидаги тўлов — ҳаммаси касса кирими сифатида ёзилади), шу
     сумма унинг сотувларига ЭНГ ЭСКИСИДАН бошлаб (рўйхатда пастдан
     тепага қараб) тақсимланади. Шунга кўра ҳар бир сотувнинг ҳолати
     "Тўланди / Қисман қарздор / Қарздор" бўлиб, барча қарз қопланиб
     ортиқча пул қолса — энг охирги сотувда "Ҳақдор — ортиқча тўланди"
     кўринади. Ҳолат ҲИСОБЛАНАДИ (базада сақланмайди), шунинг учун
     кассадаги ҳар қандай кирим дарҳол шу ерда ҳам кўринади. */
  function customerCashPaidTotal(customerId, customerName){
    var sum = 0;
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled || t.direction!=="kirim") return;
      if(t.counterpartyType!=="customer") return;
      var match = t.counterpartyId
        ? (t.counterpartyId===customerId)
        : (!!customerName && String(t.counterpartyName||"").trim()===String(customerName).trim());
      if(!match) return;
      sum += finTxSom(t);
    });
    return sum;
  }
  var SALE_PAY_CACHE = null;
  function salePaymentMap(){
    if(SALE_PAY_CACHE) return SALE_PAY_CACHE;
    var map = {}, byCust = {};
    STATE.sales.forEach(function(s){
      if(s.cancelled) return;
      var key = s.customerId || ("name:"+String(s.customerName||"—").trim());
      if(!byCust[key]) byCust[key] = [];
      byCust[key].push(s);
    });
    Object.keys(byCust).forEach(function(key){
      var list = byCust[key].slice().sort(function(a,b){
        return String(a.date||(a.createdAt||"").slice(0,10)).localeCompare(String(b.date||(b.createdAt||"").slice(0,10)))
            || String(a.createdAt||"").localeCompare(String(b.createdAt||""));
      });
      var isName = key.indexOf("name:")===0;
      var pool = isName ? customerCashPaidTotal("", key.slice(5)) : customerCashPaidTotal(key, (list[0]||{}).customerName||"");
      list.forEach(function(s){
        var total = Number(s.totalWithVat)||0;
        var alloc = Math.max(0, Math.min(pool, total));
        pool -= alloc;
        map[s.id] = {total:total, paid:alloc, remaining:Math.max(0, total-alloc), over:0};
      });
      if(pool>0.009 && list.length) map[list[list.length-1].id].over = pool;
    });
    SALE_PAY_CACHE = map;
    return map;
  }
  function salePayInfo(s){
    if(!s) return {total:0, paid:0, remaining:0, over:0};
    return salePaymentMap()[s.id] || {total:Number(s.totalWithVat)||0, paid:Number(s.paidAmount)||0, remaining:Number(s.debtAmount)||0, over:0};
  }
  function customerDebt(customerId){
    var m = salePaymentMap(), sum = 0;
    STATE.sales.forEach(function(s){
      if(s.cancelled || s.customerId!==customerId) return;
      var p = m[s.id]; if(!p) return;
      sum += p.remaining;
    });
    return sum;
  }
  function customerAdvanceLive(customerId){
    var m = salePaymentMap(), sum = 0;
    STATE.sales.forEach(function(s){
      if(s.cancelled || s.customerId!==customerId) return;
      var p = m[s.id]; if(!p) return;
      sum += p.over;
    });
    return sum;
  }
  function customerOverdueDebt(customerId){
    var m = salePaymentMap();
    var today = todayISO();
    return STATE.sales.filter(function(s){return s.customerId===customerId && !s.cancelled && (m[s.id]?m[s.id].remaining:0)>0 && s.dueDate && s.dueDate<today;}).reduce(function(sum,s){return sum+Number(s.debtAmount||0);},0);
  }
  /* Мижознинг муддати ўтган қарзлари орасида ЭНГ ЭРТА (яъни энг узоқ вақтдан
     бери) муддати ўтган савдонинг муддатидан бугунги кунгача неча кун
     ўтганини қайтаради — Бошқарув панелидаги "Муддати ўтган қарздорлар"
     рўйхатида суммадан олдин кўрсатиладиган "муддати" (неча кун кечикди)
     учун ишлатилади. Муддати ўтган савдоси йўқ бўлса — 0. */
  function customerOverdueDays(customerId){
    var today = todayISO();
    var earliestDue = null;
    STATE.sales.forEach(function(s){
      if(s.customerId!==customerId || s.cancelled || !(Number(s.debtAmount||0)>0) || !s.dueDate || !(s.dueDate<today)) return;
      if(earliestDue===null || s.dueDate<earliestDue) earliestDue = s.dueDate;
    });
    if(!earliestDue) return 0;
    return -daysDiff(earliestDue);
  }
  function totalDebt(){ return STATE.customers.reduce(function(sum,c){return sum+customerDebt(c.id);},0); }
  function totalOverdueDebt(){ return STATE.customers.reduce(function(sum,c){return sum+customerOverdueDebt(c.id);},0); }
  /* Мижоз шартномалари — ҳар бир мижоз учун бир нечта шартнома рақами ва
     санаси сақланиши мумкин (Савдо формасида "+" орқали қўшилади), шу
     мижоз билан кейинги сотувларда рўйхатдан танлаш учун (2026-10-03
     Савдо формаси сўровига кўра қўшилди). */
  function customerContracts(customerId){
    var c = customerById(customerId);
    return (c && c.contracts) || [];
  }
  function addCustomerContract(customerId, number, date){
    var c = customerById(customerId);
    if(!c) return;
    var list = (c.contracts||[]).slice();
    list.push({number:number||"", date:date||""});
    dbUpdate("customers", c.id, {contracts:list}, STATE.customers);
  }
  /* Сотув тартиб рақами — оддий кетма-кет сон (1,2,3…), яратишда автомат
     қўйилади, лекин фойдаланувчи қўлда ўзгартириши мумкин (2026-10-03
     сўровига кўра). */
  function nextSaleNumber(){
    var max = 0;
    STATE.sales.forEach(function(s){ var n=Number(s.saleNumber)||0; if(n>max) max=n; });
    return max+1;
  }
  /* Сотув бўйича қарз ҳолати — "Сотувлар" рўйхатида (renderSalesList)
     кўрсатиш учун: "Тўланди" (тўлиқ тўланган — муддатидан олдин тўлаб
     қўйган бўлса ҳам), "Қисман қарздор" (қисман тўланган), ёки ҳали
     умуман тўланмаган бўлса — муддатига қараб "Қарздор, тўловга N кун
     қолди" / "Қарздор, тўлов N кунга кечикди" (муддат киритилмаган бўлса
     — шунчаки "Қарздор"). (2026-10-03 Савдо формаси қайта қурилиши
     сўровига кўра — қаранг: orderDaysLabel'даги ўхшаш мантиқ.) */
  function saleDebtDaysLabel(s){
    if(!s.dueDate) return "";
    var d = daysDiff(s.dueDate);
    return d>=0 ? (", тўловга "+d+" кун қолди") : (", тўлов "+(-d)+" кунга кечикди");
  }
  function saleStatusInfo(s){
    if(s.cancelled) return {label:"Бекор қилинган", chip:"chip-neutral"};
    var p = salePayInfo(s);
    if(p.over>0.009) return {label:"Ҳақдор — ортиқча тўланди: "+fmtSum(p.over), chip:"chip-accent"};
    if(p.remaining<=0.009) return {label:"Тўланди — қарз мавжуд эмас", chip:"chip-good"};
    if(p.paid>0.009) return {label:"Қисман қарздор — қолди: "+fmtSum(p.remaining), chip:"chip-warning"};
    var overdue = !!(s.dueDate && s.dueDate<todayISO());
    return {label:"Қарздор — "+fmtSum(p.remaining)+saleDebtDaysLabel(s), chip: overdue?"chip-critical":"chip-warning"};
  }
  /* Савдо шаклидаги "Буюртма рақами" танлов ойнаси — ФАҚАТ танланган
     харидорга тегишли (ҳали якунланмаган, бекор қилинмаган) буюртмалар
     рўйхати; ҳар бир қатор ёнида кўзча — буюртма таркибини (маҳсулотлар,
     миқдори, нархи, чегирмаси) ёпмасдан кўриш имкони (2026-10-03 Савдо
     формаси қайта қурилиши — "харидорни танлагандан кеийн ёнидан
     Буюртма рақамини танлаш катаги куринсин ... буюртмалар ёнидан
     кузчани босиш оркали буюртмани ичини куриш имкони булсин" сўровига
     кўра). onCancel — қаранг: openOrderCustomerPickerModal'даги худди
     шундай изоҳ (× / Esc / "Ёпиш" фақат шу ойнани ёпиб, Савдо шаклига
     қайтаради, бутун жараённи йўқотмайди). */
  function openSaleOrderPickerModal(customerId, onPicked, onCancel){
    var body = personSelectSearchBoxHtml("sop-search")+
      '<div id="sop-list" style="max-height:420px;overflow-y:auto;margin-top:8px;"></div>';
    var m = openModal("Буюртмани танлаш", body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', true, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    function renderList(){
      var pool = STATE.orders.filter(function(o){ return o.customerId===customerId && !o.cancelled && !o.completed; })
        .slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
      var listEl = m.querySelector("#sop-list");
      if(!pool.length){ listEl.innerHTML = emptyState("Буюртма топилмади","Бу харидорнинг ҳали якунланмаган буюртмаси йўқ — аввал «Харидор буюртмаси» бўлимида буюртма яратинг."); return; }
      listEl.innerHTML = pool.map(function(o){
        var itemRows = orderItemsList(o).map(function(it){
          return '<tr><td>'+esc(it.product)+'</td><td class="num">'+fmtNum(it.quantity)+' '+esc(it.unit||"")+'</td><td class="num">'+fmtSum(it.price)+'</td><td class="num">'+(Number(it.discountPct)||0)+'%</td><td class="num cell-strong">'+fmtSum(it.totalAmount)+'</td></tr>';
        }).join("");
        return '<div class="ocp-row" data-order="'+o.id+'" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;">'+
          '<div style="flex:1;min-width:0;"><div style="font-weight:700;">'+esc(o.orderNumber)+'</div><div class="cell-muted" style="font-size:12px;">'+orderProductSummary(o)+' · '+fmtDateShort(o.date)+'</div></div>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-order-eye="'+o.id+'" title="Таркибини кўриш">'+ICONS.eye+'</button>'+
          '</div>'+
          '<div class="ocp-detail" data-order-detail="'+o.id+'" hidden style="padding:0 12px 12px;font-size:12.5px;color:var(--ink-2);background:var(--surface-2);">'+
            '<div class="table-wrap"><table><thead><tr><th>Маҳсулот</th><th>Миқдор</th><th>Нарх</th><th>Чегирма</th><th>Якуний сумма</th></tr></thead><tbody>'+itemRows+'</tbody></table></div>'+
          '</div>';
      }).join("");
      listEl.querySelectorAll(".ocp-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var o = orderById(rowEl.getAttribute("data-order"));
          if(!o) return;
          closeModal();
          onPicked(o);
        });
      });
      listEl.querySelectorAll("[data-order-eye]").forEach(function(btn){
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          var det = listEl.querySelector('[data-order-detail="'+btn.getAttribute("data-order-eye")+'"]');
          if(det) det.hidden = !det.hidden;
        });
      });
      var q = (m.querySelector("#sop-search").value||"").trim().toLowerCase();
      if(q){
        listEl.querySelectorAll(".ocp-row").forEach(function(rowEl){
          var show = (rowEl.textContent||"").toLowerCase().indexOf(q)>-1;
          rowEl.style.display = show ? "" : "none";
          var det = listEl.querySelector('[data-order-detail="'+rowEl.getAttribute("data-order")+'"]');
          if(det && !show) det.hidden = true;
        });
      }
    }
    m.querySelector("#sop-search").addEventListener("input", renderList);
    renderList();
  }
  /* Савдо шаклидаги "Омбор (қаердан сотилади)" катаги энди танлов ойнаси
     орқали ишлайди (функцияси ўзгармайди — фақат кўриниши) — агар
     "Тайёр маҳсулот омбори" (w.isFinishedGoods) белгиланган омбор
     танланса, дарҳол шу ойна ичида қайси цехдан сотилаётгани (даромад
     тегишли цехга ёзилиши учун) ҳам сўралади (2026-10-03 сўровига кўра:
     "Таёр махсулот омборига босганда Токар цех, ёки Радиатор цех, ёки
     Катёл цех деб танласин"). STATE.workshops — "Цехлар" бўлимидаги
     рўйхат (фойдаланувчининг ўзи яратган номлар; мисолдаги номлар шу
     ердан келади). */
  function openSaleWarehousePickerModal(selectedWhId, onPicked, onCancel){
    var step = "wh"; // "wh" | "ws"
    var chosenWh = null;
    var body = '<div id="swp-body"></div>';
    var m = openModal("Омборни танлаш", body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', true, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    function renderStep(){
      var bodyEl = m.querySelector("#swp-body");
      if(step==="wh"){
        m.querySelector("h3").textContent = "Омборни танлаш";
        bodyEl.innerHTML = '<div class="table-wrap"><table><tbody>'+
          STATE.warehouses.map(function(w){
            return '<tr class="ocp-row" data-wh="'+w.id+'" style="cursor:pointer;"><td class="cell-strong">'+esc(w.name)+(w.isFinishedGoods?' <span class="chip chip-accent" style="margin-left:6px;">Тайёр маҳсулот</span>':'')+(selectedWhId===w.id?' <span class="chip chip-good" style="margin-left:6px;">Танланган</span>':'')+'</td></tr>';
          }).join("")+'</tbody></table></div>';
        bodyEl.querySelectorAll("[data-wh]").forEach(function(rowEl){
          rowEl.addEventListener("click", function(){
            var w = warehouseById(rowEl.getAttribute("data-wh"));
            if(!w) return;
            if(w.isFinishedGoods && STATE.workshops.length){ chosenWh = w; step = "ws"; renderStep(); return; }
            closeModal();
            onPicked(w, null);
          });
        });
      } else {
        m.querySelector("h3").textContent = "Қайси цехдан сотилмоқда?";
        bodyEl.innerHTML = '<div class="field-hint" style="margin-bottom:10px;">«'+esc(chosenWh.name)+'» — тайёр маҳсулот омбори. Даромад тўғри цехга ёзилиши учун цехни танланг.</div>'+
          '<div class="table-wrap"><table><tbody>'+
          STATE.workshops.slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}).map(function(ws){
            return '<tr class="ocp-row" data-ws="'+ws.id+'" style="cursor:pointer;"><td class="cell-strong">'+esc(ws.name)+'</td></tr>';
          }).join("")+'</tbody></table></div>'+
          '<button type="button" class="btn btn-secondary btn-sm" id="swp-back" style="margin-top:10px;">← Орқага: омборлар рўйхати</button>';
        bodyEl.querySelectorAll("[data-ws]").forEach(function(rowEl){
          rowEl.addEventListener("click", function(){
            var ws = workshopById(rowEl.getAttribute("data-ws"));
            closeModal();
            onPicked(chosenWh, ws||null);
          });
        });
        bodyEl.querySelector("#swp-back").addEventListener("click", function(){ step="wh"; renderStep(); });
      }
    }
    renderStep();
  }
