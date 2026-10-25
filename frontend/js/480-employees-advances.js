  /* ================= view: employees / Аванслар ================= */
  /* Наряд бўйича ҳисобланган Қолдиқ асосида ходимларга аванс бериш —
     алоҳида операция сифатида сақланади, наряд ёзувининг ўзини
     ўзгартирмайди (наряд Қолдиғи ўзгармасдан қолади, фақат шу асосда
     қанча аванс берилгани ва қолгани алоҳида ҳисобга олинади). */
  function advanceRunById(id){ return STATE.advanceRuns.find(function(x){return x.id===id;}); }

  /* Битта ходим шу наряд ичида БИР НЕЧТА цехда (Табелдаги бир нечта
     ёзув асосида) ишлаган бўлиши мумкин — computeSalaryGroups уларни
     цехлар бўйича АЛОҲИДА гуруҳларга ажратади. Аванслар бўлимида эса
     шу ходим БИР МАРТА, барча цехлардаги Қолдиқлари ЖАМЛАНГАН ҳолда
     чиқиши керак (масалан: краска цехида 500 000 + чушка цехида
     2 000 000 = жами 2 500 000), акс ҳолда битта ходим икки марта
     кўринади ва аванс бериш чалкашиб кетади. */
  function computeAdvanceRows(fs){
    var run = salaryRunById(fs.salaryRunId);
    if(!run) return [];
    var groups = computeSalaryGroups(run);
    var byEmp = {}, order = [];
    groups.forEach(function(g){
      g.rows.forEach(function(r){
        if(!byEmp[r.employeeId]){
          byEmp[r.employeeId] = { employeeId: r.employeeId, fullName: r.fullName, workshopNames: [], naryadQoldiq: 0 };
          order.push(r.employeeId);
        }
        var b = byEmp[r.employeeId];
        b.naryadQoldiq += r.net;
        if(b.workshopNames.indexOf(g.workshopName)===-1) b.workshopNames.push(g.workshopName);
      });
    });
    return order.map(function(employeeId, i){
      var b = byEmp[employeeId];
      var ov = (fs.employees && fs.employees[employeeId]) || {};
      var advance = Number(ov.advance)||0;
      return {
        idx: i+1, employeeId: employeeId, fullName: b.fullName, workshopName: b.workshopNames.join(", "),
        naryadQoldiq: b.naryadQoldiq, advance: advance, remaining: b.naryadQoldiq - advance, note: ov.note||""
      };
    });
  }
  function advanceRunTotals(fs){
    var rows = computeAdvanceRows(fs);
    var run = salaryRunById(fs.salaryRunId);
    var groups = run ? computeSalaryGroups(run) : [];
    /* Цехлар бўйича жамланмада энди фақат ЎША цехда ҳисобланган наряд
       қолдиғи (қоldиқ) ва ходимлар сони кўрсатилади — аванс/қолдиқ
       (аванс минус) энди ходим даражасида (барча цехлари жамланган
       ҳолда) ҳисобланадиган бўлгани учун бир цехга алоҳида
       бириктирилмайди. */
    var byWorkshop = groups.map(function(g){
      return { workshopName: g.workshopName, qoldiq: g.groupNet, count: g.rows.length };
    });
    return {
      rows: rows, byWorkshop: byWorkshop,
      totalAdvance: rows.reduce(function(s,r){return s+r.advance;},0),
      totalRemaining: rows.reduce(function(s,r){return s+r.remaining;},0),
      empCount: rows.length
    };
  }

  function renderAdvancesTab(){
    setTopbar("Аванслар", STATE.advanceRuns.length+" та операция", '<button class="btn btn-primary" id="advCreateBtn">'+ICONS.plus+'Яратиш</button>');
    var root = document.getElementById("content");
    var html = empSubnav("advances")+sampleBanner();
    /* Саналар энди ЯРАТИЛГАН вақти эмас, балки киритилган санаси (r.date)
       бўйича камайиш тартибида сараланади; давр (йил) тугмаси орқали
       фақат танланган йилга тегишли аванслар кўрсатилади (2026-10-01). */
    var allList = STATE.advanceRuns.slice().sort(function(a,b){
      var ad=a.date||(a.createdAt||"").slice(0,10), bd=b.date||(b.createdAt||"").slice(0,10);
      if(ad!==bd) return bd.localeCompare(ad);
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    html += '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:4px;">'+
      yearPickerHtml("advanceList", STATE.advanceListYear, STATE.advanceListYearWin)+
      onlyActiveCheckboxHtml("advanceList-onlyactive", STATE.advanceListOnlyActive)+
      '</div>';
    var yearList = allList.filter(function(r){ return (r.year||0)===STATE.advanceListYear; });
    var list = STATE.advanceListOnlyActive!==false ? yearList.filter(function(r){ return !r.cancelled; }) : yearList;
    if(!allList.length){
      html += emptyState("Ҳали аванс операцияси йўқ", "«Яратиш» тугмаси орқали наряд бўйича ходимларга аванс беринг.");
    } else if(!yearList.length){
      html += emptyState("Бу йилда аванс йўқ", "Бошқа йилни танланг ёки «Яратиш» тугмаси орқали янги аванс киритинг.");
    } else if(!list.length){
      html += emptyState("Ҳеч нарса топилмади", "Бу йилда фақат бекор қилинган ёзувлар бор — уларни кўриш учун «Фақат бажарилганлар» белгисини олиб ташланг.");
    } else {
      var rows = list.map(function(r, idx){
        var periodLabel = (MONTHS_FULL[(r.month||1)-1]||"")+" "+r.year+" йил";
        var totals = advanceRunTotals(r);
        var names = totals.rows.filter(function(x){return x.advance>0;}).map(function(x){return x.fullName;});
        var namesTxt = names.length ? (names.length<=2 ? names.join(", ") : names[0]+" ва яна "+(names.length-1)+" киши") : "—";
        return '<tr'+(r.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(r.date||(r.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(periodLabel)+'</td>'+
          '<td class="cell-muted">'+esc(namesTxt)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(totals.totalAdvance)+'</td>'+
          '<td>'+(r.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-adv-copy="'+r.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-adv-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-adv-cancel="'+r.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (r.cancelled?'<button class="btn btn-ghost btn-icon" data-adv-restore="'+r.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-adv-print="'+r.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Давр</th><th>Ким(лар)га</th><th>Жами аванс</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireEmpSubnav(root);
    wireYearPicker(root, "advanceList",
      function(){ return STATE.advanceListYear; }, function(y){ STATE.advanceListYear=y; },
      function(){ return STATE.advanceListYearWin; }, function(w){ STATE.advanceListYearWin=w; },
      renderAdvancesTab);
    var advanceListOnlyActiveEl = document.getElementById("advanceList-onlyactive");
    if(advanceListOnlyActiveEl) advanceListOnlyActiveEl.addEventListener("change", function(){ STATE.advanceListOnlyActive = advanceListOnlyActiveEl.checked; renderAdvancesTab(); });
    document.getElementById("advCreateBtn").addEventListener("click", function(){ openAdvanceForm(null); });
    root.querySelectorAll("[data-adv-edit]").forEach(function(b){ b.addEventListener("click", function(){ openAdvanceForm(list.find(function(x){return x.id===b.getAttribute("data-adv-edit");})); }); });
    root.querySelectorAll("[data-adv-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-adv-cancel");});
      openConfirm("Операцияни бекор қилиш", "Бу аванс операцияси бекор қилинсинми? Ёзув тарихда сақланиб қолади.", "Ҳа, бекор қилиш", function(){ dbUpdate("advanceRuns", r.id, {cancelled:true}, STATE.advanceRuns); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-adv-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-adv-restore");});
      openConfirm("Операцияни тиклаш", "Бу аванс операцияси қайта тикланиб, фаол ҳолатга қайтарилсинми?", "Ҳа, тиклаш", function(){ dbUpdate("advanceRuns", r.id, {cancelled:false}, STATE.advanceRuns); toast("Тикланди"); }, true);
    }); });
    root.querySelectorAll("[data-adv-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-adv-copy");}); if(!r) return;
      var c = Object.assign({}, r);
      delete c.id; c.cancelled = false; c.createdAt = ""; c.date = todayISO();
      c.items = (r.items||[]).map(function(it){ return Object.assign({}, it); });
      openAdvanceForm(c);
      toast("Нусха олинди — даврни текшириб сақланг");
    }); });
    root.querySelectorAll("[data-adv-print]").forEach(function(b){ b.addEventListener("click", function(){
      printAdvanceRun(list.find(function(x){return x.id===b.getAttribute("data-adv-print");}));
    }); });
  }

  function openAdvanceForm(existing){
    var isEdit = !!(existing && existing.id);
    var curY = new Date().getFullYear();
    var fs = {
      date: (existing && existing.date) || todayISO(),
      year: (existing && existing.year) || curY,
      month: (existing && existing.month) || (new Date().getMonth()+1),
      salaryRunId: (existing && existing.salaryRunId) || "",
      employees: (existing && existing.employees) ? JSON.parse(JSON.stringify(existing.employees)) : {}
    };
    function salaryRunOptions(){
      return STATE.salaryRuns.filter(function(r){ return !r.cancelled && r.year===fs.year && r.month===fs.month; })
        .slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    }
    var head = '<div class="field-row">'+
        '<div class="field"><label>Сана</label><input type="date" id="adv-date" value="'+esc(fs.date)+'"></div>'+
        '<div class="field"><label>Давр</label><div class="field-row" style="grid-template-columns:1fr 1fr;gap:8px;">'+
          '<input type="number" id="adv-year" value="'+esc(fs.year||curY)+'">'+
          '<select id="adv-month">'+MONTHS_FULL.map(function(mn,i){return '<option value="'+(i+1)+'"'+(fs.month===(i+1)?" selected":"")+'>'+mn+'</option>';}).join("")+'</select>'+
        '</div></div>'+
      '</div>'+
      '<div class="field"><label>Наряд</label><select id="adv-salaryrun"></select></div>'+
      '<div id="adv-rows"></div>'+
      '<div id="adv-summary"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Аванс операциясини таҳрирлаш":"Янги аванс", head, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    function syncFromInputs(){
      var dEl=m.querySelector("#adv-date"); if(dEl) fs.date=dEl.value;
      var yEl=m.querySelector("#adv-year"); if(yEl) fs.year=Number(yEl.value)||fs.year;
      var moEl=m.querySelector("#adv-month"); if(moEl) fs.month=Number(moEl.value)||fs.month;
      var srEl=m.querySelector("#adv-salaryrun"); if(srEl) fs.salaryRunId=srEl.value;
      m.querySelectorAll("[data-adv-amount]").forEach(function(inp){ var k=inp.getAttribute("data-adv-amount"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].advance=Number(inp.value)||0; });
      m.querySelectorAll("[data-adv-note]").forEach(function(inp){ var k=inp.getAttribute("data-adv-note"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].note=inp.value; });
    }
    function renderSalaryRunSelect(){
      var opts = salaryRunOptions();
      var sel = m.querySelector("#adv-salaryrun");
      if(!opts.length){
        sel.innerHTML = '<option value="">— бу давр учун наряд топилмади —</option>';
        fs.salaryRunId = "";
      } else {
        var stillValid = opts.some(function(r){return r.id===fs.salaryRunId;});
        if(!stillValid) fs.salaryRunId = opts[0].id;
        sel.innerHTML = opts.map(function(r){
          var t = advanceRunTotals({salaryRunId:r.id, employees:{}});
          return '<option value="'+r.id+'"'+(fs.salaryRunId===r.id?" selected":"")+'>'+fmtDateShort(r.date||(r.createdAt||"").slice(0,10))+' · '+t.empCount+' та ходим · Қолдиқ '+fmtSum(t.totalRemaining)+'</option>';
        }).join("");
      }
    }
    function renderRows(){
      var totals = advanceRunTotals(fs);
      var rowsHtml = totals.rows.length ? totals.rows.map(function(r){
        return '<tr>'+
          '<td class="cell-muted">'+r.idx+'</td>'+
          '<td class="cell-strong">'+esc(r.fullName)+'</td>'+
          '<td class="cell-muted">'+esc(r.workshopName)+'</td>'+
          '<td class="num cell-muted">'+fmtSum(r.naryadQoldiq)+'</td>'+
          '<td><input class="sr-input" type="number" min="0" step="any" style="width:96px;" data-adv-amount="'+esc(r.employeeId)+'" value="'+esc(r.advance||0)+'"></td>'+
          '<td class="num cell-strong" data-adv-remaining="'+esc(r.employeeId)+'" style="'+(r.remaining<0?"color:var(--critical);":"")+'">'+fmtSum(r.remaining)+'</td>'+
          '<td><input class="sr-input" type="text" style="width:140px;" data-adv-note="'+esc(r.employeeId)+'" value="'+esc(r.note||"")+'"></td>'+
        '</tr>';
      }).join("") : '<tr><td colspan="7" class="cell-muted" style="text-align:center;padding:20px;">Наряд танланг</td></tr>';
      m.querySelector("#adv-rows").innerHTML = '<div class="table-wrap"><table class="sr-table"><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Цех</th><th>Наряд бўйича қолдиқ</th><th>Аванс суммаси</th><th>Қолдиқ (аванс минус)</th><th>Изоҳ</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>';
      renderSummary(totals);
      m.querySelectorAll("#adv-rows input").forEach(function(inp){
        inp.addEventListener("change", function(){ syncFromInputs(); recomputeDisplay(); });
      });
    }
    function renderSummary(totals){
      if(!totals.rows.length){ m.querySelector("#adv-summary").innerHTML=""; return; }
      var wsRows = totals.byWorkshop.map(function(b){
        return '<tr><td class="cell-strong">'+esc(b.workshopName)+'</td><td class="num cell-muted">'+b.count+'</td><td class="num cell-muted">'+fmtSum(b.qoldiq)+'</td></tr>';
      }).join("");
      m.querySelector("#adv-summary").innerHTML = '<div class="section-head" style="margin:14px 0 8px;"><h2 style="font-size:14px;">Цехлар бўйича наряд қолдиғи</h2></div>'+
        '<div class="table-wrap"><table><thead><tr><th>Цех</th><th>Ёзувлар</th><th>Наряд қолдиғи</th></tr></thead><tbody>'+wsRows+
        '</tbody></table></div>'+
        '<div class="section-head" style="margin:14px 0 8px;"><h2 style="font-size:14px;">Жами (ходимлар бўйича, бир хил ходим фақат бир марта)</h2></div>'+
        '<div class="table-wrap"><table><thead><tr><th>Ходимлар</th><th>Наряд қолдиғи</th><th>Аванс жами</th><th>Қолдиқ жами</th></tr></thead><tbody>'+
        '<tr><td class="num cell-strong">'+totals.empCount+'</td><td class="num cell-strong">'+fmtSum(totals.rows.reduce(function(s,r){return s+r.naryadQoldiq;},0))+'</td><td class="num cell-strong">'+fmtSum(totals.totalAdvance)+'</td><td class="num cell-strong">'+fmtSum(totals.totalRemaining)+'</td></tr>'+
        '</tbody></table></div>';
    }
    function recomputeDisplay(){
      var totals = advanceRunTotals(fs);
      totals.rows.forEach(function(r){
        var el = m.querySelector('[data-adv-remaining="'+r.employeeId+'"]');
        if(el){ el.textContent = fmtSum(r.remaining); el.style.color = r.remaining<0 ? "var(--critical)" : ""; }
      });
      renderSummary(totals);
    }

    m.querySelector("#adv-date").addEventListener("change", syncFromInputs);
    m.querySelector("#adv-year").addEventListener("change", function(){ syncFromInputs(); renderSalaryRunSelect(); renderRows(); });
    m.querySelector("#adv-month").addEventListener("change", function(){ syncFromInputs(); renderSalaryRunSelect(); renderRows(); });
    m.querySelector("#adv-salaryrun").addEventListener("change", function(){ syncFromInputs(); renderRows(); });

    renderSalaryRunSelect();
    renderRows();

    m.querySelector("[data-save]").addEventListener("click", function(){
      syncFromInputs();
      if(!fs.salaryRunId){ toast("Нарядни танланг"); return; }
      var data = { date: fs.date, year: fs.year, month: fs.month, salaryRunId: fs.salaryRunId, employees: fs.employees, cancelled:false };
      if(isEdit){ dbUpdate("advanceRuns", existing.id, data, STATE.advanceRuns); toast("Сақланди"); }
      else { data.createdAt = new Date().toISOString(); dbAdd("advanceRuns", data, STATE.advanceRuns); toast("Аванс сақланди"); }
      closeModal();
    });
  }

  function printAdvanceRun(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var totals = advanceRunTotals(run);
    var rows = "";
    totals.rows.forEach(function(r){
      rows += '<tr><td>'+r.idx+'</td><td>'+esc(r.fullName)+'</td><td>'+esc(r.workshopName)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.naryadQoldiq)+'</td><td style="text-align:right;">'+fmtSum(r.advance)+'</td>'+
        '<td style="text-align:right;font-weight:700;">'+fmtSum(r.remaining)+'</td><td>'+esc(r.note||"")+'</td></tr>';
    });
    var body = '<table><tr><th>№</th><th>Ф.И.Ш.</th><th>Цех</th><th style="text-align:right;">Наряд қолдиғи</th><th style="text-align:right;">Аванс</th><th style="text-align:right;">Қолдиқ</th><th>Изоҳ</th></tr>'+
      rows+
      '<tr><td colspan="4" style="font-weight:700;background:#f4f5f7;">Жами</td><td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.totalAdvance)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totals.totalRemaining)+'</td><td style="background:#f4f5f7;"></td></tr>'+
      '</table>'+
      '<div class="v-sign"><div>Берди</div><div>Олди</div></div>';
    var html = voucherShell("Аванс ведомости", "Давр: "+esc(periodLabel)+" · Сана: "+esc(fmtDateShort(run.date||"")), body, true);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

