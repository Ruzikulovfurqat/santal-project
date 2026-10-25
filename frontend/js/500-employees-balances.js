  /* ================= view: employees / Қолдиқларни киритиш ================= */
  /* Ходимнинг тизимга биринчи марта киритилаётган (ёки кейинчалик қўлда
     тўғриланадиган) "ой бошидаги қолдиғи"ни белгилаш учун алоҳида бўлим.
     Бу ерда танланган (йил, ой) даврига ва ходимга киритилган сумма
     manualOpeningBalance() орқали previousPayrollClosing()да — яъни Иш
     ҳақи ҳисоблашдаги "Ой бошидаги қолдиқ"да — автомат ишлатилади ва
     ўтган ойдан ҳисобланадиган автомат қийматдан устун туради. */
  function balanceEntryRunById(id){ return STATE.balanceEntries.find(function(x){return x.id===id;}); }

  function renderBalanceEntriesTab(){
    setTopbar("Қолдиқларни киритиш", STATE.balanceEntries.length+" та операция", '<button class="btn btn-primary" id="beCreateBtn">'+ICONS.plus+'Яратиш</button>');
    var root = document.getElementById("content");
    var html = empSubnav("balances")+sampleBanner();
    var allList = STATE.balanceEntries.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    html += '<div style="margin-bottom:12px;">'+onlyActiveCheckboxHtml("be-onlyactive", STATE.balanceEntriesOnlyActive)+'</div>';
    var list = STATE.balanceEntriesOnlyActive!==false ? allList.filter(function(r){ return !r.cancelled; }) : allList;
    if(!allList.length){
      html += emptyState("Ҳали қолдиқ киритилмаган", "«Яратиш» тугмаси орқали ходимларнинг ой бошидаги қолдиғини киритинг.");
    } else if(!list.length){
      html += emptyState("Ҳеч нарса топилмади", "Фақат бекор қилинган ёзувлар бор — уларни кўриш учун «Фақат бажарилганлар» белгисини олиб ташланг.");
    } else {
      var rows = list.map(function(r, idx){
        var periodLabel = (MONTHS_FULL[(r.month||1)-1]||"")+" "+r.year+" йил";
        var entries = r.entries||[];
        var namesTxt = entries.length ? (entries.length<=2 ? entries.map(function(x){return x.fullName;}).join(", ") : entries[0].fullName+" ва яна "+(entries.length-1)+" киши") : "—";
        var total = entries.reduce(function(s,x){return s+(Number(x.amount)||0);},0);
        return '<tr'+(r.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(r.date||(r.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(namesTxt)+'</td>'+
          '<td class="cell-muted">'+esc(periodLabel)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(total)+'</td>'+
          '<td>'+(r.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-be-view="'+r.id+'" title="Ичини кўриш">'+ICONS.eye+'</button>'+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-be-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-be-cancel="'+r.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (r.cancelled?'<button class="btn btn-ghost btn-icon" data-be-restore="'+r.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-be-print="'+r.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-be-export="'+r.id+'" title="Excel’га юклаш">'+ICONS.download+'</button>'+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Ф.И.Ш.</th><th>Давр</th><th>Сумма</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireEmpSubnav(root);
    var beOnlyActiveEl = document.getElementById("be-onlyactive");
    if(beOnlyActiveEl) beOnlyActiveEl.addEventListener("change", function(){ STATE.balanceEntriesOnlyActive = beOnlyActiveEl.checked; renderBalanceEntriesTab(); });
    document.getElementById("beCreateBtn").addEventListener("click", function(){ openBalanceEntryForm(null); });
    root.querySelectorAll("[data-be-view]").forEach(function(b){ b.addEventListener("click", function(){ openBalanceEntryDetail(list.find(function(x){return x.id===b.getAttribute("data-be-view");})); }); });
    root.querySelectorAll("[data-be-edit]").forEach(function(b){ b.addEventListener("click", function(){ openBalanceEntryForm(list.find(function(x){return x.id===b.getAttribute("data-be-edit");})); }); });
    root.querySelectorAll("[data-be-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-be-cancel");});
      openConfirm("Операцияни бекор қилиш", "Бу қолдиқ операцияси бекор қилинсинми? Ёзув тарихда сақланиб қолади, лекин иш ҳақи ҳисоблашига энди таъсир қилмайди.", "Ҳа, бекор қилиш", function(){ dbUpdate("balanceEntries", r.id, {cancelled:true}, STATE.balanceEntries); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-be-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-be-restore");});
      openConfirm("Операцияни тиклаш", "Бу қолдиқ операцияси қайта тикланиб, фаол ҳолатга қайтарилсинми?", "Ҳа, тиклаш", function(){ dbUpdate("balanceEntries", r.id, {cancelled:false}, STATE.balanceEntries); toast("Тикланди"); }, true);
    }); });
    root.querySelectorAll("[data-be-print]").forEach(function(b){ b.addEventListener("click", function(){
      printBalanceEntry(list.find(function(x){return x.id===b.getAttribute("data-be-print");}));
    }); });
    root.querySelectorAll("[data-be-export]").forEach(function(b){ b.addEventListener("click", function(){
      exportBalanceEntry(list.find(function(x){return x.id===b.getAttribute("data-be-export");}));
    }); });
  }

  function openBalanceEntryForm(existing){
    var isEdit = !!(existing && existing.id);
    var curY = new Date().getFullYear();
    var fs = {
      date: (existing && existing.date) || todayISO(),
      year: (existing && existing.year) || curY,
      month: (existing && existing.month) || (new Date().getMonth()+1),
      note: (existing && existing.note) || ""
    };
    var entries = (existing && existing.entries) ? existing.entries.map(function(x){ return Object.assign({}, x); }) : [];
    var body = '<div class="field-row">'+
        '<div class="field"><label>Сана</label><input type="date" id="be-date" value="'+esc(fs.date)+'"></div>'+
        '<div class="field"><label>Давр (қайси ойлик)</label><div class="field-row" style="grid-template-columns:1fr 1fr;gap:8px;">'+
          '<input type="number" id="be-year" value="'+esc(fs.year||curY)+'">'+
          '<select id="be-month">'+MONTHS_FULL.map(function(mn,i){return '<option value="'+(i+1)+'"'+(fs.month===(i+1)?" selected":"")+'>'+mn+'</option>';}).join("")+'</select>'+
        '</div></div>'+
      '</div>'+
      '<div class="field-hint" style="margin:-6px 0 12px;">Танланган давр — ходимнинг шу ой учун Иш ҳақи ҳисоблашдаги «Ой бошидаги қолдиғи»ни белгилайди.</div>'+
      '<div id="be-rows"></div>'+
      '<div style="margin:4px 0 14px;"><button type="button" class="btn btn-secondary" id="be-add-row">'+ICONS.plus+'Ходим қўшиш</button></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="be-note">'+esc(fs.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Қолдиқни таҳрирлаш":"Янги қолдиқ киритиш", body, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    function syncEntriesFromInputs(){
      entries.forEach(function(en, idx){
        var sel = m.querySelector('[data-be-emp="'+idx+'"]');
        if(sel) en.employeeId = sel.value;
        var am = m.querySelector('[data-be-amount="'+idx+'"]');
        if(am) en.amount = Number(am.value)||0;
      });
    }
    function renderRows(){
      var rowsHtml = entries.map(function(en, idx){
        var emp = employeeById(en.employeeId);
        var usedIds = entries.map(function(x,xi){ return xi!==idx ? x.employeeId : null; }).filter(Boolean);
        return '<div class="field-row" style="grid-template-columns:1fr 160px 34px;align-items:end;gap:8px;margin-bottom:8px;">'+
          '<div class="field" style="margin-bottom:0;"><label>'+(idx+1)+'. Ходим</label><select data-be-emp="'+idx+'"><option value="">— танланг —</option>'+
            STATE.employees.slice().sort(function(a,b){return (a.fullName||"").localeCompare(b.fullName||"");}).filter(function(x){return usedIds.indexOf(x.id)===-1;}).map(function(x){
              return '<option value="'+x.id+'"'+(en.employeeId===x.id?" selected":"")+'>'+esc(x.fullName)+(x.position?(" — "+esc(x.position)):"")+'</option>';
            }).join("")+
          '</select></div>'+
          '<div class="field" style="margin-bottom:0;"><label>Сумма</label><input type="number" min="0" step="any" data-be-amount="'+idx+'" value="'+esc(en.amount||0)+'"></div>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-be-remove="'+idx+'" title="Ўчириш" style="margin-bottom:2px;">'+ICONS.trash+'</button>'+
        '</div>';
      }).join("");
      m.querySelector("#be-rows").innerHTML = rowsHtml || '<div class="field-hint" style="margin-bottom:10px;">Ҳали ходим қўшилмаган. Пастдаги «Ходим қўшиш» тугмасини босинг.</div>';
      m.querySelectorAll('[data-be-remove]').forEach(function(btn){
        btn.addEventListener("click", function(){
          syncEntriesFromInputs();
          entries.splice(Number(btn.getAttribute("data-be-remove")), 1);
          renderRows();
        });
      });
      m.querySelectorAll('[data-be-emp],[data-be-amount]').forEach(function(inp){
        inp.addEventListener("change", syncEntriesFromInputs);
      });
    }
    m.querySelector("#be-add-row").addEventListener("click", function(){
      syncEntriesFromInputs();
      entries.push({employeeId:"", amount:0});
      renderRows();
    });
    renderRows();

    m.querySelector("[data-save]").addEventListener("click", function(){
      syncEntriesFromInputs();
      var year = Number(m.querySelector("#be-year").value)||curY;
      var month = Number(m.querySelector("#be-month").value)||1;
      var cleanEntries = entries.filter(function(en){ return en.employeeId; }).map(function(en){
        var emp = employeeById(en.employeeId);
        return {employeeId:en.employeeId, fullName: emp?emp.fullName:"", amount: Number(en.amount)||0};
      });
      if(!cleanEntries.length){ toast("Камида битта ходим қўшинг"); return; }
      var data = {
        date: m.querySelector("#be-date").value||todayISO(), year:year, month:month,
        entries: cleanEntries, note: m.querySelector("#be-note").value.trim(), cancelled:false
      };
      if(isEdit){ dbUpdate("balanceEntries", existing.id, data, STATE.balanceEntries); toast("Сақланди"); }
      else { data.createdAt = new Date().toISOString(); dbAdd("balanceEntries", data, STATE.balanceEntries); toast("Қолдиқ сақланди"); }
      closeModal();
    });
  }

  function openBalanceEntryDetail(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var entries = run.entries||[];
    var total = entries.reduce(function(s,x){return s+(Number(x.amount)||0);},0);
    var rows = entries.map(function(en, idx){
      return '<tr><td class="cell-muted">'+(idx+1)+'</td><td class="cell-strong">'+esc(en.fullName)+'</td><td class="num cell-strong">'+fmtSum(en.amount)+'</td></tr>';
    }).join("");
    var body = '<div class="detail-grid" style="margin-bottom:14px;">'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDateShort(run.date||"")+'</div></div>'+
      '<div><div class="dl">Давр</div><div class="dd">'+esc(periodLabel)+'</div></div>'+
      '<div><div class="dl">Ҳолат</div><div class="dd">'+(run.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</div></div>'+
      '</div>'+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Сумма</th></tr></thead><tbody>'+rows+
      '<tr><td colspan="2" class="cell-strong">Жами</td><td class="num cell-strong">'+fmtSum(total)+'</td></tr>'+
      '</tbody></table></div>'+
      (run.note?'<div class="field" style="margin-top:14px;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(run.note)+'</div></div>':"");
    var m = openModal("Қолдиқ — "+esc(periodLabel), body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
  }

  function printBalanceEntry(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var entries = run.entries||[];
    var total = entries.reduce(function(s,x){return s+(Number(x.amount)||0);},0);
    var rows = entries.map(function(en, idx){
      return '<tr><td>'+(idx+1)+'</td><td>'+esc(en.fullName)+'</td><td style="text-align:right;">'+fmtSum(en.amount)+'</td></tr>';
    }).join("");
    var body = '<table><tr><th>№</th><th>Ф.И.Ш.</th><th style="text-align:right;">Сумма</th></tr>'+
      rows+
      '<tr><td colspan="2" style="font-weight:700;background:#f4f5f7;">Жами</td><td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(total)+'</td></tr>'+
      '</table>'+
      (run.note?'<div class="field-hint" style="margin-top:10px;">Изоҳ: '+esc(run.note)+'</div>':'')+
      '<div class="v-sign"><div>Киритди</div><div>Тасдиқлади</div></div>';
    var html = voucherShell("Қолдиқларни киритиш", "Давр: "+esc(periodLabel)+" · Сана: "+esc(fmtDateShort(run.date||"")), body, true);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function exportBalanceEntry(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var entries = run.entries||[];
    var headers = ["№","Ф.И.Ш.","Сумма"];
    var dataRows = entries.map(function(en, idx){ return [idx+1, en.fullName, Math.round((Number(en.amount)||0)*100)/100]; });
    exportHtmlTableAsExcel("Qoldiq_"+run.year+"_"+String(run.month).padStart(2,"0")+".xls", "Қолдиқ — "+periodLabel, headers, dataRows);
    toast("Excel файли юкланмоқда");
  }

