  /* ================= view: employees ================= */
  function empSubnav(active){
    return '<div class="filter-row" style="margin-bottom:18px;">'+EMP_TABS.map(function(t){
      return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-empview="'+t[0]+'">'+t[1]+'</button>';
    }).join("")+'</div>';
  }
  function wireEmpSubnav(root){
    root.querySelectorAll("[data-empview]").forEach(function(b){ b.addEventListener("click", function(){ STATE.empView=b.getAttribute("data-empview"); render(); }); });
  }
  function viewEmployees(){
    if(STATE.empView==="workshops") return renderWorkshops();
    if(STATE.empView==="tabel") return renderTabelTab();
    if(STATE.empView==="salary") return renderSalaryTab();
    if(STATE.empView==="advances") return renderAdvancesTab();
    if(STATE.empView==="payroll") return renderPayrollTab();
    if(STATE.empView==="balances") return renderBalanceEntriesTab();
    if(STATE.empView==="report") return renderEmpReportTab();
    if(STATE.empView==="act") return renderEmpActTab();
    if(STATE.empView==="dividends") return renderEmpDividendsTab();
    return renderEmpOpsTab();
  }
  function renderEmpStub(tabId, title){
    setTopbar(title, "", "");
    var root = document.getElementById("content");
    root.innerHTML = empSubnav(tabId)+emptyState("Тез орада", "Бу бўлим ҳали ишлаб чиқилмоқда. Талабларингизни айтсангиз, навбатдаги янгиланишда тайёрлаб бераман.");
    wireEmpSubnav(root);
  }

  /* Дивидентлар (2026-10-31): Касса → Чиқим → Бошқарув бўлими → Администрация
     → «Дивидент» билан берилган пуллар. Улар ходимнинг иш ҳақи ва акт
     сверкасига кирмайди (counterpartyType==="dividend"), фойдадан олинади.
     Бу ерда: ходим танланса — унинг ҳисоб-китоб тарихи (қатор-қатор, жами
     билан), «Барчаси» бўлса — ходимлар кесимида жами ва умумий тарих.
     Бекор қилинган ёзувлар хира кўринади ва жамига қўшилмайди. */
  function renderEmpDividendsTab(){
    setTopbar("Дивидентлар", "Ходимлар олган дивидентлар ва ҳисоб-китоб тарихи", "");
    var root = document.getElementById("content");
    var employeesSorted = STATE.employees.slice().sort(function(a,b){ return (a.fullName||"").localeCompare(b.fullName||""); });
    var html = empSubnav("dividends")+
      '<div class="card" style="padding:18px 20px;margin-bottom:16px;">'+
        '<div class="field-row"><div class="field"><label>Ходим</label>'+personSelectSearchBoxHtml("emp-div-who-search")+'<select id="emp-div-who"><option value="">Барчаси</option>'+
          employeesSorted.map(function(e){ return '<option value="'+e.id+'"'+(STATE.empDivEmployeeId===e.id?" selected":"")+'>'+esc(e.fullName)+(e.position?(" — "+esc(e.position)):"")+'</option>'; }).join("")+
          '</select></div></div>'+
        '<div class="field-row"><div class="field"><label>Санадан</label><input id="emp-div-from" type="date" value="'+esc(STATE.empDivFrom||"")+'"></div>'+
        '<div class="field"><label>Санагача</label><input id="emp-div-to" type="date" value="'+esc(STATE.empDivTo||"")+'"></div>'+
        '<div class="field" style="display:flex;align-items:flex-end;"><button class="btn btn-primary" id="emp-div-search">'+ICONS.search+'Излаш</button></div></div>'+
      '</div><div id="emp-div-results"></div>';
    root.innerHTML = html;
    wireEmpSubnav(root);
    wireItemSelectSearch("emp-div-who-search", "emp-div-who");

    function paint(){
      var empId = STATE.empDivEmployeeId || "", from = STATE.empDivFrom || "", to = STATE.empDivTo || "";
      var list = STATE.cashTransactions.filter(function(t){
        if(!t.isDividend || t.direction!=="chiqim" || t.archived) return false;
        if(empId && t.counterpartyId!==empId) return false;
        var d = t.date || (t.createdAt||"").slice(0,10);
        if(from && d<from) return false;
        if(to && d>to) return false;
        return true;
      }).sort(function(a,b){
        return String(a.date||"").localeCompare(String(b.date||"")) || String(a.createdAt||"").localeCompare(String(b.createdAt||""));
      });
      var resEl = root.querySelector("#emp-div-results");
      if(!list.length){
        resEl.innerHTML = emptyState("Дивидент топилмади", "Касса → Чиқим → Бошқарув бўлими → Администрация → «Дивидент» орқали берилган пуллар шу ерда кўринади.");
        return;
      }
      var live = list.filter(function(t){ return !t.cancelled; });
      var total = live.reduce(function(s,t){ return s+finTxSom(t); }, 0);
      var byEmp = {}, order = [];
      live.forEach(function(t){
        var k = t.counterpartyId || ("name:"+(t.counterpartyName||"—"));
        if(!byEmp[k]){ byEmp[k] = {name:t.counterpartyName||employeeName(t.counterpartyId)||"—", sum:0, n:0}; order.push(k); }
        byEmp[k].sum += finTxSom(t); byEmp[k].n++;
      });
      order.sort(function(a,b){ return byEmp[b].sum-byEmp[a].sum; });
      var h = '<div class="kpi-grid" style="margin-bottom:16px;">'+
        kpiTileFmt("Жами дивидент", fmtSum(total), live.length+" та амал", "critical")+
        kpiTileFmt("Олувчилар", String(order.length), "", "")+
        '</div>';
      if(!empId && order.length > 1){
        h += '<div class="section-head"><h2 style="font-size:14.5px;">Ходимлар кесимида</h2></div>'+
          '<div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>№</th><th>Ходим</th><th class="num">Амаллар</th><th class="num">Жами</th></tr></thead><tbody>'+
          order.map(function(k,i){
            return '<tr><td class="cell-muted">'+(i+1)+'</td><td class="cell-strong">'+esc(byEmp[k].name)+'</td><td class="num">'+byEmp[k].n+'</td><td class="num cell-strong">'+fmtSum(byEmp[k].sum)+'</td></tr>';
          }).join("")+'</tbody></table></div>';
      }
      var run = 0;
      h += '<div class="section-head"><h2 style="font-size:14.5px;">Ҳисоб-китоб тарихи</h2></div>'+
        '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>№</th><th>Ходим</th><th>Тўлов усули</th><th>Изоҳ</th><th class="num">Сумма</th>'+
        (empId?'<th class="num">Жами (кўпайиб борувчи)</th>':'')+'<th>Ҳолати</th></tr></thead><tbody>'+
        list.map(function(t){
          var amt = finTxSom(t);
          if(!t.cancelled) run += amt;
          return '<tr style="'+(t.cancelled?"opacity:.5;":"")+'">'+
            '<td class="cell-muted">'+esc(fmtDateShort(t.date||(t.createdAt||"").slice(0,10)))+'</td>'+
            '<td class="cell-muted">'+esc(String(t.docNumber||""))+'</td>'+
            '<td class="cell-strong">'+esc(t.counterpartyName||"—")+'</td>'+
            '<td>'+esc(kassaTxMethodText(t))+'</td>'+
            '<td>'+esc(t.description||"")+'</td>'+
            '<td class="num cell-strong">'+fmtSum(amt)+'</td>'+
            (empId?'<td class="num">'+(t.cancelled?'':fmtSum(run))+'</td>':'')+
            '<td>'+(t.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Берилди</span>')+'</td></tr>';
        }).join("")+
        '<tr style="font-weight:800;background:var(--surface-2);"><td></td><td></td><td>Жами</td><td></td><td></td><td class="num">'+fmtSum(total)+'</td>'+(empId?'<td></td>':'')+'<td></td></tr>'+
        '</tbody></table></div>';
      resEl.innerHTML = h;
    }
    root.querySelector("#emp-div-search").addEventListener("click", function(){
      STATE.empDivEmployeeId = root.querySelector("#emp-div-who").value;
      STATE.empDivFrom = root.querySelector("#emp-div-from").value;
      STATE.empDivTo = root.querySelector("#emp-div-to").value;
      paint();
    });
    root.querySelector("#emp-div-who").addEventListener("change", function(){
      STATE.empDivEmployeeId = this.value; paint();
    });
    paint();
  }

  /* Ходимлар бўйича акт сверка: танланган ходимнинг ҳисобланган ойлиги
     (иш ҳақи ҳисоблашлардаги "Қолдиқ") билан кассадан унга тўланган/ундан
     олинган пулларни (counterpartyType==="employee") бир жадвалда
     солиштиради. "Ҳисобланди" ва кассадан "Кирим" — ходимга ҳисобимизни
     оширади (кредит); кассадан унга "Чиқим" (тўлов) — ҳисобимизни
     камайтиради (дебет). */
  function renderEmpActTab(){
    setTopbar("Ходимлар бўйича акт сверка", "Ходим билан ўзаро ҳисоб-китобларни солиштириш", "");
    var root = document.getElementById("content");
    /* Санадан/Санагача — доим (аввал очилганда) бугунги сана билан
       тўлдирилган келади (STATE.empActFrom/To — STATE яратилишида
       todayISO()га тенг қилиб қўйилган), лекин фойдаланувчи уларни
       эркин бошқа санага ўзгартириши мумкин — бу ерда ҳеч қачон
       мажбурий равишда қайта "бугунги санага" тушмайди. */
    var employeesSorted = STATE.employees.slice().sort(function(a,b){ return (a.fullName||"").localeCompare(b.fullName||""); });
    /* "Барчасини танлаш" — белгиланса, ходим танлаш рўйхати ўчирилиб
       (эътиборга олинмай), «Излаш» босилганда ХАР БИР ходим учун
       (маълумоти бор ходимлар учун) алоҳида-алоҳида, худди якка ходим
       танлангандагидек тўлиқ жадвал кетма-кет кўрсатилади. */
    var html = empSubnav("act")+
      '<div class="card" style="padding:18px 20px;margin-bottom:16px;">'+
        '<div class="field-row"><div class="field"><label>Ходим</label>'+personSelectSearchBoxHtml("emp-act-who-search")+'<select id="emp-act-who"'+(STATE.empActSelectAll?" disabled":"")+'><option value="">— танланг —</option>'+
          employeesSorted.map(function(e){ return '<option value="'+e.id+'"'+(STATE.empActEmployeeId===e.id?" selected":"")+'>'+esc(e.fullName)+(e.position?(" — "+esc(e.position)):"")+'</option>'; }).join("")+
          '</select>'+
          '<label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-weight:600;font-size:13px;cursor:pointer;"><input type="checkbox" id="emp-act-all"'+(STATE.empActSelectAll?" checked":"")+' style="width:auto;"> Барчасини танлаш</label>'+
        '</div></div>'+
        '<div class="field-row"><div class="field"><label>Санадан</label><input id="emp-act-from" type="date" value="'+esc(STATE.empActFrom||todayISO())+'"></div>'+
        '<div class="field"><label>Санагача</label><input id="emp-act-to" type="date" value="'+esc(STATE.empActTo||todayISO())+'"></div>'+
        '<div class="field" style="display:flex;align-items:flex-end;"><button class="btn btn-primary" id="emp-act-search">'+ICONS.search+'Излаш</button></div></div>'+
      '</div><div id="emp-act-results"></div>';
    root.innerHTML = html;
    wireEmpSubnav(root);
    wireItemSelectSearch("emp-act-who-search", "emp-act-who");
    root.querySelector("#emp-act-all").addEventListener("change", function(e){
      STATE.empActSelectAll = e.target.checked;
      var selEl = root.querySelector("#emp-act-who");
      if(selEl) selEl.disabled = STATE.empActSelectAll;
      var searchBoxEl = root.querySelector("#emp-act-who-search");
      if(searchBoxEl) searchBoxEl.disabled = STATE.empActSelectAll;
    });

    /* Натижа — санадан-санагача оралиғидаги ХАР БИР САНА учун БИТТА қатор:
       шу кунда Наряд бўйича ҳисобланган ойлик, кассадан шу ходимга АВАНС
       сифатида (нақд/карта/ўтказма алоҳида-алоҳида) берилган суммалар,
       шу кунда РАСМИЙ ОЙЛИК (батч "Иш ҳақи тўлови" орқали, category
       "ish_haqi") тўланган сумма ва шу кунги якуний қолдиқ — барчаси
       бир жадвалда, кетма-кет, бир қарашда тушунарли бўлиши учун.
       МУҲИМ: аванс ва расмий ойлик тўлови АЛОҲИДА устунларда кўрсатилади
       — иккисини аралаштириб юбормаслик учун ажратиш category="ish_haqi"
       тегги (батч "Ходимлар бўйича" тўлов орқали қўйилади) бўйича
       амалга оширилади: shu tegga ega bo'lgan chiqim — расмий ойлик
       тўлови, қолган барча чиқимлар (counterpartyType=employee) — аванс.
       Бу ҳисоблаш "buildActBlock" функциясига ажратилди — токи БИР ХИЛ
       мантиқ якка ходим танланганда ҳам, "Барчасини танлаш" орқали ҳар
       бир ходим учун алоҳида-алоҳида ҳам ишлатилса бўлсин. */
    function buildActBlock(empId, from, to){
      /* "Қолдиқларни киритиш" бўлимида шу ходим учун (Санадан майдонидаги
         ойга мос) қўлда киритилган бошланғич қолдиқ (қарз ёки ортиқча
         тўлов) бор бўлса — Акт сверка ҳам ШУ суммани ҳисобга олиши
         керак (аввал бу бўлим бутунлай эътиборга олинмас, натижада
         Акт сверкадаги якуний қолдиқ Қолдиқларни киритиш'даги қиймат
         билан мос келмас эди). manualOpeningBalance — Иш ҳақи
         ҳисоблашда ҳам худди шу мақсадда ишлатиладиган функция. */
      var openingInfo = {found:false, amount:0};
      if(from && from.length>=7){
        var actFromYear = Number(from.slice(0,4)), actFromMonth = Number(from.slice(5,7));
        if(actFromYear && actFromMonth) openingInfo = manualOpeningBalance(empId, actFromYear, actFromMonth);
      }
      /* "Санадан" ойининг ЎЗИДА қўлда киритилган қолдиқ топилмаса (масалан
         фойдаланувчи "Санадан"ни қолдиқ киритилган ойдан АНЧА ОЛДИНРОҚ —
         масалан январдан — қўйиб, "Санагача"ни эса октябрга қўйса: қолдиқ
         сентябрь учун киритилган бўлса ҳам, эски код фақат январь учун
         қидирар, топмас ва бутунлай эътиборга олмас эди — натижада "Ой
         бошидаги қолдиқ" қатори умуман кўринмас эди) — танланган давр
         ИЧИДА (from..to оралиғида, "Санадан"дан кейинроқ ойларда ҳам)
         шу ходим учун киритилган энг СЎНГГИ (энг яқин келажакдаги) қолдиқ
         ёзувини қидирамиз. Топилса, ўша ой АМАЛИЙ бошланғич нуқта бўлади:
         ундан олдинги операциялар (жадвалда ҳам) энди кўрсатилмайди —
         чунки қўлда киритилган қолдиқ ўша ойгача бўлган БУТУН тарихни
         ўзида жамлаб беради (худди "Санадан"ни тўғридан-тўғри ўша ойга
         қўйгандагидек натижа чиқади). */
      var effectiveFrom = from;
      if(!openingInfo.found && from && to && from.length>=7 && to.length>=7){
        var fromMonthKey = from.slice(0,7), toMonthKey = to.slice(0,7);
        var bestKey = "", bestAmount = 0, bestFound = false;
        STATE.balanceEntries.forEach(function(r){
          if(r.cancelled || !r.year || !r.month) return;
          var mKey = r.year+"-"+String(r.month).padStart(2,"0");
          if(mKey<fromMonthKey || mKey>toMonthKey) return;
          (r.entries||[]).forEach(function(en){
            if(en.employeeId!==empId) return;
            if(!bestFound || mKey>bestKey){ bestFound=true; bestKey=mKey; bestAmount=Number(en.amount)||0; }
          });
        });
        if(bestFound){
          openingInfo = {found:true, amount:bestAmount};
          effectiveFrom = bestKey+"-01";
        }
      }
      var byDate = {}, dateOrder = [];
      function bucket(d){
        if(!d) d = "—";
        if(!byDate[d]){ byDate[d] = {date:d, hisoblangan:0, avansNaqd:0, avansKarta:0, avansOtkazma:0, oylikTolangan:0, kirim:0, chiqimTotal:0}; dateOrder.push(d); }
        return byDate[d];
      }

      STATE.cashTransactions.filter(function(t){
        if(t.cancelled) return false;
        if(t.counterpartyType!=="employee" || t.counterpartyId!==empId) return false;
        if(effectiveFrom && t.date<effectiveFrom) return false;
        if(to && t.date>to) return false;
        return true;
      }).forEach(function(t){
        var b = bucket(t.date);
        if(t.direction==="kirim"){ b.kirim += Number(t.amount)||0; return; }
        b.chiqimTotal += Number(t.amount)||0;
        if(t.category==="ish_haqi"){
          b.oylikTolangan += Number(t.amount)||0;
        } else {
          b.avansNaqd += txMethodValue(t,"naqd");
          b.avansKarta += txMethodValue(t,"karta");
          b.avansOtkazma += txMethodValue(t,"otkazma");
        }
      });

      /* Битта ходим наряд ичида бир нечта цехда бўлиши мумкин — шу
         сабабли барча мос келувчи гуруҳ-қаторларининг Қолдиғи (net)
         ЖАМЛАНАДИ (олдин фақат ОХИРГИ топилган қатор олиниб, бошқа
         цехлардаги ҳисоблангани йўқолиб қоларди — шу хато тузатилди).
         МУҲИМ: аввалги "r.employees[empId]" олдиндан-текшируви ХАТО эди —
         Round 15'даги entryKey тизимидан кейин fs.employees БИТТА
         "employeeId|цехKey" калити билан сақланади, соф "employeeId"
         калити билан ЭМАС, шу сабабли бу текшир доим ёлғон (false)
         қайтарар ва ҲАР БИР янги наряд бутунлай эътиборга олинмас эди —
         натижада "Ҳисобланган ойлиги" ҳамиша бўш кўринарди. Энди бу
         олдиндан-текшир бутунлай олиб ташланди — ҳар бир наряд учун
         computeSalaryGroups() орқали қаторлар тўғридан-тўғри текширилади
         (rr.employeeId===empId), бу эса ҳар қандай калит форматида ҳам
         тўғри ишлайди. */
      STATE.salaryRuns.filter(function(r){ return !r.cancelled; }).forEach(function(r){
        var groups = computeSalaryGroups(r), sumNet = 0, found = false;
        groups.forEach(function(g){ g.rows.forEach(function(rr){ if(rr.employeeId===empId){ sumNet += rr.net; found = true; } }); });
        if(!found) return;
        var evDate = (r.year && r.month) ? (r.year+"-"+String(r.month).padStart(2,"0")+"-"+String(daysInMonth(r.year,r.month)).padStart(2,"0")) : (r.date||"").slice(0,10);
        if(effectiveFrom && evDate<effectiveFrom) return;
        if(to && evDate>to) return;
        bucket(evDate).hisoblangan += sumNet;
      });

      dateOrder.sort();
      /* Карта аванс олган = "карта" (POS) + "ўтказма" (пул ўтказмаси)
         усуллари БИРГАЛИКДА — тизимнинг бошқа жойларида (масалан, Иш
         ҳақи ҳисоблашдаги авто-карта-аванс) қабул қилинган "ўтказма =
         картага тўлов" қоидасига мос бўлиши учун иккитаси биргаликда
         БИТТА "Карта аванс олган" устунида кўрсатилади — алоҳида
         "Ўтказма орқали..." устуни олиб ташланди. */
      var totalHisoblangan=0, totalAvansNaqd=0, totalAvansKarta=0, totalOylikTolangan=0;
      var running = openingInfo.found ? (Number(openingInfo.amount)||0) : 0;
      var openingRowHtml = openingInfo.found ?
        ('<tr><td class="cell-muted">Ой бошидаги қолдиқ</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num cell-strong">'+fmtSum(running)+'</td></tr>') : '';
      var rows = openingRowHtml + dateOrder.map(function(d){
        var b = byDate[d];
        var kartaComb = b.avansKarta + b.avansOtkazma;
        totalHisoblangan+=b.hisoblangan; totalAvansNaqd+=b.avansNaqd; totalAvansKarta+=kartaComb; totalOylikTolangan+=b.oylikTolangan;
        running += (b.hisoblangan + b.kirim) - b.chiqimTotal;
        return '<tr><td class="cell-muted">'+fmtDateShort(d)+'</td>'+
          '<td class="num" style="color:var(--good);">'+(b.hisoblangan>0?fmtSum(b.hisoblangan):"—")+'</td>'+
          '<td class="num" style="color:var(--critical);">'+(b.avansNaqd>0?fmtSum(b.avansNaqd):"—")+'</td>'+
          '<td class="num" style="color:var(--critical);">'+(kartaComb>0?fmtSum(kartaComb):"—")+'</td>'+
          '<td class="num" style="color:var(--critical);">'+(b.oylikTolangan>0?fmtSum(b.oylikTolangan):"—")+'</td>'+
          '<td class="num cell-strong">'+fmtSum(running)+'</td></tr>';
      }).join("");
      var balance = running;

      var html2 = '<div class="kpi-grid" style="margin-bottom:16px;">'+
        kpiTileFmt("Жами ҳисобланган (Наряд бўйича)", fmtSum(totalHisoblangan), "", "good")+
        kpiTileFmt("Жами аванс олган (нақд+карта)", fmtSum(totalAvansNaqd+totalAvansKarta), "", "critical")+
        kpiTileFmt("Жами ойлик тўланган (расмий)", fmtSum(totalOylikTolangan), "", "critical")+
        kpiTileFmt(balance>=0?"Ходимга қарзимиз (жорий)":"Ходимдан ортиқча тўланган", fmtSum(Math.abs(balance)), "", "accent")+
        '</div>';
      if(!dateOrder.length && !openingInfo.found){
        html2 += emptyState("Бу даврда операция йўқ","Танланган ходим ва сана оралиғида ёзув топилмади.");
      } else {
        html2 += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Наряд бўйича ҳисобланган ойлик</th><th>Накд аванс олган</th><th>Карта аванс олган</th><th>Ойлик тўланган (расмий)</th><th>Қолдиқ (ой охирига)</th></tr></thead><tbody>'+rows+
          '<tr><td class="cell-strong">Жами</td><td class="num cell-strong">'+fmtSum(totalHisoblangan)+'</td><td class="num cell-strong">'+fmtSum(totalAvansNaqd)+'</td><td class="num cell-strong">'+fmtSum(totalAvansKarta)+'</td><td class="num cell-strong">'+fmtSum(totalOylikTolangan)+'</td><td class="num cell-strong">'+fmtSum(balance)+'</td></tr>'+
          '</tbody></table></div>'+
          '<div class="field-hint" style="margin-top:10px;">Изоҳ: «Накд аванс олган» ва «Карта аванс олган» устунлари — ходимга Кассадан «Чиқим» орқали (мос равишда нақд ёки карта/пул ўтказмаси усулида) берилган, лекин расмий батч «Ходимлар бўйича иш ҳақи тўлови» орқали ЭМАС берилган суммалар; «Ойлик тўланган (расмий)» — Кассадаги «Ходимлар бўйича» батч тўлови орқали шу санада берилган расмий ойлик суммаси (нақд ёки ўтказма, иккиси ҳам ҳисобга олинади); «Қолдиқ (ой охирига)» — ой бошидаги қолдиққа ҳисобланган ойлик қўшилиб, барча аванс ва расмий тўловлар айирилган ҳолдаги якуний сумма.'+
          (openingInfo.found ? ' «Ой бошидаги қолдиқ» қатори — «Қолдиқларни киритиш» бўлимида «Санадан» майдонидаги ой учун қўлда киритилган бошланғич қарз/ортиқча тўлов суммаси (мусбат — ходимга қарзимиз, манфий — ходимдан ортиқча тўланган).' : '')+
          '</div>';
      }
      return {html: html2, hasData: (dateOrder.length>0 || openingInfo.found)};
    }

    function renderResults(){
      var resultsEl = root.querySelector("#emp-act-results");
      var from = STATE.empActFrom, to = STATE.empActTo;
      if(STATE.empActSelectAll){
        /* Барчасини танлаш: ҳар бир ходим учун (маълумоти бор бўлганлари
           учунгина — бўш ходимлар билан рўйхатни тўлдирмаслик учун)
           якка ходим танланганда чиқадиган ХУДДИ ШУНДАЙ жадвал алоҳида-
           алоҳида, ходим исми сарлавҳа қилиб, кетма-кет чиқарилади. */
        var blocksHtml = "", anyData = false;
        employeesSorted.forEach(function(e){
          var b = buildActBlock(e.id, from, to);
          if(!b.hasData) return;
          anyData = true;
          blocksHtml += '<div class="section-head" style="margin:22px 0 10px;"><h2 style="font-size:16px;">'+esc(e.fullName)+(e.position?(' <span class="cell-muted" style="font-weight:500;font-size:13px;">— '+esc(e.position)+'</span>'):'')+'</h2></div>'+b.html;
        });
        resultsEl.innerHTML = anyData ? blocksHtml : emptyState("Бу даврда операция йўқ","Танланган сана оралиғида ҳеч бир ходим бўйича ёзув топилмади.");
        return;
      }
      if(!STATE.empActEmployeeId){ resultsEl.innerHTML = emptyState("Танланмаган","Ходимни танланг ва «Излаш»ни босинг."); return; }
      resultsEl.innerHTML = buildActBlock(STATE.empActEmployeeId, from, to).html;
    }

    root.querySelector("#emp-act-search").addEventListener("click", function(){
      STATE.empActEmployeeId = root.querySelector("#emp-act-who").value;
      STATE.empActFrom = root.querySelector("#emp-act-from").value || todayISO();
      STATE.empActTo = root.querySelector("#emp-act-to").value || todayISO();
      renderResults();
    });
    if(STATE.empActSelectAll || STATE.empActEmployeeId) renderResults(); else root.querySelector("#emp-act-results").innerHTML = emptyState("Танланмаган","Ходимни танланг ва «Излаш»ни босинг.");
  }

