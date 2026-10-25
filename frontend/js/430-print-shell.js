  /* ================= печат ҳужжати умумий қобиғи ================= */
  /* Барча чоп этиладиган ҳужжатлар (касса ордери, табел, иш ҳақи ведомости)
     шу ягона "бланк"дан фойдаланади — рамка, sarlavha va чоп этилган сана
     ҳамма жойда бир хил, креатив ва расмий ҳужжатга ўхшаб кўринади. */
  function voucherShell(title, subHtml, bodyHtml, wide){
    /* `wide` одатда true/false, лекин алоҳида CSS класс керак бўлганда
       (масалан, кўп устунли жадваллар учун "xwide") тўғридан-тўғри
       матн (класс номи) сифатида ҳам узатилиши мумкин. */
    var wideClass = wide===true ? " wide" : (typeof wide==="string" && wide ? " "+wide : "");
    return '<div class="voucher'+wideClass+'">'+
      '<div class="voucher-head"><div class="voucher-brand">Ишлаб чиқариш — бошқарув маркази</div><h2>'+esc(title)+'</h2><div class="v-sub">'+subHtml+'</div></div>'+
      '<div class="voucher-body">'+bodyHtml+
        '<div class="v-foot"><span>Чоп этилган сана: '+fmtDateShort(todayISO())+'</span><span>Ҳужжат тизимда автоматик шакллантирилди</span></div>'+
      '</div></div>';
  }
  /* Касса кирим/чиқим чеки (ордер). A4 саҳифага мўлжалланган — оддий
     (кенгайтирилмаган) воучер ўлчамида, шунда масштаб катталашиб
     кетмайди (2026-10-17). */
  function printCashVoucher(label, acc, t){
    var methodsHtml;
    if(t.methods && t.methods.length){
      methodsHtml = t.methods.map(function(mm){
        var val = isUsdMethod(mm.method)
          ? (fmtUsd(mm.usdAmount)+" · курс "+fmtNum(mm.usdRate)+" → "+fmtSum(mm.amount))
          : fmtSum(mm.amount);
        return '<tr><td>'+esc(paymentMethodLabel(mm.method))+'</td><td style="text-align:right;">'+esc(val)+'</td></tr>';
      }).join("");
    } else {
      methodsHtml = '<tr><td>'+esc(cashCategoryLabel(t.category))+'</td><td style="text-align:right;">'+fmtSum(t.amount)+'</td></tr>';
    }
    var body = '<table>'+
      '<tr><td>Ҳужжат рақами</td><td style="text-align:right;">'+(t.docNumber?esc(String(t.docNumber)):"—")+(Number(t.version)>1?(" · "+t.version+"-версия"):"")+'</td></tr>'+
      '<tr><td>Сана</td><td style="text-align:right;">'+esc(fmtDate(t.date||(t.createdAt||"").slice(0,10)))+'</td></tr>'+
      '<tr><td>Касса</td><td style="text-align:right;">'+esc(acc?acc.name:"Умумий касса")+'</td></tr>'+
      (t.categoryId ? '<tr><td>Категория</td><td style="text-align:right;">'+esc(kassaCategoryName(t.categoryId))+'</td></tr>' : '')+
      (t.bucket ? '<tr><td>Харажат тури</td><td style="text-align:right;">'+esc(finBucketName(t.bucket))+'</td></tr>' : '')+
      '<tr><td>Контрагент</td><td style="text-align:right;">'+esc(t.counterpartyName||"—")+'</td></tr>'+
      '<tr><td>Кассир</td><td style="text-align:right;">'+esc(t.cashier||"—")+'</td></tr>'+
      '<tr><td colspan="2" style="font-weight:700;background:#f4f5f7;">Тўлов усуллари</td></tr>'+
      methodsHtml+
      '<tr><td>Изоҳ</td><td style="text-align:right;">'+esc(t.description||"—")+'</td></tr>'+
      (t.vatSum>0 ? '<tr><td>Нарх (ҚҚСсиз)</td><td style="text-align:right;">'+fmtSum(t.amount)+'</td></tr><tr><td>ҚҚС ('+fmtNum(t.vatRate||0)+'%)</td><td style="text-align:right;">'+fmtSum(t.vatSum)+'</td></tr>' : '')+
      '</table>'+
      (t.cancelled ? '<div class="v-total" style="color:#b23;">БЕКОР ҚИЛИНГАН</div>' : '')+
      '<div class="v-total">Жами'+(t.vatSum>0?" (ҚҚС билан)":"")+': '+fmtSum((Number(t.amount)||0)+(Number(t.vatSum)||0))+'</div>'+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell(label+" ордери", "Касса: "+esc(acc?acc.name:"Умумий касса")+" · Сана: "+esc(fmtDateShort(t.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function kassaTxLabel(t){ return (t && t.direction==="kirim") ? "Кирим" : "Чиқим"; }
  function printKassaTx(t){
    if(!t) return;
    printCashVoucher(kassaTxLabel(t), cashAccountById(t.cashAccountId), t);
  }
  /* «Кўзча» — амалнинг ичини кўриш: барча майдонлар, тўлов усуллари ва
     (агар таҳрирланган бўлса) версиялар тарихи (2026-10-17). */
  function kassaTxVersionChain(t){
    var chain = [], seen = {}, cur = t, guard = 0;
    while(cur && !seen[cur.id] && guard++ < 30){
      seen[cur.id] = true;
      chain.push(cur);
      var pid = cur.prevVersionId;
      cur = pid ? STATE.cashTransactions.find(function(x){ return x.id===pid; }) : null;
    }
    return chain;
  }
  function openKassaTxDetail(t){
    if(!t) return;
    var acc = cashAccountById(t.cashAccountId);
    var isK = t.direction==="kirim";
    var st = t.cancelled
      ? '<span class="chip chip-critical">Бекор қилинган</span>'
      : '<span class="chip chip-good">Бажарилган</span>';
    var methodsRows = (t.methods && t.methods.length)
      ? t.methods.map(function(mm){
          var val = isUsdMethod(mm.method)
            ? (fmtUsd(mm.usdAmount)+" · курс "+fmtNum(mm.usdRate)+" → "+fmtSum(mm.amount))
            : fmtSum(mm.amount);
          return '<tr><td class="cell-strong">'+esc(paymentMethodLabel(mm.method))+'</td><td class="num">'+esc(val)+'</td></tr>';
        }).join("")
      : '<tr><td class="cell-strong">'+esc(cashCategoryLabel(t.category))+'</td><td class="num">'+fmtSum(t.amount)+'</td></tr>';
    var row = function(k, v){ return '<div><div class="dl">'+k+'</div><div class="dd">'+v+'</div></div>'; };
    var body = '<div class="detail-grid">'+
        row("Амал тури", (isK?'<span style="color:var(--good);font-weight:800;">Кирим</span>':'<span style="color:var(--critical);font-weight:800;">Чиқим</span>'))+
        row("Ҳужжат рақами", t.docNumber?esc(String(t.docNumber)):"—")+
        row("Сана (вақти)", esc(kassaTxTimeText(t)))+
        row("Касса", esc(acc?acc.name:"Умумий касса"))+
        row("Категория", t.categoryId?esc(kassaCategoryName(t.categoryId)):"—")+
        row("Харажат тури", t.bucket?esc(finBucketName(t.bucket)):"—")+
        row("Контрагент", esc(t.counterpartyName||"—"))+
        row("Кассир", esc(t.cashier||"—"))+
        row("Ҳолати", st)+
        row("Версия", (Number(t.version)||1)+"-версия")+
      '</div>'+
      '<div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Тўлов усули</th><th class="num">Сумма</th></tr></thead><tbody>'+
        methodsRows+
      '</tbody><tfoot><tr><th>ЖАМИ</th><th class="num">'+esc(kassaTxAmountText(t))+'</th></tr></tfoot></table></div>'+
      (t.description ? '<div class="field" style="margin-top:12px;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(t.description)+'</div></div>' : '');
    var chain = kassaTxVersionChain(t);
    if(chain.length>1){
      body += '<div style="margin-top:14px;font-weight:800;font-size:13px;">Версиялар тарихи</div>'+
        '<div class="table-wrap" style="margin-top:6px;"><table><thead><tr><th>Версия</th><th>Сана</th><th class="num">Сумма</th><th>Изоҳ</th><th>Ҳолати</th></tr></thead><tbody>'+
          chain.map(function(v){
            return '<tr'+(v.id===t.id?' class="fin-row"':'')+'><td class="cell-strong">'+(Number(v.version)||1)+'</td>'+
              '<td>'+esc(fmtDateShort(v.date||(v.createdAt||"").slice(0,10)))+'</td>'+
              '<td class="num">'+esc(kassaTxAmountText(v))+'</td>'+
              '<td class="cell-muted">'+esc(v.description||"—")+'</td>'+
              '<td>'+(v.id===t.id ? '<span class="chip chip-good">жорий</span>' : '<span class="chip chip-neutral">эски версия</span>')+'</td></tr>';
          }).join("")+
        '</tbody></table></div>';
    }
    var foot = '<button class="btn btn-secondary" data-cancel>Ёпиш</button>'+
      '<button class="btn btn-secondary btn-icon" data-dprint title="Чоп этиш">'+ICONS.printer+'</button>'+
      '<button class="btn btn-primary" data-dedit>Таҳрирлаш</button>';
    var m = openModal((isK?"Кирим":"Чиқим")+" — тафсилот", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-dprint]").addEventListener("click", function(){ printKassaTx(t); });
    m.querySelector("[data-dedit]").addEventListener("click", function(){
      closeModal();
      openKassaSimpleForm(t.cashAccountId||kassaEnsureAccountId(), t.direction, t);
    });
  }

  /* "Ходимлар бўйича" (батч) иш ҳақи тўлови ҳар бир ходим учун АЛОҲИДА
     cashTransactions ёзуви яратади (бу — иш ҳақи ҳисоблаш, ҳисобот ва
     бошқа ҳисоб-китоблар учун шарт, улар ҳеч қачон бирлаштирилмайди ёки
     ўчирилмайди), лекин РЎЙХАТДА бир хил batchGroupId'га эга ёзувлар
     ягона умумий қатор сифатида кўрсатилади — токи касса рўйхати ўнлаб
     ходим қатори билан тўлиб кетмасин. */
  function groupCashLedgerList(rawList){
    var groupsMap = {}, list = [];
    rawList.forEach(function(t){
      if(t.batchGroupId){
        var g = groupsMap[t.batchGroupId];
        if(!g){
          g = { isBatch:true, id:"batch:"+t.batchGroupId, batchGroupId:t.batchGroupId, members:[], date:t.date, createdAt:t.createdAt||"" };
          groupsMap[t.batchGroupId] = g;
          list.push(g);
        }
        g.members.push(t);
        if((t.createdAt||"")>(g.createdAt||"")) g.createdAt = t.createdAt;
      } else {
        list.push(t);
      }
    });
    list.forEach(function(row){
      if(!row.isBatch) return;
      row.amount = row.members.reduce(function(s,m){return s+(Number(m.amount)||0);},0);
      row.vatSum = row.members.reduce(function(s,m){return s+(Number(m.vatSum)||0);},0);
      row.vatRate = row.members[0].vatRate||0;
      row.cancelled = row.members.every(function(m){return m.cancelled;});
      row.category = row.members[0].category;
      var mm = {};
      row.members.forEach(function(m){
        (m.methods||[]).forEach(function(x){
          mm[x.method] = mm[x.method] || {method:x.method, amount:0, usdAmount:0, usdRate:x.usdRate||0};
          mm[x.method].amount += Number(x.amount)||0;
          mm[x.method].usdAmount += Number(x.usdAmount)||0;
        });
      });
      row.methods = Object.keys(mm).map(function(k){return mm[k];});
      row.description = row.members[0].batchPeriodLabel ? ("Иш ҳақи тўлови — "+row.members[0].batchPeriodLabel) : (row.members[0].description||"—");
      row.counterpartyName = "Контрагентга иш ҳақи тўлови ("+row.members.length+" та ходим)";
    });
    /* Саналар энди ЯРАТИЛГАН вақти эмас, балки киритилган санаси (date)
       бўйича камайиш тартибида сараланади (2026-10-01 сўрови). */
    list.sort(function(a,b){
      var ad=a.date||"", bd=b.date||"";
      if(ad!==bd) return bd.localeCompare(ad);
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    return list;
  }

  function openBatchPayBreakdownModal(row){
    var rowsHtml = row.members.slice().sort(function(a,b){ return (a.counterpartyName||"").localeCompare(b.counterpartyName||""); }).map(function(m, idx){
      var methodsTxt = (m.methods||[]).map(function(mm){ return isUsdMethod(mm.method) ? (paymentMethodLabel(mm.method)+": "+fmtUsd(mm.usdAmount)) : (paymentMethodLabel(mm.method)+": "+fmtSum(mm.amount)); }).join(", ");
      return '<tr'+(m.cancelled?' style="opacity:.5;"':'')+'>'+
        '<td class="cell-muted">'+(idx+1)+'</td>'+
        '<td class="cell-strong">'+esc(m.counterpartyName||"—")+'</td>'+
        '<td class="cell-muted" style="font-size:12px;">'+esc(methodsTxt)+'</td>'+
        '<td class="num cell-strong">'+fmtSum(m.amount)+'</td>'+
        '<td>'+(m.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
        '</tr>';
    }).join("");
    var body = '<div class="field-hint" style="margin-bottom:10px;">'+esc(row.description||"")+' · Сана: '+esc(fmtDateShort(row.date))+'</div>'+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Ходим</th><th>Усуллар</th><th>Сумма</th><th>Ҳолат</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'+
      '<div class="v-total" style="margin-top:10px;">Жами: '+fmtSum(row.amount)+'</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Ёпиш</button>';
    var m2 = openModal("Тўлов таркиби — "+row.members.length+" та ходим", body, foot, true);
    m2.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }

  /* Оддий (гуруҳ бўлмаган) операция учун ФАҚАТ КЎРИШ (эди белгиси) модали —
     Таҳрирлаш билан адаштирмаслик учун алоҳида, ўзгартиришсиз кўрсатади. */
  function openCashTxViewModal(t, acc, label){
    var methodsHtml;
    if(t.methods && t.methods.length){
      methodsHtml = t.methods.map(function(mm){
        return isUsdMethod(mm.method) ? (paymentMethodLabel(mm.method)+": "+fmtUsd(mm.usdAmount)+" (курс "+fmtNum(mm.usdRate)+")") : (paymentMethodLabel(mm.method)+": "+fmtSum(mm.amount));
      }).join(", ");
    } else {
      methodsHtml = cashCategoryLabel(t.category);
    }
    var body = '<div class="table-wrap"><table>'+
      '<tr><td class="cell-muted">Сана</td><td class="cell-strong" style="text-align:right;">'+esc(fmtDateShort(t.date))+'</td></tr>'+
      '<tr><td class="cell-muted">Контрагент</td><td class="cell-strong" style="text-align:right;">'+esc(t.counterpartyName||"—")+'</td></tr>'+
      '<tr><td class="cell-muted">Тўлов усуллари</td><td style="text-align:right;">'+esc(methodsHtml)+'</td></tr>'+
      '<tr><td class="cell-muted">Изоҳ</td><td style="text-align:right;">'+esc(t.description||"—")+'</td></tr>'+
      (t.vatSum>0 ? '<tr><td class="cell-muted">ККС</td><td style="text-align:right;">'+fmtSum(t.vatSum)+' ('+fmtNum(t.vatRate||0)+'%)</td></tr>' : '')+
      '<tr><td class="cell-muted">Ҳолат</td><td style="text-align:right;">'+(t.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td></tr>'+
      '</table></div>'+
      '<div class="v-total" style="margin-top:10px;">Жами'+(t.vatSum>0?" (ККС билан)":"")+': '+fmtSum((Number(t.amount)||0)+(Number(t.vatSum)||0))+'</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Ёпиш</button>';
    var mv = openModal((label||"Операция")+" — кўриш"+(acc?(" · "+esc(acc.name)):""), body, foot, true);
    mv.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }

  /* Кирим/Чиқим рўйхатида излаш — контрагент, изоҳ ёки сумма (хом рақам
     ҳам, fmtNum кўринишидаги матн ҳам) бўйича, гуруҳ (Ходимлар бўйича)
     ёзувларида ҳар бир аъзо (ходим) исми бўйича ҳам (2026-10-01 сўрови). */
  function cashLedgerRowMatches(row, q){
    if((row.counterpartyName||"").toLowerCase().indexOf(q)>-1) return true;
    if((row.description||"").toLowerCase().indexOf(q)>-1) return true;
    if(String(row.amount||"").indexOf(q)>-1) return true;
    if(fmtNum(row.amount).toLowerCase().indexOf(q)>-1) return true;
    if(row.isBatch && row.members && row.members.some(function(m){ return (m.counterpartyName||"").toLowerCase().indexOf(q)>-1; })) return true;
    return false;
  }
  function renderKassaLedgerTab(accountId, direction){
    var acc = cashAccountById(accountId);
    var rawList = STATE.cashTransactions.filter(function(t){ return t.cashAccountId===accountId && t.direction===direction; });
    var list = groupCashLedgerList(rawList);
    var label = direction==="kirim" ? "Кирим" : "Чиқим";
    var filterState = STATE.kassaLedgerFilters[direction];
    var baseList = filterState.onlyActive!==false ? list.filter(function(x){ return !x.cancelled; }) : list;
    var info = computeFilteredDayList(baseList, filterState, cashLedgerRowMatches);
    var shownList = info.rows;
    var html = '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'+
      listToolbarHtml("kl"+direction, filterState)+
      '<div style="display:flex;gap:8px;">'+
      (direction==="chiqim" ? '<button class="btn btn-secondary" id="kl-emp-batch-btn">'+ICONS.users+'Ходимлар бўйича</button>' : '')+
      '<button class="btn btn-primary" id="kl-create-btn">'+ICONS.plus+'Яратиш</button></div></div>';
    if(!list.length){
      html += emptyState("Ҳали "+label.toLowerCase()+" йўқ","«Яратиш» тугмаси орқали биринчи ёзувни киритинг.");
    } else if(!shownList.length){
      html += emptyState("Ҳеч нарса топилмади", "Бошқа сана/матн билан қидириб кўринг ёки филтрни олиб ташланг.");
    } else {
      var rows = shownList.map(function(t){
        var methodsTxt;
        if(t.methods && t.methods.length){
          methodsTxt = t.methods.map(function(mm){ return isUsdMethod(mm.method) ? (paymentMethodLabel(mm.method)+": "+fmtUsd(mm.usdAmount)) : (paymentMethodLabel(mm.method)+": "+fmtSum(mm.amount)); }).join(", ");
        } else { methodsTxt = cashCategoryLabel(t.category); }
        return '<tr'+(t.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+fmtDateShort(t.date)+'</td>'+
          '<td class="cell-strong">'+esc(t.counterpartyName||"—")+(t.isBatch?' <span class="chip chip-accent" style="margin-left:4px;font-size:10.5px;padding:1px 6px;">гуруҳ</span>':'')+'</td>'+
          '<td class="cell-muted" style="font-size:12px;">'+esc(methodsTxt)+'</td>'+
          '<td class="cell-muted">'+esc(t.description||"—")+'</td>'+
          '<td class="num cell-strong" style="color:'+(direction==="kirim"?"var(--good)":"var(--critical)")+';">'+fmtSum(t.amount)+'</td>'+
          '<td class="num cell-muted">'+(t.vatSum>0 ? fmtSum(t.vatSum)+' ('+fmtNum(t.vatRate||0)+'%)' : '—')+'</td>'+
          '<td>'+(t.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            (t.isBatch ? ('<button class="btn btn-ghost btn-icon" data-kl-view="'+esc(t.id)+'" title="Таркибини кўриш">'+ICONS.eye+'</button>'+
                (t.cancelled?'':'<button class="btn btn-ghost btn-icon" data-kl-batch-edit="'+esc(t.id)+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')) :
              ('<button class="btn btn-ghost btn-icon" data-kl-view="'+esc(t.id)+'" title="Кўриш">'+ICONS.eye+'</button>'+
                (t.cancelled?'':'<button class="btn btn-ghost btn-icon" data-kl-edit="'+t.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')))+
            (t.cancelled?'':'<button class="btn btn-ghost btn-icon" data-kl-cancel="'+esc(t.id)+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (t.cancelled?'<button class="btn btn-ghost btn-icon" data-kl-restore="'+esc(t.id)+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-kl-print="'+esc(t.id)+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Контрагент</th><th>Усуллар</th><th>Изоҳ</th><th>Сумма</th><th>ККС</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      html += daySwitcherHtml(info);
    }
    var container = document.getElementById("kassaTabContent");
    container.innerHTML = html;
    var rerender = function(){ renderKassaLedgerTab(accountId, direction); };
    wireListToolbarAndDayPager(container, "kl"+direction, filterState, info, rerender);
    container.querySelector("#kl-create-btn").addEventListener("click", function(){ openKassaLedgerForm(accountId, direction, null); });
    var empBatchBtn = container.querySelector("#kl-emp-batch-btn");
    if(empBatchBtn) empBatchBtn.addEventListener("click", function(){ openKassaEmployeeBatchPayForm(accountId); });
    function findRow(id){ return list.find(function(x){return String(x.id)===String(id);}); }
    container.querySelectorAll("[data-kl-view]").forEach(function(b){ b.addEventListener("click", function(){
      var row = findRow(b.getAttribute("data-kl-view"));
      if(!row) return;
      if(row.isBatch) openBatchPayBreakdownModal(row);
      else openCashTxViewModal(row, acc, label);
    }); });
    container.querySelectorAll("[data-kl-edit]").forEach(function(b){ b.addEventListener("click", function(){ openKassaLedgerForm(accountId, direction, rawList.find(function(x){return x.id===b.getAttribute("data-kl-edit");})); }); });
    container.querySelectorAll("[data-kl-batch-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var row = findRow(b.getAttribute("data-kl-batch-edit"));
      if(row) openKassaEmployeeBatchPayForm(accountId, row);
    }); });
    container.querySelectorAll("[data-kl-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var row = findRow(b.getAttribute("data-kl-cancel"));
      var members = row.isBatch ? row.members : [row];
      openConfirm("Операцияни бекор қилиш","Бу "+label.toLowerCase()+(row.isBatch?(" ("+members.length+" та ходим)"):"")+" бекор қилинсинми? Ёзув тарихда сақланиб қолади, лекин касса қолдиғига энди таъсир қилмайди.","Ҳа, бекор қилиш", function(){
        /* 2026-10-03: мижоз қарзига қўлланган бўлса (debtAllocations) —
           бекор қилишда ўша қарз орқага қайтарилади (сотув яна қарздор
           ҳолатига ўтиши мумкин). */
        members.forEach(function(m){
          if(m.debtAllocations && m.debtAllocations.length) reverseCustomerDebtPayment(m.debtAllocations);
          dbUpdate("cashTransactions", m.id, {cancelled:true}, STATE.cashTransactions);
        });
        toast("Бекор қилинди");
      }, true);
    }); });
    container.querySelectorAll("[data-kl-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var row = findRow(b.getAttribute("data-kl-restore"));
      var members = row.isBatch ? row.members : [row];
      openConfirm("Операцияни тиклаш","Бу "+label.toLowerCase()+(row.isBatch?(" ("+members.length+" та ходим)"):"")+" қайта тикланиб, касса қолдиғига таъсир қила бошласинми?","Ҳа, тиклаш", function(){
        if(direction==="chiqim"){
          var needByMethod = {};
          members.forEach(function(m){
            var methodsChk = (m.methods&&m.methods.length) ? m.methods : (Number(m.amount)>0?[{method:"naqd",amount:m.amount,usdAmount:0}]:[]);
            methodsChk.forEach(function(mm){
              var val = isUsdMethod(mm.method) ? (Number(mm.usdAmount)||0) : (Number(mm.amount)||0);
              needByMethod[mm.method] = (needByMethod[mm.method]||0) + val;
            });
          });
          for(var meth in needByMethod){
            if(needByMethod[meth]<=0) continue;
            var avail = cashMethodBalance(accountId, meth);
            if(needByMethod[meth]>avail){
              toast("Тиклаб бўлмади: кассада пул етарли эмас — "+paymentMethodLabel(meth)+" бўйича қолдиқ: "+(isUsdMethod(meth)?fmtUsd(avail):fmtSum(avail)));
              return;
            }
          }
        }
        /* 2026-10-03: мижоз қарзига қўлланган бўлса — тикланганда ўша
           қарз камайтириш қайтадан қўлланади (бекор қилишда орқага
           қайтарилган худди шу суммалар билан, аниқ). */
        members.forEach(function(m){
          dbUpdate("cashTransactions", m.id, {cancelled:false}, STATE.cashTransactions);
          if(m.debtAllocations && m.debtAllocations.length) reapplyCustomerDebtPayment(m.debtAllocations);
        });
        toast("Тикланди");
      }, true);
    }); });
    container.querySelectorAll("[data-kl-print]").forEach(function(b){ b.addEventListener("click", function(){
      var row = findRow(b.getAttribute("data-kl-print"));
      printCashVoucher(label, acc, row);
    }); });
  }

  /* ---- 3) Конвертация ---- */
  function openKassaConversionForm(accountId, existing){
    var isEdit = !!(existing && existing.id);
    var c = existing || {date:todayISO(), fromMethod:"naqd", fromAmount:0, fromUsdAmount:0, fromUsdRate:STATE.lastUsdRate||0, toMethod:"karta", toAmount:0, toUsdAmount:0, toUsdRate:STATE.lastUsdRate||0, note:""};
    var body = '<div class="field"><label>Сана</label><input id="kc-date" type="date" value="'+esc(c.date||todayISO())+'"></div>'+
      '<div class="field"><label>Чиқим усули</label>'+methodTogglesHtml("kc-from",[c.fromMethod])+'</div>'+
      '<div id="kc-from-rows">'+methodAmountRowHtml("kc-from", c.fromMethod, {amount:c.fromAmount, usdAmount:c.fromUsdAmount, usdRate:c.fromUsdRate})+'</div>'+
      '<div class="field"><label>Кирим усули</label>'+methodTogglesHtml("kc-to",[c.toMethod])+'</div>'+
      '<div id="kc-to-rows">'+methodAmountRowHtml("kc-to", c.toMethod, {amount:c.toAmount, usdAmount:c.toUsdAmount, usdRate:c.toUsdRate})+'</div>'+
      /* Фойдаланувчи сўровига кўра (2026-10-17): «Корхона даромад/харажат
         ҳисобида ҳисобга олинсин» галочкаси конвертация шаклидан олиб
         ташланди. Эски ёзувлардаги bizCount қиймати ўзгаришсиз сақланади. */
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="kc-note">'+esc(c.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Конвертацияни таҳрирлаш":"Янги конвертация", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var fromMethod = c.fromMethod, toMethod = c.toMethod;
    function renderSide(side, method){
      m.querySelector("#kc-"+side+"-rows").innerHTML = methodAmountRowHtml("kc-"+side, method, {});
      if(isUsdMethod(method)) wireDollarAutoCalc("kc-"+side, method);
    }
    m.querySelectorAll('[data-methodgroup="kc-from"] .method-toggle').forEach(function(btn){
      btn.addEventListener("click", function(){
        fromMethod = btn.getAttribute("data-method");
        m.querySelectorAll('[data-methodgroup="kc-from"] .method-toggle').forEach(function(b2){ b2.classList.toggle("active", b2===btn); });
        renderSide("from", fromMethod);
      });
    });
    m.querySelectorAll('[data-methodgroup="kc-to"] .method-toggle').forEach(function(btn){
      btn.addEventListener("click", function(){
        toMethod = btn.getAttribute("data-method");
        m.querySelectorAll('[data-methodgroup="kc-to"] .method-toggle').forEach(function(b2){ b2.classList.toggle("active", b2===btn); });
        renderSide("to", toMethod);
      });
    });
    if(isUsdMethod(fromMethod)) wireDollarAutoCalc("kc-from", fromMethod);
    if(isUsdMethod(toMethod)) wireDollarAutoCalc("kc-to", toMethod);

    m.querySelector("[data-save]").addEventListener("click", function(){
      var readSide = function(prefix, method){
        if(isUsdMethod(method)) return {usdAmount:Number(m.querySelector("#"+prefix+"-usd-"+method).value)||0, usdRate:Number(m.querySelector("#"+prefix+"-rate-"+method).value)||0, amount:Number(m.querySelector("#"+prefix+"-amt-dollar").value)||0};
        return {amount:Number(m.querySelector("#"+prefix+"-amt-"+method).value)||0, usdAmount:0, usdRate:0};
      };
      var fromVals = readSide("kc-from", fromMethod), toVals = readSide("kc-to", toMethod);
      var fromQty = isUsdMethod(fromMethod) ? fromVals.usdAmount : fromVals.amount;
      var toQty = isUsdMethod(toMethod) ? toVals.usdAmount : toVals.amount;
      if(fromQty<=0 || toQty<=0){ toast("Суммаларни киритинг"); return; }
      if(fromMethod===toMethod){ toast("Чиқим ва кирим усули бир хил бўлмаслиги керак"); return; }
      if(isUsdMethod(fromMethod) && fromVals.usdRate>0) STATE.lastUsdRate = fromVals.usdRate;
      if(isUsdMethod(toMethod) && toVals.usdRate>0) STATE.lastUsdRate = toVals.usdRate;
      var data = {
        cashAccountId: accountId, date: m.querySelector("#kc-date").value||todayISO(),
        fromMethod: fromMethod, fromAmount: fromVals.amount, fromUsdAmount: fromVals.usdAmount, fromUsdRate: fromVals.usdRate,
        toMethod: toMethod, toAmount: toVals.amount, toUsdAmount: toVals.usdAmount, toUsdRate: toVals.usdRate,
        bizCount: isEdit ? !!c.bizCount : false,
        note: m.querySelector("#kc-note").value.trim(), cancelled:false
      };
      if(isEdit){ dbUpdate("cashConversions", c.id, data, STATE.cashConversions); toast("Сақланди"); }
      else { data.createdAt=new Date().toISOString(); dbAdd("cashConversions", data, STATE.cashConversions); toast("Конвертация сақланди"); }
      closeModal();
    });
  }

  function cashConvRowMatches(c, q){
    if((c.note||"").toLowerCase().indexOf(q)>-1) return true;
    if(String(c.fromAmount||"").indexOf(q)>-1 || String(c.toAmount||"").indexOf(q)>-1) return true;
    if(fmtNum(c.fromAmount).toLowerCase().indexOf(q)>-1 || fmtNum(c.toAmount).toLowerCase().indexOf(q)>-1) return true;
    if(paymentMethodLabel(c.fromMethod).toLowerCase().indexOf(q)>-1 || paymentMethodLabel(c.toMethod).toLowerCase().indexOf(q)>-1) return true;
    return false;
  }
  function renderKassaConversionTab(accountId){
    var allList = STATE.cashConversions.filter(function(c){ return c.cashAccountId===accountId; });
    var filterState = STATE.kassaConvFilter;
    var baseList = filterState.onlyActive!==false ? allList.filter(function(c){ return !c.cancelled; }) : allList;
    var info = computeFilteredDayList(baseList, filterState, cashConvRowMatches);
    var list = info.rows;
    var html = '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'+
      listToolbarHtml("kc", filterState)+
      '<button class="btn btn-primary" id="kc-create-btn">'+ICONS.plus+'Яратиш</button></div>';
    if(!allList.length){
      html += emptyState("Ҳали конвертация йўқ","«Яратиш» тугмаси орқали биринчи конвертацияни киритинг.");
    } else if(!list.length){
      html += emptyState("Ҳеч нарса топилмади", "Бошқа сана/матн билан қидириб кўринг ёки филтрни олиб ташланг.");
    } else {
      var rows = list.map(function(c){
        var fromTxt = isUsdMethod(c.fromMethod) ? fmtUsd(c.fromUsdAmount) : fmtSum(c.fromAmount);
        var toTxt = isUsdMethod(c.toMethod) ? fmtUsd(c.toUsdAmount) : fmtSum(c.toAmount);
        return '<tr'+(c.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+fmtDateShort(c.date)+'</td>'+
          '<td>'+esc(paymentMethodLabel(c.fromMethod))+' ('+fromTxt+')</td>'+
          '<td>'+ICONS.arrowRight+'</td>'+
          '<td>'+esc(paymentMethodLabel(c.toMethod))+' ('+toTxt+')</td>'+
          '<td class="cell-muted">'+esc(c.note||"—")+'</td>'+
          '<td>'+(c.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            (c.cancelled?'':'<button class="btn btn-ghost btn-icon" data-kc-edit="'+c.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (c.cancelled?'':'<button class="btn btn-ghost btn-icon" data-kc-cancel="'+c.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (c.cancelled?'<button class="btn btn-ghost btn-icon" data-kc-restore="'+c.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Чиқим</th><th></th><th>Кирим</th><th>Изоҳ</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      html += daySwitcherHtml(info);
    }
    var container = document.getElementById("kassaTabContent");
    container.innerHTML = html;
    wireListToolbarAndDayPager(container, "kc", filterState, info, function(){ renderKassaConversionTab(accountId); });
    container.querySelector("#kc-create-btn").addEventListener("click", function(){ openKassaConversionForm(accountId, null); });
    container.querySelectorAll("[data-kc-edit]").forEach(function(b){ b.addEventListener("click", function(){ openKassaConversionForm(accountId, list.find(function(x){return x.id===b.getAttribute("data-kc-edit");})); }); });
    container.querySelectorAll("[data-kc-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var c = list.find(function(x){return x.id===b.getAttribute("data-kc-cancel");});
      openConfirm("Конвертацияни бекор қилиш","Бу операция бекор қилинсинми? Ёзув тарихда қолади.","Ҳа, бекор қилиш", function(){ dbUpdate("cashConversions", c.id, {cancelled:true}, STATE.cashConversions); toast("Бекор қилинди"); }, true);
    }); });
    container.querySelectorAll("[data-kc-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var c = list.find(function(x){return x.id===b.getAttribute("data-kc-restore");});
      openConfirm("Конвертацияни тиклаш","Бу операция қайта тикланиб, касса қолдиғига таъсир қила бошласинми?","Ҳа, тиклаш", function(){ dbUpdate("cashConversions", c.id, {cancelled:false}, STATE.cashConversions); toast("Тикланди"); }, true);
    }); });
  }

  /* ---- 4) Солиштирма далолатнома (мустақил меню) ---- */
  function cashTxMethodsText(t){
    if(t.methods && t.methods.length){
      return t.methods.map(function(mm){ return isUsdMethod(mm.method) ? (paymentMethodLabel(mm.method)+" "+fmtUsd(mm.usdAmount)) : (paymentMethodLabel(mm.method)+" "+fmtSum(mm.amount)); }).join(", ");
    }
    var acc = cashAccountById(t.cashAccountId);
    return acc ? (cashAccountTypeLabel(acc.type)+" — "+(acc.name||"")) : cashAccountName(t.cashAccountId);
  }

  function openReceiptDetail(r){
    if(!r) return;
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Таъминотчи</div><div class="dd">'+esc(r.supplierName||"—")+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate((r.date||r.createdAt||"").slice(0,10))+'</div></div>'+
      '<div><div class="dl">Омбор</div><div class="dd">'+esc(warehouseName(r.warehouseId))+'</div></div>'+
      '<div><div class="dl">Тўлов муддати</div><div class="dd">'+(r.dueDate?fmtDateShort(r.dueDate):"—")+'</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Маҳсулот</th><th>Миқдор</th><th>Нарх</th><th>ККС</th><th>Жами</th></tr></thead><tbody>'+
      '<tr><td class="cell-strong">'+esc(r.itemName)+'</td><td class="num">'+fmtNum(r.quantity)+'</td><td class="num">'+fmtSum(r.priceNoVat)+'</td><td class="num">'+(r.vatSum>0?fmtSum(r.vatSum)+' ('+fmtNum(r.vatRate||0)+'%)':"—")+'</td><td class="num cell-strong">'+fmtSum(r.totalWithVat)+'</td></tr>'+
      '</tbody></table></div>'+
      '<div class="card" style="padding:16px 18px;">'+
        '<div style="display:flex;justify-content:space-between;"><span>Тўланган</span><span class="num">'+fmtSum(r.paidAmount||0)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--critical);">Қарз</span><span class="num" style="font-weight:800;color:var(--critical);">'+fmtSum(r.payableAmount||0)+'</span></div>'+
      '</div>'+
      (r.note?'<div class="field" style="margin-top:14px;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(r.note)+'</div></div>':"");
    var m = openModal("Кирим — "+esc(r.itemName), body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
  }

  /* Харидор/таъминотчини танлаш ойнаси — тугма босилганда очилади,
     рўйхатдан бирини танлаш билан ёпилиб, асосий саҳифада автоматик
     излаш ишга тушади. */
  function openActWhoPickerModal(onPicked){
    var pickType = "customer";
    var body = '<div class="seg" style="margin-bottom:12px;">'+
        '<button type="button" class="awp-type" data-type="customer">Харидор</button>'+
        '<button type="button" class="awp-type" data-type="supplier">Етказиб берувчи</button>'+
      '</div>'+
      personSelectSearchBoxHtml("awp-search")+
      '<div id="awp-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal("Харидор ёки етказиб берувчини танлаш", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);

    function renderList(){
      var list = pickType==="customer" ? STATE.customers : STATE.suppliers;
      var sorted = list.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
      var listEl = m.querySelector("#awp-list");
      if(!sorted.length){
        listEl.innerHTML = emptyState("Рўйхат бўш", pickType==="customer"?"Ҳали мижоз йўқ.":"Ҳали таъминотчи йўқ.");
        return;
      }
      listEl.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Номи</th><th>'+(pickType==="customer"?"Қарзи":"Қарзимиз")+'</th><th></th></tr></thead><tbody>'+
        sorted.map(function(p){
          var debt = pickType==="customer" ? customerDebt(p.id) : supplierPayable(p.id);
          return '<tr class="awp-row" data-id="'+p.id+'" style="cursor:pointer;"><td class="cell-strong">'+esc(p.name)+'</td><td class="num">'+fmtSum(debt)+'</td><td>'+ICONS.arrowRight+'</td></tr>';
        }).join("")+
        '</tbody></table></div>';
      listEl.querySelectorAll(".awp-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var id = rowEl.getAttribute("data-id");
          closeModal();
          onPicked(pickType, id);
        });
      });
      var q = (m.querySelector("#awp-search").value||"").trim().toLowerCase();
      if(q){
        listEl.querySelectorAll(".awp-row").forEach(function(rowEl){
          var txt = (rowEl.textContent||"").toLowerCase();
          rowEl.style.display = txt.indexOf(q)>-1 ? "" : "none";
        });
      }
    }
    m.querySelectorAll(".awp-type").forEach(function(b){
      if(b.getAttribute("data-type")===pickType) b.classList.add("active");
      b.addEventListener("click", function(){
        pickType = b.getAttribute("data-type");
        m.querySelectorAll(".awp-type").forEach(function(b2){ b2.classList.toggle("active", b2===b); });
        m.querySelector("#awp-search").value = "";
        renderList();
      });
    });
    m.querySelector("#awp-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".awp-row").forEach(function(rowEl){
        var txt = (rowEl.textContent||"").toLowerCase();
        rowEl.style.display = (!q || txt.indexOf(q)>-1) ? "" : "none";
      });
    });
    renderList();
  }

  /* Солиштирма далолатнома — танланган харидор/етказиб берувчи билан
     БАРЧА ҳаракатни (кирим: улар бизга берган нарса — пул ёки товар;
     чиким: биз уларга берган нарса — пул ёки товар) БИТТА тартибли
     рўйхатга йиғиб, сана бўйича ўсиш тартибида қайтаради. Касса
     ёзувлари учун Кирим/Чиким аниқ ўша ёзувнинг ўз йўналиши бўйича
     белгиланади (контрагент турига боғлиқ эмас — шунда масалан
     таъминотчидан қайтган пул ҳам тўғри "кирим" бўлиб кўринади).
     Давр филтри чақирувчи томонда қўлланади — бу функция ҳар доим
     ТЎЛИҚ тарихни қайтаради, шунда "давр бошига қолдиқ" ҳисобланади
     (2026-10-01 сўрови). */
  function buildActLedgerEntries(type, who){
    var entries = [];
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled) return;
      var matches = (t.counterpartyType===type && t.counterpartyId===who) ||
        (type==="customer" && t.customerId===who) ||
        (type==="supplier" && t.supplierId===who);
      if(!matches) return;
      var amt = Number(t.amount||0);
      if(!amt) return;
      var date = t.date || (t.createdAt||"").slice(0,10);
      var desc = t.description || (t.direction==="kirim"?"Тушум":"Тўлов");
      entries.push({
        date:date, createdAt:t.createdAt||"", desc:desc,
        kirim: t.direction==="kirim" ? amt : 0,
        chiqim: t.direction==="chiqim" ? amt : 0,
        _kind:"cashtx", _ref:t
      });
    });
    if(type==="supplier"){
      STATE.receipts.filter(function(r){ return !r.cancelled && r.supplierId===who; }).forEach(function(r){
        entries.push({date:(r.date||r.createdAt||"").slice(0,10), createdAt:r.createdAt||"", desc:"Товар келди — "+(r.itemName||""), kirim:Number(r.totalWithVat||0), chiqim:0, _kind:"receipt", _ref:r});
      });
      STATE.equipmentReceipts.filter(function(r){ return !r.cancelled && r.supplierId===who; }).forEach(function(r){
        entries.push({date:(r.date||r.createdAt||"").slice(0,10), createdAt:r.createdAt||"", desc:"Ускуна/жиҳоз кирими — "+(r.name||""), kirim:Number(r.totalWithVat||0), chiqim:0, _kind:"equipreceipt", _ref:r});
      });
      STATE.lomReturns.filter(function(x){ return x.supplierId===who && !x.cancelled; }).forEach(function(x){
        var lbl = (x.productType==="metal"?"Металл возврати":"Хом лом возврати")+(x.batchNumber?(" — №"+x.batchNumber):"");
        entries.push({date:x.date||(x.createdAt||"").slice(0,10), createdAt:x.createdAt||"", desc:lbl, kirim:0, chiqim:Number(x.appliedAmt!=null?x.appliedAmt:x.sum||0), _kind:"lomreturn", _ref:x});
      });
    } else {
      /* 2026-10-03 сўровига кўра: далолатномадаги сана сотувнинг ЎЗИДАГИ
         "Сана" майдонидан (s.date) олинади, createdAt'дан эмас — акс
         ҳолда сотувни таҳрирлаб санасини ўзгартирганда (ва сақлаганда)
         "Операциялар"да сана янгиланса ҳам, далолатномада эски сана
         кўриниб қолаверар эди (createdAt таҳрирлашда ўзгармайди). */
      STATE.sales.filter(function(s){ return s.customerId===who && !s.cancelled; }).forEach(function(s){
        var itemsCount = (s.items||[]).length;
        entries.push({date:s.date||(s.createdAt||"").slice(0,10), createdAt:s.createdAt||"", desc:"Сотув — "+itemsCount+" та маҳсулот", kirim:0, chiqim:Number(s.totalWithVat||0), _kind:"sale", _ref:s});
      });
    }
    entries.sort(function(a,b){
      if(a.date!==b.date) return a.date.localeCompare(b.date);
      return (a.createdAt||"").localeCompare(b.createdAt||"");
    });
    return entries;
  }
  function fmtSignedSum(n){ n = Number(n)||0; return (n>0?"+":"")+fmtSum(n); }
  function openActEntryDetail(entry){
    if(!entry) return;
    if(entry._kind==="cashtx") openCashTxViewModal(entry._ref, cashAccountById(entry._ref.cashAccountId), entry._ref.direction==="kirim"?"Кирим":"Чиқим");
    else if(entry._kind==="receipt") openReceiptDetail(entry._ref);
    else if(entry._kind==="equipreceipt") openEquipmentReceiptDetail(entry._ref);
    else if(entry._kind==="lomreturn") openLomReturnDetail(entry._ref);
    else if(entry._kind==="sale") openSaleDetail(entry._ref);
  }
  function printActStatement(type, name, from, to, entries, opening, closing, periodKirim, periodChiqim){
    var rows = entries.map(function(e){
      return '<tr><td>'+fmtDateShort(e.date)+'</td><td>'+esc(e.desc)+'</td>'+
        '<td style="text-align:right;">'+(e.kirim?('+'+fmtNum(e.kirim)):"")+'</td>'+
        '<td style="text-align:right;">'+(e.chiqim?('−'+fmtNum(e.chiqim)):"")+'</td></tr>';
    }).join("");
    var totalsRow = '<tr style="font-weight:700;"><td></td><td>Жами</td><td style="text-align:right;">+'+fmtNum(periodKirim)+'</td><td style="text-align:right;">−'+fmtNum(periodChiqim)+'</td></tr>';
    var body = '<div style="display:flex;gap:24px;margin-bottom:14px;font-size:13px;">'+
        '<div><strong>Давр бошига қолдиқ:</strong> '+fmtSignedSum(opening)+'</div>'+
        '<div><strong>Давр охирига қолдиқ:</strong> '+fmtSignedSum(closing)+'</div>'+
      '</div>'+
      '<table><tr><th>Сана</th><th>Изоҳ</th><th style="text-align:right;">Кирим</th><th style="text-align:right;">Чиким</th></tr>'+(rows||'<tr><td colspan="4" style="text-align:center;">Ёзувлар топилмади</td></tr>')+totalsRow+'</table>';
    var sub = (from?fmtDateShort(from):"бошидан")+" — "+(to?fmtDateShort(to):"ҳозиргача");
    var html = voucherShell((type==="customer"?"Харидор":"Етказиб берувчи")+" — "+esc(name), sub, body, true);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

