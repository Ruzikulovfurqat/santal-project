  /* ================= view: employees / Ҳисобот (ойлик якуний жадвал) ================= */
  /* Танланган (йил, ой) даври учун — шу даврга тўғри келувчи Наряд(лар)
     орқали ҳисобланган ойлик (кун меъёри, ишлаган куни, ҳисобланган
     ойлик) билан шу даврга тўғри келувчи Иш ҳақи ҳисоблаш(лар) орқали
     (агар қилинган бўлса) ҳисобланган Нақд/Карта улуши ва Якуний
     қолдиқни бир жадвалда бирлаштиради. Агар шу давр учун ҳали Иш ҳақи
     ҳисоблаш қилинмаган бўлса — "ушланган аванс" устунлари 0 кўрсатилади
     ва бутун ҳисобланган ойлик "Қолдиқ" устунида (нақд/карта тенг
     иккига бўлиниб) кўрсатилади — ҳисоблаш қилингандан сўнг рақамлар
     автомат тўғриланади. */
  /* Ҳисобот (Report) устунлари: №, Ф.И.Ш., Табелда киритилган ишлаган куни
     (tabelDays — Наряддаги эмас, ТАБЕЛНИНГ ЎЗИДАН), Ҳисобланган ойлиги
     (Наряддаги gross — Жарима/Қўшимчадан ОЛДИНГИ сумма), Жарима (файли
     бўлса — кўриш ҳаволаси билан), Қўшимча (файли бўлса — кўриш ҳаволаси
     билан), Аванс нақд (Аванслар бўлимидаги "advance" қиймати — ТЎҒРИДАН
     ТЎҒРИ, Иш ҳақи ҳисоблашнинг авто-бўлинган "cash"идан ЭМАС), Аванс
     карта (Кассадан пул ўтказмаси орқали шу давр учун тўланган аванслар —
     employeeCardAdvancePaidForPeriod), Картага тўланиши керак (Иш ҳақи
     ҳисоблашдаги "closing" — БИТТА устун, нақд/карта'га бўлинмайди). */
  function computeMonthlyEmployeeReport(year, month){
    var byEmp = {}, order = [];
    function row(empId, fullName){
      if(!byEmp[empId]){
        byEmp[empId] = {
          employeeId:empId, fullName:fullName||employeeName(empId),
          workedDays:0, gross:0,
          fine:0, fineFileUrl:"", fineFileName:"",
          otherAdd:0, otherAddFileUrl:"", otherAddFileName:"",
          advanceCash:0, advanceCard:0, hasPayroll:false, closing:0,
          cashOwed:0, cardPaid:0, cashPaid:0
        };
        order.push(empId);
      }
      return byEmp[empId];
    }
    STATE.salaryRuns.filter(function(r){ return !r.cancelled && r.year===year && r.month===month; }).forEach(function(r){
      computeSalaryGroups(r).forEach(function(g){
        g.rows.forEach(function(rr){
          var rw = row(rr.employeeId, rr.fullName);
          rw.workedDays += Number(rr.tabelDays)||0;
          rw.gross += Number(rr.gross)||0;
          rw.fine += Number(rr.fine)||0;
          if(rr.fineFileUrl){ rw.fineFileUrl = rr.fineFileUrl; rw.fineFileName = rr.fineFileName||"Файл"; }
          rw.otherAdd += Number(rr.otherAdd)||0;
          if(rr.otherAddFileUrl){ rw.otherAddFileUrl = rr.otherAddFileUrl; rw.otherAddFileName = rr.otherAddFileName||"Файл"; }
        });
      });
    });
    STATE.advanceRuns.filter(function(r){ return !r.cancelled && r.year===year && r.month===month; }).forEach(function(r){
      advanceRunTotals(r).rows.forEach(function(ar){
        var rw = row(ar.employeeId, ar.fullName);
        rw.advanceCash += Number(ar.advance)||0;
      });
    });
    STATE.payrollRuns.filter(function(r){ return !r.cancelled && r.year===year && r.month===month; }).forEach(function(r){
      computePayrollRows(r).forEach(function(rr){
        var rw = row(rr.employeeId, rr.fullName);
        rw.hasPayroll = true;
        /* "Картага тўланиши керак" — Иш ҳақи ҳисоблаш бўлимидаги ШУ ЁЗУВНИНГ
           ЎЗИНИНГ "Якуний қолдиғи" (rr.closing) асосида ҳисобланади (Раунд
           36 тузатиши — фойдаланувчи аниқ сўради: "иш хакини хисоблаш
           булимидаги ... якуний колдик катагидаги сумма келиб тушиши
           керак"). АВВАЛРОҚ (Раунд 31) бу ерда ФАҚАТ rr.col7 (шу даврнинг
           ўз улуши, ўтган ойлардан "opening" сифатида давом этувчи қисмисиз)
           ишлатиларди — сабаби: ўша пайтда rr.closing ҳали ҳам "музлаб
           қолиш" хатосига (қаранг: previousPayrollClosing, Раунд 35да
           тузатилди) эга бўлгани учун октябрни танлаганда сентябрнинг ЭСКИ/
           нотўғри қолдиғи хато қўшилиб кўринарди. Энди эса (Раунд 35дан
           кейин) rr.closing ҳар доим ЖОРИЙ (live) ва тўғри ҳисобланади,
           шунинг учун уни тўғридан-тўғри ишлатиш хавфсиз: агар сентябрь
           ойи тўланмаган ҳолда қолса, унинг қолдиғи октябрга ТЎҒРИ равишда
           (амалда шундай — иш ҳақи тўланмагунча "қарз" бўлиб қолаверади)
           қўшилиб кўринади — бу энди хато эмас, чунки rr.closing ҳамиша
           жорий Кассадаги тўловларни ҳисобга олади. */
        rw.closing += Number(rr.closing)||0;
        /* "Накд тўлаш керак" — Иш ҳақи ҳисоблаш бўлимидаги шу давр
           операциясининг "Нақд" катагидан (rr.cash) тўғридан-тўғри. */
        rw.cashOwed += Number(rr.cash)||0;
      });
    });
    order.forEach(function(empId){
      byEmp[empId].advanceCard = employeeCardAdvancePaidForPeriod(empId, year, month);
      /* "Карта туланди" — ФАҚАТ расмий иш ҳақи сифатида (category=
         "ish_haqi", айнан шу ҳисоблаш даврига тегишли деб белгиланган)
         пул ўтказмаси орқали тўланган суммалар: ё Кассадаги "Ходимлар
         бўйича" батч тўлови орқали, ёки Кассадаги Чиқим бўлимида ходимни
         танлаб "Ойлик" тугмаси босилиб пул ўтказмаси усулида берилган
         тўлов орқали. Оддий "Аванс" деб белгиланган ўтказмалар БУ ЕРГА
         КИРМАЙДИ (улар "Аванс карта" устунида кўринади).
         ЭСЛАТМА: аввалроқ (бир вақт) бу "ўтган ойга" силжитилган эди, лекин
         фойдаланувчи буни синаб кўриб хато топди — амалда ходим ойлигини
         АЙНАН ШУ ой учун белгилаб тўлаганда, ШУ ойнинг ЎЗИДА Ҳисоботда
         "тўланди" деб кўринишини кутади. Шунга кўра бу ерда ЖОРИЙ давр
         (year/month) га қайтарилди. МУҲИМ: бу АТАЙЛАБ Иш ҳақи ҳисоблаш
         бўлимидаги kartagaTolanganOylikAuto'дан (у ЎТГАН ойга қараб
         ҳисоблайди — фойдаланувчининг аниқ сўровига кўра, Ҳисобот билан
         Иш ҳақи ҳисоблаш бу иккитаси ҳозир АТАЙЛАБ ХАР ХИЛ мантиқда
         ишлайди) ФАРҚЛИ — бу иккисини бир-бирига мослаштиришга уринманг. */
      byEmp[empId].cardPaid = employeeBatchPayrollPaidForPeriod(empId, year, month);
      /* "Накд туланди" — Кассадаги "Ходимлар бўйича" (батч) тугмаси орқали
         айнан шу ҳисоблаш даврига тегишли деб белгиланиб, НАҚД усулида
         тўланган расмий ойлик суммаси. */
      byEmp[empId].cashPaid = employeeBatchPayrollPaidForPeriodCash(empId, year, month);
      /* "Қолдиқларни киритиш" бўлимида АЙНАН ШУ (йил/ой) учун қўлда
         киритилган бошланғич қолдиқ бор бўлса — Ҳисобот ҳам ШУ суммани
         бошланғич нуқта сифатида ҳисобга олиши керак (Иш ҳақи ҳисоблаш
         бўлимидаги "Якуний қолдиқ" ҳам худди шу мантиқ билан ҳисобланади —
         previousPayrollClosing'даги manualOpeningBalance текшируви орқали).
         МУҲИМ: бу ерда АТАЙЛАБ фақат manualOpeningBalance (айнан шу ойга
         қўлда киритилган ёзув) ишлатилади — previousPayrollClosing'нинг
         "аввалги ойнинг Иш ҳақи ҳисоблашдаги қотиб қолган Якуний қолдиғи"
         га қайтиш (fallback) қисми АТАЙЛАБ ишлатилмайди: айнан ўша fallback
         сабабли, олдинги (аввалроқ тузатилган) хато — танланган ойдан
         бошқа (масалан аввалги) ойнинг қолдиғи ҳисобот катагига "судралиб"
         қўшилиб кетар эди. */
      byEmp[empId].openingBalance = manualOpeningBalance(empId, year, month).amount;
    });
    var rows = order.map(function(empId){
      var rw = byEmp[empId];
      /* Иш ҳақи ҳисоблаш ҳали қилинмаган бўлса — "Картага тўланиши керак"
         учун вақтинчалик тахминий қиймат: Ҳисобланган (жарима/қўшимча
         билан) минус ҳозиргача берилган авансларнинг барчаси (rw.advanceCard
         — ЖОРИЙ, ҳар доим қайта ҳисобланади, "қотиб қолмайди") ва "Ойлик"
         сифатида тўланган карта тўловлари (rw.cardPaid — ХУДДИ ШУНДАЙ
         жорий), АЙНАН ШУ ойга қўлда киритилган бошланғич қолдиқ (rw.
         openingBalance) қўшилган ҳолда.
         Иш ҳақи ҳисоблаш ёзуви БЎЛСА (Раунд 36 тузатиши) — "Картага
         тўланиши керак" ЭНДИ тўғридан-тўғри rw.closing (Иш ҳақи ҳисоблаш
         бўлимидаги ШУ ойнинг "Якуний қолдиғи", rr.closing — юқорида
         йиғилган) минус rw.cardPaid (АЙНАН ШУ ойга белгиланиб, ЖОРИЙ
         (шу ой) даврида картага тўланган сумма) сифатида ҳисобланади.
         rw.closing (rr.closing) ичида АЛЛАҚАЧОН: (а) ўтган ойлардан
         занжир орқали давом этувчи тўланмаган қолдиқ (previousPayrollClosing,
         Раунд 35дан кейин ҳар доим ЖОРИЙ/тўғри), (б) АЙНАН ШУ ойга қўлда
         киритилган бошланғич қолдиқ (manualOpeningBalance — previousPayrollClosing
         ичида текширилади), (в) rw.advanceCard (cardAdvance) ва (г)
         "Иш ҳақи ҳисоблаш"даги kartagaTolanganOylikAuto (ЎТГАН ойга
         белгиланган тўлов, фойдаланувчининг АТАЙЛАБ бошқа мантиқ сўраган
         катаги) — БАРЧАСИ ҳисобга олинган, шунинг учун уларни яна қайта
         қўшиш/айириш КЕРАК ЭМАС (иккиланиб ҳисобланиб қолмаслиги учун).
         Фақат rw.cardPaid (АЙНАН ШУ ой учун белгиланиб, ШУ ойнинг ЎЗИДА
         тўланган сумма — kartagaTolanganOylikAuto ФАРҚЛИ равишда буни
         ҳисобга олмайди, чунки у фақат ЎТГАН ойга қарайди) қўшимча
         айирилади — шунда: агар шу ойнинг ўзи ҳам АЙНАН ШУ ой учун
         белгиланиб тўлиқ тўланган бўлса — 0 (Ҳисобот дарҳол "тўланди"
         деб кўрсатади, фойдаланувчи бунга алоҳида ва аниқ сўраган эди);
         агар (тўланмаган ёки қисман тўланган ҳолда) кейинги ойга ўтиб
         кетган бўлса — ўша тўланмаган қолдиқ, Иш ҳақи ҳисоблаш
         бўлимидаги "Якуний қолдиқ"билан АЙНАН БИР ХИЛ рақам сифатида,
         кейинги ойнинг Ҳисоботида ҳам тўғри давом этиб кўринади (энди
         бу — хато эмас, чунки rr.closing ҳар доим ЖОРИЙ ва тўғри).
         Иш ҳақи ҳисоблаш ёзуви ҳали БЎЛМАСА — қуйидаги (тахминий) формула
         ўзгаришсиз қолади. */
      var closing = rw.hasPayroll
        ? (rw.closing - rw.cardPaid)
        : ((rw.gross - rw.fine + rw.otherAdd) + rw.openingBalance - rw.advanceCash - rw.advanceCard - rw.cardPaid);
      /* "Накд тўлаш керак" — Иш ҳақи ҳисоблашда белгиланган нақд улуши
         (rw.cashOwed) минус Кассада «Ходимлар бўйича» орқали шу давр учун
         нақд усулида АЛЛАҚАЧОН тўланган расмий сумма (rw.cashPaid). Тўлиқ
         тўланганда — 0; қисман тўланганда — фарқи қолади. */
      var cashOwed = rw.hasPayroll ? Math.max(0, rw.cashOwed - rw.cashPaid) : rw.cashOwed;
      return {
        employeeId:empId, fullName:rw.fullName, workedDays:rw.workedDays, gross:rw.gross,
        fine:rw.fine, fineFileUrl:rw.fineFileUrl, fineFileName:rw.fineFileName,
        otherAdd:rw.otherAdd, otherAddFileUrl:rw.otherAddFileUrl, otherAddFileName:rw.otherAddFileName,
        advanceCash:rw.advanceCash, advanceCard:rw.advanceCard, closing:closing,
        cashOwed:cashOwed, cardPaid:rw.cardPaid, cashPaid:rw.cashPaid
      };
    }).sort(function(a,b){ return (a.fullName||"").localeCompare(b.fullName||""); });
    rows.forEach(function(r,i){ r.idx=i+1; });
    var totals = {workedDays:0, gross:0, fine:0, otherAdd:0, advanceCash:0, advanceCard:0, closing:0, cashOwed:0, cardPaid:0, cashPaid:0};
    rows.forEach(function(r){ totals.workedDays+=r.workedDays; totals.gross+=r.gross; totals.fine+=r.fine; totals.otherAdd+=r.otherAdd; totals.advanceCash+=r.advanceCash; totals.advanceCard+=r.advanceCard; totals.closing+=r.closing; totals.cashOwed+=r.cashOwed; totals.cardPaid+=r.cardPaid; totals.cashPaid+=r.cashPaid; });
    return {rows:rows, totals:totals};
  }

  function renderEmpReportTab(){
    setTopbar("Ҳисобот", "Ходимлар бўйича ойлик якуний жадвал", "");
    var root = document.getElementById("content");
    var curY = new Date().getFullYear();
    if(!STATE.empReportYear) STATE.empReportYear = curY;
    if(!STATE.empReportMonth) STATE.empReportMonth = new Date().getMonth()+1;
    var html = empSubnav("report")+
      '<div class="card" style="padding:18px 20px;margin-bottom:16px;"><div class="field-row">'+
        '<div class="field"><label>Йил</label><input type="number" id="er-year" value="'+esc(STATE.empReportYear||curY)+'"></div>'+
        '<div class="field"><label>Ой</label><select id="er-month">'+MONTHS_FULL.map(function(mn,i){return '<option value="'+(i+1)+'"'+(STATE.empReportMonth===(i+1)?" selected":"")+'>'+mn+'</option>';}).join("")+'</select></div>'+
        '<div class="field" style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" id="er-run">'+ICONS.search+'Кўрсатиш</button><button class="btn btn-secondary" id="er-print">'+ICONS.printer+'Чоп этиш</button><button class="btn btn-secondary" id="er-export">'+ICONS.download+'Excel’га юклаш</button></div>'+
      '</div></div><div id="er-results"></div>';
    root.innerHTML = html;
    wireEmpSubnav(root);

    function renderResults(){
      var resultsEl = root.querySelector("#er-results");
      var data = computeMonthlyEmployeeReport(STATE.empReportYear, STATE.empReportMonth);
      if(!data.rows.length){
        resultsEl.innerHTML = emptyState("Бу давр учун маълумот йўқ","Танланган йил ва ой учун Наряд ёки Иш ҳақи ҳисоблаши топилмади.");
        return;
      }
      var rows = data.rows.map(function(r){
        var fineCell = fmtSum(r.fine)+(r.fineFileUrl?(' <a href="'+esc(r.fineFileUrl)+'" target="_blank" rel="noopener" title="'+esc(r.fineFileName||"Файл")+'" style="margin-left:4px;">'+ICONS.paperclip+'</a>'):'');
        var otherAddCell = fmtSum(r.otherAdd)+(r.otherAddFileUrl?(' <a href="'+esc(r.otherAddFileUrl)+'" target="_blank" rel="noopener" title="'+esc(r.otherAddFileName||"Файл")+'" style="margin-left:4px;">'+ICONS.paperclip+'</a>'):'');
        return '<tr>'+
          '<td class="cell-muted">'+r.idx+'</td>'+
          '<td class="cell-strong">'+esc(r.fullName)+'</td>'+
          '<td class="num cell-muted">'+fmtNum(r.workedDays)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(r.gross)+'</td>'+
          '<td class="num">'+fineCell+'</td>'+
          '<td class="num">'+otherAddCell+'</td>'+
          '<td class="num">'+fmtSum(r.advanceCash)+'</td>'+
          '<td class="num">'+fmtSum(r.advanceCard)+'</td>'+
          '<td class="num cell-strong" style="'+(r.closing<0?"color:var(--critical);":"")+'">'+fmtSum(r.closing)+'</td>'+
          '<td class="num">'+fmtSum(r.cashOwed)+'</td>'+
          '<td class="num">'+fmtSum(r.cardPaid)+'</td>'+
          '<td class="num">'+fmtSum(r.cashPaid)+'</td>'+
          '</tr>';
      }).join("");
      var t = data.totals;
      /* Устунлар кўпайгани сабабли (12 та) жадвал бир қаторга сиғиши учун
         шрифт кичикроқ ва Times New Roman қилиб — ФАҚАТ шу (Ҳисобот)
         жадвалига хос inline стиль орқали — белгиланди; бошқа жадваллар
         (Наряд, Аванс, Акт сверка ва ҳ.к.) ўзгармасдан аввалги шрифтида
         қолади. */
      resultsEl.innerHTML = '<div class="table-wrap table-frozen-fio"><table style="font-family:\'Times New Roman\',Times,serif;font-size:12px;"><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Ишлаган куни</th><th>Ҳисобланган ойлиги</th><th>Жарима</th><th>Қўшимча</th><th>Аванс нақд</th><th>Аванс карта</th><th>Картага тўланиши керак</th><th>Накд тўлаш керак</th><th>Карта туланди</th><th>Накд туланди</th></tr></thead><tbody>'+rows+
        '<tr><td colspan="2" class="cell-strong">Жами</td><td class="num cell-strong">'+fmtNum(t.workedDays)+'</td><td class="num cell-strong">'+fmtSum(t.gross)+'</td><td class="num cell-strong">'+fmtSum(t.fine)+'</td><td class="num cell-strong">'+fmtSum(t.otherAdd)+'</td><td class="num cell-strong">'+fmtSum(t.advanceCash)+'</td><td class="num cell-strong">'+fmtSum(t.advanceCard)+'</td><td class="num cell-strong" style="'+(t.closing<0?"color:var(--critical);":"")+'">'+fmtSum(t.closing)+'</td><td class="num cell-strong">'+fmtSum(t.cashOwed)+'</td><td class="num cell-strong">'+fmtSum(t.cardPaid)+'</td><td class="num cell-strong">'+fmtSum(t.cashPaid)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="field-hint" style="margin-top:10px;">Эслатма: агар танланган давр учун ҳали «Иш ҳақи ҳисоблаш» қилинмаган бўлса, «Картага тўланиши керак» устунида Ҳисобланган ойлик минус ҳозиргача берилган авансларнинг тахминий қиймати кўрсатилади — ҳисоблаш қилингандан сўнг расмий рақам автомат тўғриланади. «Накд тўлаш керак» — Иш ҳақи ҳисоблашдаги «Нақд» катагидан (шу давр учун «Ходимлар бўйича» орқали нақд тўланган сумма айирилган ҳолда). «Карта туланди» — ФАҚАТ расмий иш ҳақи сифатида пул ўтказмаси орқали тўланган сумма (Кассадаги «Ходимлар бўйича» батч тўлови ёки Чиқимда «Ойлик» танлаб берилган тўлов — оддий «Аванс» ўтказмалар бу ерга кирмайди, улар «Аванс карта»да кўринади); «Накд туланди» — Кассадаги «Ходимлар бўйича» тугмаси орқали нақд усулида тўланган расмий ойлик. «Картага тўланиши керак» — тегишли тўланган сумма билан ТЎЛИҚ ёпилса, 0 (нол) кўрсатади; қисман тўланган бўлса — қолган фарқи кўринади; АРТИҚЧА тўланган бўлса (ходимга керагидан кўп берилган бўлса) — манфий сон (масалан -1 000 000) қизил рангда кўрсатилади. «Накд тўлаш керак» — тўлиқ ёпилса 0, қисман тўланса фарқи кўринади.</div>';
    }

    root.querySelector("#er-year").addEventListener("change", function(){ STATE.empReportYear = Number(this.value)||curY; });
    root.querySelector("#er-month").addEventListener("change", function(){ STATE.empReportMonth = Number(this.value)||1; });
    root.querySelector("#er-run").addEventListener("click", function(){
      STATE.empReportYear = Number(root.querySelector("#er-year").value)||curY;
      STATE.empReportMonth = Number(root.querySelector("#er-month").value)||1;
      renderResults();
    });
    root.querySelector("#er-print").addEventListener("click", function(){ printEmpMonthlyReport(STATE.empReportYear, STATE.empReportMonth); });
    root.querySelector("#er-export").addEventListener("click", function(){ exportEmpMonthlyReport(STATE.empReportYear, STATE.empReportMonth); });
    renderResults();
  }

  function printEmpMonthlyReport(year, month){
    var periodLabel = (MONTHS_FULL[(month||1)-1]||"")+" "+year+" йил";
    var data = computeMonthlyEmployeeReport(year, month);
    var rows = data.rows.map(function(r){
      var fineTxt = fmtSum(r.fine)+(r.fineFileUrl?" (акт бор)":"");
      var otherAddTxt = fmtSum(r.otherAdd)+(r.otherAddFileUrl?" (акт бор)":"");
      return '<tr><td>'+r.idx+'</td><td>'+esc(r.fullName)+'</td>'+
        '<td style="text-align:right;">'+fmtNum(r.workedDays)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.gross)+'</td><td style="text-align:right;">'+esc(fineTxt)+'</td>'+
        '<td style="text-align:right;">'+esc(otherAddTxt)+'</td><td style="text-align:right;">'+fmtSum(r.advanceCash)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.advanceCard)+'</td>'+
        '<td style="text-align:right;font-weight:700;">'+fmtSum(r.closing)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.cashOwed)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.cardPaid)+'</td>'+
        '<td style="text-align:right;">'+fmtSum(r.cashPaid)+'</td></tr>';
    }).join("");
    var t = data.totals;
    var body = '<table style="font-family:\'Times New Roman\',Times,serif;font-size:11px;"><tr><th>№</th><th>Ф.И.Ш.</th><th style="text-align:right;">Ишлаган куни</th>'+
      '<th style="text-align:right;">Ҳисобланган</th><th style="text-align:right;">Жарима</th><th style="text-align:right;">Қўшимча</th>'+
      '<th style="text-align:right;">Аванс нақд</th><th style="text-align:right;">Аванс карта</th><th style="text-align:right;">Картага тўланиши керак</th>'+
      '<th style="text-align:right;">Накд тўлаш керак</th><th style="text-align:right;">Карта туланди</th><th style="text-align:right;">Накд туланди</th></tr>'+
      rows+
      '<tr><td colspan="2" style="font-weight:700;background:#f4f5f7;">Жами</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtNum(t.workedDays)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.gross)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.fine)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.otherAdd)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.advanceCash)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.advanceCard)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.closing)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.cashOwed)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.cardPaid)+'</td>'+
      '<td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(t.cashPaid)+'</td></tr>'+
      '</table>'+
      '<div class="v-sign"><div>Ҳисоблади</div><div>Тасдиқлади</div></div>';
    var html = voucherShell("Ходимлар бўйича ҳисобот", "Давр: "+esc(periodLabel), body, "wide payroll-print");
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function exportEmpMonthlyReport(year, month){
    var periodLabel = (MONTHS_FULL[(month||1)-1]||"")+" "+year+" йил";
    var data = computeMonthlyEmployeeReport(year, month);
    var headers = ["№","Ф.И.Ш.","Ишлаган куни","Ҳисобланган ойлиги","Жарима","Жарима файли","Қўшимча","Қўшимча файли","Аванс нақд","Аванс карта","Картага тўланиши керак","Накд тўлаш керак","Карта туланди","Накд туланди"];
    var dataRows = data.rows.map(function(r){
      return [r.idx, r.fullName, r.workedDays, Math.round(r.gross*100)/100,
        Math.round(r.fine*100)/100, r.fineFileUrl||"",
        Math.round(r.otherAdd*100)/100, r.otherAddFileUrl||"",
        Math.round(r.advanceCash*100)/100, Math.round(r.advanceCard*100)/100, Math.round(r.closing*100)/100,
        Math.round(r.cashOwed*100)/100, Math.round(r.cardPaid*100)/100, Math.round(r.cashPaid*100)/100];
    });
    exportHtmlTableAsExcel("Hisobot_"+year+"_"+String(month).padStart(2,"0")+".xls", "Ҳисобот — "+periodLabel, headers, dataRows);
    toast("Excel файли юкланмоқда");
  }

  function renderEmpOpsTab(){
    setTopbar("Ходимлар рўйхати", STATE.employeeOps.length+" та операция",
      '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-secondary" id="empChangeBtn">'+ICONS.swap+'Ходимни ўзгартириш</button><button class="btn btn-secondary" id="empCatBtn">'+ICONS.swap+'Ходимларни бошқа категорияга ўтказиш</button><button class="btn btn-secondary" id="empFireBtn">'+ICONS.ban+'Ходимни бўшатиш</button><button class="btn btn-primary" id="empHireBtn">'+ICONS.plus+'Яратиш</button></div>');
    var root = document.getElementById("content");
    var html = empSubnav("list")+sampleBanner();
    /* Саналар энди ЯРАТИЛГАН вақти (createdAt) бўйича эмас, балки
       операциянинг ЎЗИГА киритилган санаси (op.date) бўйича камайиш
       тартибида сараланади (2026-10-01 сўрови). */
    var allOps = STATE.employeeOps.slice().sort(function(a,b){
      var ad=a.date||"", bd=b.date||"";
      if(ad!==bd) return bd.localeCompare(ad);
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    var baseOps = STATE.empOpsOnlyActive!==false ? allOps.filter(function(o){ return !o.cancelled; }) : allOps;
    var searchQ = (STATE.empOpsSearch||"").trim().toLowerCase();
    var ops = searchQ ? baseOps.filter(function(op){
      var emp = employeeById(op.employeeId);
      return emp && (emp.fullName||"").toLowerCase().indexOf(searchQ)>-1;
    }) : baseOps;
    html += '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">'+
      '<div class="search-box" style="max-width:320px;margin-bottom:0;">'+ICONS.search+'<input type="text" id="empops-search" placeholder="Ходим исмини излаш…" value="'+esc(STATE.empOpsSearch||"")+'"></div>'+
      onlyActiveCheckboxHtml("empops-onlyactive", STATE.empOpsOnlyActive)+
      '</div>';
    if(!allOps.length){
      html += emptyState("Ҳали операция йўқ", "«Яратиш» тугмаси орқали янги ходимни ишга қабул қилинг.");
    } else if(!ops.length){
      html += emptyState("Ҳеч нарса топилмади", "Бошқа исм билан қидириб кўринг.");
    } else {
      var rows = ops.map(function(op, idx){
        var emp = employeeById(op.employeeId);
        var name = emp ? emp.fullName : "— (ходим топилмади) —";
        var typeChip = op.type==="hire" ? '<span class="chip chip-good">Ишга қабул</span>' :
          op.type==="salary_change" ? '<span class="chip chip-accent">Оклад ўзгартирилди</span>' :
          op.type==="category_change" ? '<span class="chip chip-warning">Категорияга ўтказилди</span><div class="cell-muted" style="font-size:12px;margin-top:3px;">'+esc(op.fromCategory||"—")+' → '+esc(op.toCategory||"—")+(op.number?(' (№ '+esc(op.number)+')'):'')+'</div>' :
          '<span class="chip chip-critical">Бўшатиш</span>';
        return '<tr'+(op.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(op.date)+'</td>'+
          '<td class="cell-strong">'+esc(name)+'</td>'+
          '<td>'+typeChip+'</td>'+
          '<td>'+(op.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            (op.cancelled?'':'<button class="btn btn-ghost btn-icon" data-op-edit="'+op.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            '<button class="btn btn-ghost btn-icon" data-op-print="'+op.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
            (emp?'<button class="btn btn-ghost btn-icon" data-op-equip="'+esc(emp.id)+'" title="Бириктирилган жиҳозлар">'+ICONS.box+'</button>':'')+
            (op.cancelled?'':'<button class="btn btn-ghost btn-icon" data-op-cancel="'+op.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (op.cancelled?'<button class="btn btn-ghost btn-icon" data-op-restore="'+op.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Ходим</th><th>Амал</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireEmpSubnav(root);
    var empOpsSearchEl = document.getElementById("empops-search");
    if(empOpsSearchEl){
      empOpsSearchEl.addEventListener("input", function(){
        STATE.empOpsSearch = empOpsSearchEl.value; render();
        var e2=document.getElementById("empops-search"); if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); }
      });
    }
    var empOpsOnlyActiveEl = document.getElementById("empops-onlyactive");
    if(empOpsOnlyActiveEl){
      empOpsOnlyActiveEl.addEventListener("change", function(){ STATE.empOpsOnlyActive = empOpsOnlyActiveEl.checked; render(); });
    }
    document.getElementById("empHireBtn").addEventListener("click", function(){ openEmployeeForm(null); });
    document.getElementById("empFireBtn").addEventListener("click", function(){ openTerminateEmployeeForm(null); });
    document.getElementById("empChangeBtn").addEventListener("click", function(){ openSalaryChangeForm(null); });
    document.getElementById("empCatBtn").addEventListener("click", function(){ openEmpCategoryTransferForm(null); });
    root.querySelectorAll("[data-op-print]").forEach(function(b){ b.addEventListener("click", function(){
      printEmployeeOpVoucher(ops.find(function(x){return x.id===b.getAttribute("data-op-print");}));
    }); });
    root.querySelectorAll("[data-op-equip]").forEach(function(b){ b.addEventListener("click", function(){
      openEmployeeEquipmentModal(b.getAttribute("data-op-equip"));
    }); });
    root.querySelectorAll("[data-op-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var op = ops.find(function(x){return x.id===b.getAttribute("data-op-edit");});
      if(!op) return;
      if(op.type==="hire") openEmployeeForm(employeeById(op.employeeId), null, op);
      else if(op.type==="salary_change") openSalaryChangeForm(op);
      else if(op.type==="category_change") openEmpCategoryTransferForm(op);
      else openTerminateEmployeeForm(op);
    }); });
    root.querySelectorAll("[data-op-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var op = ops.find(function(x){return x.id===b.getAttribute("data-op-cancel");});
      if(!op) return;
      var msg = op.type==="hire"
        ? "Бу қабул операцияси бекор қилинсинми? Ходим «Бўшаган» ҳолатига ўтказилади, лекин барча маълумотлари сақланиб қолади."
        : op.type==="salary_change"
        ? "Бу оклад ўзгартириш операцияси бекор қилинсинми? Ходимнинг олдинги оклад суммаси ("+fmtSum(op.previousAmount)+") тикланади."
        : op.type==="category_change"
        ? "Бу категорияга ўтказиш бекор қилинсинми? Ходимнинг олдинги категорияси («"+(op.fromCategory||"—")+"») тикланади."
        : "Бу бўшатиш операцияси бекор қилинсинми? Ходим қайта «Фаол» ҳолатига ўтказилади.";
      openConfirm("Операцияни бекор қилиш", msg, "Ҳа, бекор қилиш", function(){
        dbUpdate("employeeOps", op.id, {cancelled:true}, STATE.employeeOps);
        var emp = employeeById(op.employeeId);
        if(emp){
          if(op.type==="hire") dbUpdate("employees", emp.id, {status:"bo'shagan"}, STATE.employees);
          else if(op.type==="salary_change") dbUpdate("employees", emp.id, {salaryAmount:Number(op.previousAmount)||0}, STATE.employees);
          else if(op.type==="category_change") dbUpdate("employees", emp.id, {category:op.fromCategory||""}, STATE.employees);
          else dbUpdate("employees", emp.id, {status:"faol", terminationDate:""}, STATE.employees);
        }
        toast("Бекор қилинди");
      }, true);
    }); });
    root.querySelectorAll("[data-op-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var op = ops.find(function(x){return x.id===b.getAttribute("data-op-restore");});
      if(!op) return;
      var msg = op.type==="hire"
        ? "Бу қабул операцияси қайта тикланиб, ходим яна «Фаол» ҳолатига ўтказилсинми?"
        : op.type==="salary_change"
        ? "Бу оклад ўзгартириш операцияси қайта тикланиб, ходимнинг оклади яна "+fmtSum(op.newAmount)+" сўм қилинсинми?"
        : op.type==="category_change"
        ? "Бу ўтказиш қайта тикланиб, ходим яна «"+(op.toCategory||"—")+"» категориясига ўтказилсинми?"
        : "Бу бўшатиш операцияси қайта тикланиб, ходим яна «Бўшаган» ҳолатига ўтказилсинми?";
      openConfirm("Операцияни тиклаш", msg, "Ҳа, тиклаш", function(){
        dbUpdate("employeeOps", op.id, {cancelled:false}, STATE.employeeOps);
        var emp = employeeById(op.employeeId);
        if(emp){
          if(op.type==="hire") dbUpdate("employees", emp.id, {status:"faol"}, STATE.employees);
          else if(op.type==="salary_change") dbUpdate("employees", emp.id, {salaryAmount:Number(op.newAmount)||0}, STATE.employees);
          else if(op.type==="category_change") dbUpdate("employees", emp.id, {category:op.toCategory||""}, STATE.employees);
          else dbUpdate("employees", emp.id, {status:"bo'shagan", terminationDate:op.date||todayISO()}, STATE.employees);
        }
        toast("Тикланди");
      }, true);
    }); });
  }
  /* "Ходимлар рўйхати" бўлимидаги ҳар бир операцияни (ишга қабул, оклад
     ўзгартириш, бўшатиш) чиройли жадвал кўринишида чоп этиш — фойдаланувчи
     сўровига кўра (2026-09-30). Ҳужжат сарлавҳаси операция турига қараб
     ўзгаради: ишга қабул бўлса "Ишга қабул қилиш тўғрисида", бўшатиш бўлса
     "Меҳнат шартномасини бекор қилиш тўғрисида". */
  function printEmployeeOpVoucher(op){
    if(!op) return;
    var emp = employeeById(op.employeeId);
    var empName = emp ? emp.fullName : "— (ходим топилмади) —";
    var position = emp ? (emp.position||"—") : "—";
    var title, body;
    if(op.type==="hire"){
      var salaryTypeLabel = (SALARY_TYPES.find(function(s){return s[0]===(emp?emp.salaryType:"");})||[])[1]||"—";
      title = "Ишга қабул қилиш тўғрисида";
      body = '<table>'+
        '<tr><td>Ф.И.Ш.</td><td style="text-align:right;">'+esc(empName)+'</td></tr>'+
        '<tr><td>Лавозим</td><td style="text-align:right;">'+esc(position)+'</td></tr>'+
        '<tr><td>Ишга қабул санаси</td><td style="text-align:right;">'+fmtDateShort(op.date)+'</td></tr>'+
        (emp&&emp.workshopId?('<tr><td>Цех</td><td style="text-align:right;">'+esc(workshopName(emp.workshopId))+'</td></tr>'):'')+
        '<tr><td>Иш ҳақи тури</td><td style="text-align:right;">'+esc(salaryTypeLabel)+'</td></tr>'+
        '<tr><td>Иш ҳақи миқдори</td><td style="text-align:right;">'+fmtSum(emp?emp.salaryAmount:0)+'</td></tr>'+
        (emp&&emp.passportNumber?('<tr><td>Паспорт рақами</td><td style="text-align:right;">'+esc(emp.passportNumber)+'</td></tr>'):'')+
        (emp&&emp.phone?('<tr><td>Телефон</td><td style="text-align:right;">'+esc(emp.phone)+'</td></tr>'):'')+
        (emp&&emp.address?('<tr><td>Манзили</td><td style="text-align:right;">'+esc(emp.address)+'</td></tr>'):'')+
        '</table>'+
        '<div class="v-sign"><div>Иш берувчи</div><div>Ходим</div></div>';
    } else if(op.type==="fire"){
      title = "Меҳнат шартномасини бекор қилиш тўғрисида";
      body = '<table>'+
        '<tr><td>Ф.И.Ш.</td><td style="text-align:right;">'+esc(empName)+'</td></tr>'+
        '<tr><td>Лавозим</td><td style="text-align:right;">'+esc(position)+'</td></tr>'+
        '<tr><td>Ишга қабул санаси</td><td style="text-align:right;">'+fmtDateShort(emp?emp.hireDate:"")+'</td></tr>'+
        '<tr><td>Меҳнат шартномаси бекор қилинган сана</td><td style="text-align:right;">'+fmtDateShort(op.date)+'</td></tr>'+
        '</table>'+
        '<div class="v-sign"><div>Иш берувчи</div><div>Ходим</div></div>';
    } else if(op.type==="category_change"){
      title = "Бошқа категорияга ўтказиш тўғрисида";
      body = '<table>'+
        '<tr><td>Тартиб рақами</td><td style="text-align:right;">'+esc(op.number||"")+'</td></tr>'+
        '<tr><td>Сана</td><td style="text-align:right;">'+fmtDateShort(op.date)+'</td></tr>'+
        '<tr><td>Ф.И.Ш.</td><td style="text-align:right;">'+esc(empName)+'</td></tr>'+
        '<tr><td>Лавозим</td><td style="text-align:right;">'+esc(position)+'</td></tr>'+
        '<tr><td>Олдинги категория</td><td style="text-align:right;">'+esc(op.fromCategory||"—")+'</td></tr>'+
        '<tr><td>Янги категория</td><td style="text-align:right;">'+esc(op.toCategory||"—")+'</td></tr>'+
        (op.note?('<tr><td>Изоҳ</td><td style="text-align:right;">'+esc(op.note)+'</td></tr>'):'')+
        '</table>'+
        '<div class="v-sign"><div>Иш берувчи</div><div>Ходим</div></div>';
    } else {
      title = "Оклад ўзгартириш тўғрисида";
      body = '<table>'+
        '<tr><td>Ф.И.Ш.</td><td style="text-align:right;">'+esc(empName)+'</td></tr>'+
        '<tr><td>Лавозим</td><td style="text-align:right;">'+esc(position)+'</td></tr>'+
        '<tr><td>Сана</td><td style="text-align:right;">'+fmtDateShort(op.date)+'</td></tr>'+
        '<tr><td>Амал қилиш санаси</td><td style="text-align:right;">'+fmtDateShort(op.effectiveDate||op.date)+'</td></tr>'+
        '<tr><td>Олдинги оклад</td><td style="text-align:right;">'+fmtSum(op.previousAmount)+'</td></tr>'+
        '<tr><td>Янги оклад</td><td style="text-align:right;">'+fmtSum(op.newAmount)+'</td></tr>'+
        (op.note?('<tr><td>Изоҳ</td><td style="text-align:right;">'+esc(op.note)+'</td></tr>'):'')+
        '</table>'+
        '<div class="v-sign"><div>Иш берувчи</div><div>Ходим</div></div>';
    }
    var html = voucherShell(title, "Сана: "+esc(fmtDateShort(op.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function openTerminateEmployeeForm(existingOp){
    var isEdit = !!(existingOp && existingOp.id);
    var date = isEdit ? existingOp.date : todayISO();
    var selectedEmpId = isEdit ? existingOp.employeeId : "";
    var selectable = STATE.employees.filter(function(e){ return e.status!=="bo'shagan" || e.id===selectedEmpId; });
    var body = '<div class="field"><label>Сана</label><input id="tf-date" type="date" value="'+esc(date)+'"></div>'+
      '<div class="field"><label>Ходим</label><select id="tf-emp"><option value="">— танланг —</option>'+
        selectable.map(function(e){return '<option value="'+e.id+'"'+(selectedEmpId===e.id?" selected":"")+'>'+esc(e.fullName)+'</option>';}).join("")+
      '</select></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" style="background:var(--critical);border-color:var(--critical);" data-save>Бўшатиш</button>';
    var m = openModal(isEdit?"Бўшатишни таҳрирлаш":"Ходимни бўшатиш", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var empId = m.querySelector("#tf-emp").value;
      var d = m.querySelector("#tf-date").value || todayISO();
      if(!empId){ toast("Ходимни танланг"); return; }
      if(isEdit){
        dbUpdate("employeeOps", existingOp.id, {date:d, employeeId:empId}, STATE.employeeOps);
        dbUpdate("employees", empId, {status:"bo'shagan", terminationDate:d}, STATE.employees);
        toast("Сақланди");
      } else {
        dbUpdate("employees", empId, {status:"bo'shagan", terminationDate:d}, STATE.employees);
        dbSet("employeeOps", uid(), {type:"fire", date:d, employeeId:empId, cancelled:false, createdAt:new Date().toISOString()}, STATE.employeeOps);
        toast("Ходим бўшатилди");
      }
      closeModal();
    });
  }

  function openSalaryChangeForm(existingOp){
    var isEdit = !!(existingOp && existingOp.id);
    var date = isEdit ? existingOp.date : todayISO();
    var effectiveDate = isEdit ? (existingOp.effectiveDate||existingOp.date) : todayISO();
    var selectedEmpId = isEdit ? existingOp.employeeId : "";
    var selectable = STATE.employees.filter(function(e){ return e.status!=="bo'shagan" || e.id===selectedEmpId; });
    var startAmount = isEdit ? existingOp.newAmount : (selectedEmpId ? (employeeById(selectedEmpId)||{}).salaryAmount : 0);
    var body = '<div class="field"><label>Сана</label><input id="sc-date" type="date" value="'+esc(date)+'"></div>'+
      '<div class="field-row">'+
        '<div class="field"><label>Ходим</label><select id="sc-emp"><option value="">— танланг —</option>'+
          selectable.map(function(e){return '<option value="'+e.id+'"'+(selectedEmpId===e.id?" selected":"")+'>'+esc(e.fullName)+'</option>';}).join("")+
        '</select></div>'+
        '<div class="field"><label>Давр (қайси санадан амал қилади)</label><input id="sc-effdate" type="date" value="'+esc(effectiveDate)+'"></div>'+
      '</div>'+
      '<div class="field"><label>Янги оклад суммаси (сўм)</label><input id="sc-amount" type="number" min="0" step="any" value="'+esc(startAmount||0)+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="sc-note">'+esc(existingOp?existingOp.note||"":"")+'</textarea></div>'+
      '<div class="field-hint">Мисол: оклад 5 000 000 сўм эди, 15-санадан 6 000 000 сўмга ўзгартирилди — шунда иш ҳақи ҳисоблашда 15-санагача бўлган давр эски оклад бўйича, 15-санадан кейинги давр янги оклад бўйича автомат ҳисобланади.</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Ўзгартиришни таҳрирлаш":"Ходимни ўзгартириш", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    if(!isEdit){
      m.querySelector("#sc-emp").addEventListener("change", function(){
        var emp = employeeById(m.querySelector("#sc-emp").value);
        m.querySelector("#sc-amount").value = emp ? (Number(emp.salaryAmount)||0) : 0;
      });
    }
    m.querySelector("[data-save]").addEventListener("click", function(){
      var empId = m.querySelector("#sc-emp").value;
      var d = m.querySelector("#sc-date").value || todayISO();
      var effD = m.querySelector("#sc-effdate").value || d;
      var newAmount = Number(m.querySelector("#sc-amount").value)||0;
      var note = m.querySelector("#sc-note").value.trim();
      if(!empId){ toast("Ходимни танланг"); return; }
      if(isEdit){
        dbUpdate("employeeOps", existingOp.id, {date:d, employeeId:empId, effectiveDate:effD, newAmount:newAmount, note:note}, STATE.employeeOps);
        dbUpdate("employees", empId, {salaryAmount:newAmount}, STATE.employees);
        toast("Сақланди");
      } else {
        var emp = employeeById(empId);
        var previousAmount = emp ? (Number(emp.salaryAmount)||0) : 0;
        dbUpdate("employees", empId, {salaryAmount:newAmount}, STATE.employees);
        dbSet("employeeOps", uid(), {type:"salary_change", date:d, employeeId:empId, effectiveDate:effD, previousAmount:previousAmount, newAmount:newAmount, note:note, cancelled:false, createdAt:new Date().toISOString()}, STATE.employeeOps);
        toast("Оклад ўзгартирилди");
      }
      closeModal();
    });
  }

  function renderWorkshops(){
    setTopbar("Цехлар", STATE.workshops.length+" та цех", '<button class="btn btn-primary" id="addWsBtn">'+ICONS.plus+'Цех қўшиш</button>');
    var root = document.getElementById("content");
    var list = STATE.workshops.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var html = empSubnav("workshops");
    if(!list.length){
      html += emptyState("Цехлар йўқ","Буюртмага цех бириктириш учун шу ерда ёки буюртма шаклида «+» тугмаси орқали қўшинг.");
    } else {
      var rows = list.map(function(w){
        var activeOrders = STATE.orders.filter(function(o){ return o.workshopId===w.id && !o.completed && !o.cancelled; }).length;
        return '<tr>'+
          '<td class="cell-strong">'+esc(w.name)+'</td>'+
          '<td class="cell-muted">'+(w.headEmployeeId?esc(employeeName(w.headEmployeeId)):"—")+'</td>'+
          '<td class="num">'+activeOrders+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-edit-ws="'+w.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-del-ws="'+w.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Цех</th><th>Цех бошлиғи</th><th>Жараёндаги буюртмалар</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireEmpSubnav(root);
    document.getElementById("addWsBtn").addEventListener("click", function(){ openWorkshopForm(null); });
    root.querySelectorAll("[data-edit-ws]").forEach(function(b){ b.addEventListener("click", function(){ openWorkshopForm(workshopById(b.getAttribute("data-edit-ws"))); }); });
    root.querySelectorAll("[data-del-ws]").forEach(function(b){ b.addEventListener("click", function(){
      var w = workshopById(b.getAttribute("data-del-ws"));
      openConfirm("Цехни ўчириш","«"+w.name+"» ўчирилсинми? Унга бириктирилган буюртмалар сақланиб қолади, лекин цех рўйхатдан йўқолади.","Ҳа, ўчириш", function(){ dbDelete("workshops", w.id, STATE.workshops); toast("Ўчирилди"); }, true);
    }); });
  }

  /* ---- Ходим категориялари (2026-10-06) ---- */
  var EMP_CAT_DEFAULTS = ["Радиатор Цех","Токар Цех","Кўмир Катёл цех","Газ катёл цех"];
  /* Фойдаланувчи сўровига кўра (2026-10-15): ходим картасидаги
     «Категория» рўйхати «Омборлар → Бошқарув» бўлимидаги категориялардан
     автомат олинади. Эски ёзувлар йўқолмаслиги учун илгари киритилган
     ходим категориялари (empCategories) ва стандарт номлар ҳам
     рўйхатда қолади. */
  function empCategoryList(){
    var out = [], seen = {};
    var push = function(n){
      n = String(n||"").trim();
      if(!n) return;
      var k = n.toLowerCase();
      if(seen[k]) return;
      seen[k] = true; out.push(n);
    };
    STATE.categories.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); }).forEach(function(c){ push(c.name); });
    push(FIN_ADMIN_NAME);
    EMP_CAT_DEFAULTS.forEach(push);
    (STATE.empCategories||[]).slice().sort(function(a,b){ return (a.createdAt||"").localeCompare(b.createdAt||""); }).forEach(function(c){ push(c.name); });
    return out;
  }
  function empCategoryOptionsHtml(selected){
    var list = empCategoryList();
    if(selected && list.indexOf(selected)<0) list.push(selected);
    return '<option value="">— танланмаган —</option>'+list.map(function(n){ return '<option value="'+esc(n)+'"'+(selected===n?" selected":"")+'>'+esc(n)+'</option>'; }).join("");
  }
  function openEmpCategoryForm(onSaved, onCancel){
    var body = '<div class="field"><label>Категория номи</label><input id="ec-name" placeholder="Масалан: Пайвандлаш цехи"></div>'+
      '<div class="field-hint">Категория «Омборлар → Бошқарув» бўлимидаги умумий категориялар рўйхатига қўшилади.</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Янги категория", body, foot, false, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#ec-name").value.trim();
      if(!name){ toast("Категория номини киритинг"); return; }
      var exists = empCategoryList().filter(function(n){ return n.toLowerCase()===name.toLowerCase(); })[0];
      if(!exists) dbAdd("categories", {name:name, createdAt:new Date().toISOString()}, STATE.categories);
      toast("Категория сақланди");
      closeModal();
      if(onSaved) onSaved(exists||name);
    });
  }
  /* Ходимни бошқа категорияга ўтказиш — employeeOps ичида type:"category_change" */
  function openEmpCategoryTransferForm(existingOp, draft){
    var isEdit = !!(existingOp && existingOp.id);
    var d = draft || {};
    var nextNo = 1;
    STATE.employeeOps.forEach(function(o){ if(o.type==="category_change"){ var n = Number(o.number)||0; if(n>=nextNo) nextNo = n+1; } });
    var number = isEdit ? (existingOp.number||"") : (d.number||nextNo);
    var date = isEdit ? (d.date||existingOp.date) : (d.date||todayISO());
    var selectedEmpId = isEdit ? existingOp.employeeId : (d.employeeId||"");
    var toCat = isEdit ? (d.toCategory!==undefined?d.toCategory:existingOp.toCategory) : (d.toCategory||"");
    var note = isEdit ? (d.note!==undefined?d.note:(existingOp.note||"")) : (d.note||"");
    var selectable = STATE.employees.filter(function(e){ return e.status!=="bo'shagan" || e.id===selectedEmpId; })
      .sort(function(a,b){ return (a.fullName||"").localeCompare(b.fullName||""); });
    var body = '<div class="field-row"><div class="field"><label>Тартиб рақами</label><input id="ct-no" type="text" value="'+esc(number)+'" readonly></div>'+
      '<div class="field"><label>Сана</label><input id="ct-date" type="date" value="'+esc(date)+'"></div></div>'+
      '<div class="field"><label>Ходим</label><select id="ct-emp"'+(isEdit?' disabled':'')+'><option value="">— танланг —</option>'+
        selectable.map(function(e){ return '<option value="'+e.id+'"'+(selectedEmpId===e.id?" selected":"")+'>'+esc(e.fullName)+'</option>'; }).join("")+
      '</select></div>'+
      '<div class="field-row"><div class="field"><label>Ҳозирги категорияси</label><input id="ct-cur" type="text" readonly value=""></div>'+
      '<div class="field"><label>Қайси категорияга ўтади</label><div style="display:flex;gap:6px;"><select id="ct-to" style="flex:1;min-width:0;"'+(isEdit?' disabled':'')+'>'+empCategoryOptionsHtml(toCat)+'</select>'+
        (isEdit?'':'<button type="button" class="btn btn-secondary btn-icon" id="ct-to-add" title="Янги категория қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button>')+'</div></div></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="ct-note">'+esc(note)+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Категорияга ўтказишни таҳрирлаш":"Ходимни бошқа категорияга ўтказиш", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    function curOf(empId){
      if(isEdit && existingOp.fromCategory!==undefined) return existingOp.fromCategory||"";
      var emp = employeeById(empId); return emp ? (emp.category||"") : "";
    }
    function showCur(){
      var v = curOf(m.querySelector("#ct-emp").value);
      m.querySelector("#ct-cur").value = m.querySelector("#ct-emp").value ? (v||"— категория йўқ —") : "";
    }
    showCur();
    m.querySelector("#ct-emp").addEventListener("change", showCur);
    var addBtn = m.querySelector("#ct-to-add");
    if(addBtn) addBtn.addEventListener("click", function(){
      var dr = {number:number, date:m.querySelector("#ct-date").value, employeeId:m.querySelector("#ct-emp").value, toCategory:m.querySelector("#ct-to").value, note:m.querySelector("#ct-note").value};
      closeModal();
      openEmpCategoryForm(function(name){ dr.toCategory = name; openEmpCategoryTransferForm(null, dr); }, function(){ openEmpCategoryTransferForm(null, dr); });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var empId = m.querySelector("#ct-emp").value;
      var dt = m.querySelector("#ct-date").value || todayISO();
      var nt = m.querySelector("#ct-note").value.trim();
      if(isEdit){
        dbUpdate("employeeOps", existingOp.id, {date:dt, note:nt}, STATE.employeeOps);
        toast("Сақланди"); closeModal(); return;
      }
      var to = m.querySelector("#ct-to").value;
      if(!empId){ toast("Ходимни танланг"); return; }
      if(!to){ toast("Қайси категорияга ўтишини танланг"); return; }
      var from = curOf(empId);
      if(from===to){ toast("Ходим аллақачон шу категорияда"); return; }
      /* Ўтказиш санаси ёзиб қўйилади — ҳисоботларда шу санадан бошлаб
         (ўша ойдан) ходим янги категорияга тегишли бўлади, олдинги
         ойлардаги иш ҳақи ҳисоблари ўзгармайди (2026-10-17). */
      dbUpdate("employees", empId, {category:to}, STATE.employees);
      dbSet("employeeOps", uid(), {type:"category_change", number:number, date:dt, employeeId:empId, fromCategory:from, toCategory:to, note:nt, cancelled:false, createdAt:new Date().toISOString()}, STATE.employeeOps);
      toast("Ходим «"+to+"» категориясига ўтказилди");
      closeModal();
    });
  }

  function openEmployeeForm(existing, onSaved, hireOp, onCancel){
    var isEdit = !!(existing && existing.id);
    var e = existing || {firstName:"", lastName:"", middleName:"", fullName:"", passportNumber:"", address:"", position:"", phone:"", familyPhone:"", hireDate:todayISO(), salaryType:"oylik", salaryAmount:0, status:"faol", jobDescription:"", workshopId:"", terminationDate:""};
    /* Best-effort split of a legacy combined fullName into three parts, purely
       to pre-fill the edit form — nothing is written until the user saves, so
       an old record that is only viewed (not edited) is never touched. */
    var nf = {first:e.firstName||"", last:e.lastName||"", middle:e.middleName||""};
    if(!nf.first && !nf.last && !nf.middle && e.fullName){
      var parts = e.fullName.trim().split(/\s+/);
      nf.last = parts[0]||""; nf.first = parts[1]||""; nf.middle = parts.slice(2).join(" ")||"";
    }
    var body = '<div class="field"><label>Ишга қабул санаси</label><input id="e-hire" type="date" value="'+esc(e.hireDate||todayISO())+'"></div>'+
      '<div class="field-row"><div class="field"><label>Исм</label><input id="e-first" placeholder="Акмал" value="'+esc(nf.first)+'"></div>'+
      '<div class="field"><label>Фамилия</label><input id="e-last" placeholder="Каримов" value="'+esc(nf.last)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Отасининг исми <span class="opt">(ихтиёрий)</span></label><input id="e-middle" placeholder="Тошпўлатович" value="'+esc(nf.middle)+'"></div>'+
      '<div class="field"><label>Паспорт рақами <span class="opt">(ихтиёрий)</span></label><input id="e-passport" placeholder="AA1234567" value="'+esc(e.passportNumber||"")+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Телефон <span class="opt">(ихтиёрий)</span></label><input id="e-phone" placeholder="+998 90 123 45 67" value="'+esc(e.phone||"")+'"></div>'+
      '<div class="field"><label>Оила аъзосининг телефони <span class="opt">(ихтиёрий)</span></label><input id="e-familyPhone" placeholder="+998 90 123 45 67" value="'+esc(e.familyPhone||"")+'"></div></div>'+
      '<div class="field"><label>Манзили <span class="opt">(ихтиёрий)</span></label><input id="e-address" placeholder="Шаҳар, туман, кўча" value="'+esc(e.address||"")+'"></div>'+
      '<div class="field-row"><div class="field"><label>Лавозим</label><input id="e-position" placeholder="Масалан: Пайвандчи" value="'+esc(e.position||"")+'"></div>'+
      '<div class="field"><label>Цех <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><select id="e-workshop" style="flex:1;min-width:0;"><option value="">— танланмаган —</option>'+STATE.workshops.map(function(w){return '<option value="'+w.id+'"'+(e.workshopId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="e-workshop-add" title="Янги цех қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div></div>'+
      '<div class="field"><label>Категория <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><select id="e-category" style="flex:1;min-width:0;">'+empCategoryOptionsHtml(e.category||"")+'</select><button type="button" class="btn btn-secondary btn-icon" id="e-category-add" title="Янги категория қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field-row"><div class="field"><label>Иш ҳақи тури</label><select id="e-salaryType">'+SALARY_TYPES.map(function(s){return '<option value="'+s[0]+'"'+(e.salaryType===s[0]?" selected":"")+'>'+s[1]+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Иш ҳақи миқдори (сўм)</label><input id="e-salaryAmount" type="number" min="0" step="1000" value="'+esc(e.salaryAmount||0)+'"></div></div>'+
      '<div class="field"><label>Бириктирилган вазифалар / лавозим йўриқномаси <span class="opt">(ихтиёрий)</span></label><textarea id="e-jobDesc" placeholder="Ходимнинг асосий вазифалари…">'+esc(e.jobDescription||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Қўшиш")+'</button>';
    var m = openModal(isEdit?"Ходимни таҳрирлаш":"Янги ходим", body, foot, true, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    var snapshotEmpFields = function(){
      return {
        firstName: m.querySelector("#e-first").value, lastName: m.querySelector("#e-last").value, middleName: m.querySelector("#e-middle").value,
        passportNumber: m.querySelector("#e-passport").value, address: m.querySelector("#e-address").value,
        position: m.querySelector("#e-position").value,
        phone: m.querySelector("#e-phone").value, familyPhone: m.querySelector("#e-familyPhone").value,
        hireDate: m.querySelector("#e-hire").value,
        salaryType: m.querySelector("#e-salaryType").value, salaryAmount: m.querySelector("#e-salaryAmount").value,
        workshopId: m.querySelector("#e-workshop").value, category: m.querySelector("#e-category").value, jobDescription: m.querySelector("#e-jobDesc").value
      };
    };
    var wsAddBtn2 = m.querySelector("#e-workshop-add");
    if(wsAddBtn2) wsAddBtn2.addEventListener("click", function(){
      var draft = Object.assign({}, e, snapshotEmpFields());
      if(isEdit) draft.id = e.id;
      closeModal();
      openWorkshopForm(null, function(workshopId){
        draft.workshopId = workshopId||"";
        openEmployeeForm(draft, onSaved, hireOp, onCancel);
      }, function(){ openEmployeeForm(draft, onSaved, hireOp, onCancel); });
    });
    var catAddBtn = m.querySelector("#e-category-add");
    if(catAddBtn) catAddBtn.addEventListener("click", function(){
      var draft = Object.assign({}, e, snapshotEmpFields());
      if(isEdit) draft.id = e.id;
      closeModal();
      openEmpCategoryForm(function(name){
        draft.category = name||"";
        openEmployeeForm(draft, onSaved, hireOp, onCancel);
      }, function(){ openEmployeeForm(draft, onSaved, hireOp, onCancel); });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var firstName = m.querySelector("#e-first").value.trim();
      var lastName = m.querySelector("#e-last").value.trim();
      var middleName = m.querySelector("#e-middle").value.trim();
      var position = m.querySelector("#e-position").value.trim();
      if(!firstName || !lastName){ toast("Исм ва фамилияни киритинг"); return; }
      if(!position){ toast("Лавозимни киритинг"); return; }
      var fullName = [lastName, firstName, middleName].filter(Boolean).join(" ");
      var hireDate = m.querySelector("#e-hire").value || todayISO();
      var data = {
        firstName:firstName, lastName:lastName, middleName:middleName, fullName:fullName,
        passportNumber:m.querySelector("#e-passport").value.trim(), address:m.querySelector("#e-address").value.trim(),
        position:position, phone:m.querySelector("#e-phone").value.trim(),
        familyPhone:m.querySelector("#e-familyPhone").value.trim(),
        hireDate:hireDate,
        salaryType:m.querySelector("#e-salaryType").value, salaryAmount:Number(m.querySelector("#e-salaryAmount").value)||0,
        workshopId:m.querySelector("#e-workshop").value,
        category:m.querySelector("#e-category").value,
        jobDescription:m.querySelector("#e-jobDesc").value.trim(),
      };
      if(isEdit){
        /* Фойдаланувчи сўровига кўра (2026-10-17): оклад ўзгартирилса —
           ўзгариш САНАСИ ёзиб қўйилади (salary_change тарихи), шунда
           олдинги ойларнинг иш ҳақи ҳисоблари эски оклад билан
           қолади, янги оклад эса фақат шу санадан бошлаб амал қилади.
           Худди шундай, категория ўзгартирилса — category_change
           тарихи ёзилади. */
        var prevSalary = Number(e.salaryAmount)||0;
        var prevCategory = String(e.category||"").trim();
        dbUpdate("employees", e.id, data, STATE.employees);
        if(hireOp) dbUpdate("employeeOps", hireOp.id, {date:hireDate}, STATE.employeeOps);
        if(Math.abs(prevSalary - (Number(data.salaryAmount)||0)) > 0.004){
          dbSet("employeeOps", uid(), {type:"salary_change", date:todayISO(), employeeId:e.id,
            effectiveDate:todayISO(), previousAmount:prevSalary, newAmount:Number(data.salaryAmount)||0,
            note:"Ходим маълумотини таҳрирлашда ўзгартирилди", cancelled:false,
            createdAt:new Date().toISOString()}, STATE.employeeOps);
        }
        if(prevCategory && String(data.category||"").trim() && prevCategory!==String(data.category||"").trim()){
          dbSet("employeeOps", uid(), {type:"category_change", date:todayISO(), employeeId:e.id,
            fromCategory:prevCategory, toCategory:String(data.category||"").trim(),
            note:"Ходим маълумотини таҳрирлашда ўзгартирилди", cancelled:false,
            createdAt:new Date().toISOString()}, STATE.employeeOps);
        }
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(e.id, data.fullName);
      } else {
        data.status = "faol"; data.terminationDate = "";
        /* The employee id is generated here (client side) rather than left to
           dbAdd's server-assigned id, because the "hire" operation record
           below needs a stable employeeId to reference immediately — using
           dbAdd's temporary id here would race with reconcilePendingId (the
           op could get re-synced from the server with the stale temp id
           before the swap lands). dbSet with an explicit id sidesteps that
           entirely, the same way stock docs use a deterministic id. */
        var newEmpId = uid();
        dbSet("employees", newEmpId, data, STATE.employees);
        toast("Ходим қўшилди");
        dbSet("employeeOps", uid(), {type:"hire", date:hireDate, employeeId:newEmpId, cancelled:false, createdAt:new Date().toISOString()}, STATE.employeeOps);
        closeModal();
        if(onSaved) onSaved(newEmpId, data.fullName);
      }
    });
  }

  /* ---- Табел ---- */
  function renderTabelTab(){
    setTopbar("Табел", STATE.timesheets.length+" та табел", '<button class="btn btn-primary" id="tabelCreateBtn">'+ICONS.plus+'Яратиш</button>');
    var root = document.getElementById("content");
    var html = empSubnav("tabel")+sampleBanner();
    /* Саналар энди ЯРАТИЛГАН вақти эмас, балки киритилган санаси (t.date)
       бўйича камайиш тартибида сараланади; давр (йил) тугмаси орқали
       фақат танланган йилга тегишли табеллар кўрсатилади (2026-10-01). */
    var allList = STATE.timesheets.slice().sort(function(a,b){
      var ad=a.date||(a.createdAt||"").slice(0,10), bd=b.date||(b.createdAt||"").slice(0,10);
      if(ad!==bd) return bd.localeCompare(ad);
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    html += '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:4px;">'+
      yearPickerHtml("tabel", STATE.tabelYear, STATE.tabelYearWin)+
      onlyActiveCheckboxHtml("tabel-onlyactive", STATE.tabelOnlyActive)+
      '</div>';
    var yearList = allList.filter(function(t){ return (t.year||0)===STATE.tabelYear; });
    var list = STATE.tabelOnlyActive!==false ? yearList.filter(function(t){ return !t.cancelled; }) : yearList;
    if(!allList.length){
      html += emptyState("Ҳали табел йўқ", "«Яратиш» тугмаси орқали ойлик табелни киритинг.");
    } else if(!yearList.length){
      html += emptyState("Бу йилда табел йўқ", "Бошқа йилни танланг ёки «Яратиш» тугмаси орқали янги табел киритинг.");
    } else if(!list.length){
      html += emptyState("Ҳеч нарса топилмади", "Бу йилда фақат бекор қилинган ёзувлар бор — уларни кўриш учун «Фақат бажарилганлар» белгисини олиб ташланг.");
    } else {
      var rows = list.map(function(t, idx){
        var periodLabel = (MONTHS_FULL[(t.month||1)-1]||"")+" "+t.year+" йил";
        var empCount = (t.entries||[]).length;
        return '<tr'+(t.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(t.date||(t.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(periodLabel)+'</td>'+
          '<td class="num cell-muted">'+empCount+' та ходим</td>'+
          '<td>'+(t.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-ts-view="'+t.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
            (t.cancelled?'':'<button class="btn btn-ghost btn-icon" data-ts-edit="'+t.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (t.cancelled?'':'<button class="btn btn-ghost btn-icon" data-ts-cancel="'+t.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (t.cancelled?'<button class="btn btn-ghost btn-icon" data-ts-restore="'+t.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-ts-print="'+t.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Давр</th><th>Ходимлар</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireEmpSubnav(root);
    wireYearPicker(root, "tabel",
      function(){ return STATE.tabelYear; }, function(y){ STATE.tabelYear=y; },
      function(){ return STATE.tabelYearWin; }, function(w){ STATE.tabelYearWin=w; },
      renderTabelTab);
    var tabelOnlyActiveEl = document.getElementById("tabel-onlyactive");
    if(tabelOnlyActiveEl) tabelOnlyActiveEl.addEventListener("change", function(){ STATE.tabelOnlyActive = tabelOnlyActiveEl.checked; renderTabelTab(); });
    document.getElementById("tabelCreateBtn").addEventListener("click", function(){ openTimesheetForm(null); });
    root.querySelectorAll("[data-ts-view]").forEach(function(b){ b.addEventListener("click", function(){ openTimesheetDetail(list.find(function(x){return x.id===b.getAttribute("data-ts-view");})); }); });
    root.querySelectorAll("[data-ts-edit]").forEach(function(b){ b.addEventListener("click", function(){ openTimesheetForm(list.find(function(x){return x.id===b.getAttribute("data-ts-edit");})); }); });
    root.querySelectorAll("[data-ts-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var t = list.find(function(x){return x.id===b.getAttribute("data-ts-cancel");});
      openConfirm("Табелни бекор қилиш", "Бу табел бекор қилинсинми? Ёзув тарихда сақланиб қолади.", "Ҳа, бекор қилиш", function(){ dbUpdate("timesheets", t.id, {cancelled:true}, STATE.timesheets); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-ts-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var t = list.find(function(x){return x.id===b.getAttribute("data-ts-restore");});
      openConfirm("Табелни тиклаш", "Бу табел қайта тикланиб, фаол ҳолатга қайтарилсинми?", "Ҳа, тиклаш", function(){ dbUpdate("timesheets", t.id, {cancelled:false}, STATE.timesheets); toast("Тикланди"); }, true);
    }); });
    root.querySelectorAll("[data-ts-print]").forEach(function(b){ b.addEventListener("click", function(){
      printTimesheet(list.find(function(x){return x.id===b.getAttribute("data-ts-print");}));
    }); });
  }

  function openTimesheetForm(existing){
    var isEdit = !!(existing && existing.id);
    var curY = new Date().getFullYear();
    var t = existing || {year:curY, month:new Date().getMonth()+1, entries:[], workDaysSelected:[], date: todayISO()};
    var entries = (t.entries||[]).map(function(x){ return Object.assign({}, x); });
    var body = '<div class="field"><label>Табел қачон яратилгани (сана)</label><input type="date" id="ts-date" value="'+esc(t.date||todayISO())+'" style="width:100%;"></div>'+
      '<div class="field-row">'+
      '<div class="field"><label>Йил</label><input type="number" id="ts-year" value="'+esc(t.year||curY)+'" style="width:100%;"></div>'+
      '<div class="field"><label>Ой</label><select id="ts-month">'+MONTHS_FULL.map(function(mn,i){return '<option value="'+(i+1)+'"'+(t.month===(i+1)?" selected":"")+'>'+mn+'</option>';}).join("")+'</select></div>'+
      '</div>'+
      '<div id="ts-calendar"></div>'+
      '<div style="display:flex;gap:8px;margin:4px 0 14px;flex-wrap:wrap;">'+
        '<button type="button" class="btn btn-secondary" id="ts-add-all">Барча ходимлар</button>'+
        '<button type="button" class="btn btn-secondary" id="ts-add-one">'+ICONS.plus+'Ходим қўшиш</button>'+
      '</div>'+
      '<div id="ts-rows"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Табелни таҳрирлаш":"Янги табел", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    /* Календарь ФАҚАТ шу ойдаги "умумий иш куни" (масалан, дам олиш
       кунларини айириб ташлаб ҳисобланган норма) курсатиш учун — у ҳеч
       қандай ходимнинг "Кун" (қанча кун ишлагани) майдонига таъсир
       қилмайди. Ҳар бир ходимнинг қанча кун ишлаганини маъмур ўзи қўлда
       киритади. Умумий иш куни сони табел билан бирга сақланади ва
       кейинчалик оклад ҳисоблашда (оклад / умумий иш куни * ходим ишлаган
       куни) стандарт қиймат сифатида ишлатилади. */
    var totalWorkDays = Array.isArray(t.workDaysSelected) ? t.workDaysSelected.slice() : [];
    function currentYM(){
      return { year: Number(m.querySelector("#ts-year").value)||curY, month: Number(m.querySelector("#ts-month").value)||1 };
    }
    function syncEntriesFromInputs(){
      entries.forEach(function(en, idx){
        var sel = m.querySelector('[data-ts-emp-select="'+idx+'"]');
        if(sel) en.employeeId = sel.value;
        var ws = m.querySelector('[data-ts-workshop="'+idx+'"]'); if(ws) en.workshopId = ws.value;
        var d = m.querySelector('[data-ts-days="'+idx+'"]'); if(d) en.days = Number(d.value)||0;
        var h = m.querySelector('[data-ts-hours="'+idx+'"]'); if(h) en.hours = Number(h.value)||0;
      });
    }
    function renderCalendar(){
      var ym = currentYM();
      var lastDay = daysInMonth(ym.year, ym.month);
      var dayBtns = "";
      for(var d=1; d<=lastDay; d++){
        var isSel = totalWorkDays.indexOf(d)>-1;
        dayBtns += '<button type="button" class="pill-filter'+(isSel?" active":"")+'" data-ts-cal-day="'+d+'" style="padding:5px 0;font-size:11.5px;min-width:0;text-align:center;">'+d+'</button>';
      }
      m.querySelector("#ts-calendar").innerHTML = '<div class="card" style="padding:12px 14px;background:var(--surface-2);margin:-2px 0 14px;">'+
        '<div class="field-hint" style="margin-bottom:8px;">'+esc(MONTHS_FULL[ym.month-1]||"")+' ойидаги иш кунлари календари — бу фақат ойдаги УМУМИЙ иш кунини белгилайди (масалан, оклад ҳисоблашда ишлатилади) ва ҳеч бир ходимнинг «Кун» майдонига таъсир қилмайди — уни пастда ҳар бир ходим учун ўзингиз алоҳида, қўлда киритасиз.</div>'+
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">'+dayBtns+'</div>'+
        '<div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap;">'+
          '<button type="button" class="btn btn-ghost btn-sm" id="ts-cal-clear">Тозалаш</button>'+
          '<div class="chip chip-accent" id="ts-cal-total">Умумий иш куни: <b style="margin-left:4px;">'+totalWorkDays.length+'</b></div>'+
        '</div>'+
        '</div>';
      m.querySelector("#ts-cal-clear").addEventListener("click", function(){
        totalWorkDays = [];
        renderCalendar();
      });
      m.querySelectorAll('[data-ts-cal-day]').forEach(function(btn){
        btn.addEventListener("click", function(){
          var day = Number(btn.getAttribute("data-ts-cal-day"));
          var pos = totalWorkDays.indexOf(day);
          if(pos>-1) totalWorkDays.splice(pos,1); else totalWorkDays.push(day);
          totalWorkDays.sort(function(a,b){return a-b;});
          renderCalendar();
        });
      });
    }
    function renderRows(){
      var rowsHtml = entries.map(function(en, idx){
        var emp = employeeById(en.employeeId);
        return '<div class="field-row" style="grid-template-columns:1fr 1fr 70px 70px 34px;align-items:end;gap:8px;margin-bottom:8px;">'+
          '<div class="field" style="margin-bottom:0;"><label>'+(idx+1)+'. Ходим</label>'+
            (emp ? '<input disabled value="'+esc(emp.fullName)+'">' :
              '<select data-ts-emp-select="'+idx+'"><option value="">— танланг —</option>'+STATE.employees.filter(function(x){return x.status!=="bo'shagan";}).map(function(x){return '<option value="'+x.id+'">'+esc(x.fullName)+'</option>';}).join("")+'</select>')+
          '</div>'+
          '<div class="field" style="margin-bottom:0;"><label>Цех</label><div style="display:flex;gap:6px;"><select data-ts-workshop="'+idx+'" style="flex:1;min-width:0;"><option value="">— танланмаган —</option>'+STATE.workshops.map(function(w){return '<option value="'+w.id+'"'+((en.workshopId||"")===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" data-ts-ws-add="'+idx+'" title="Янги цех қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
          '<div class="field" style="margin-bottom:0;"><label>Кун</label><input type="number" min="0" max="31" data-ts-days="'+idx+'" value="'+esc(en.days||0)+'"></div>'+
          '<div class="field" style="margin-bottom:0;"><label>Соат</label><input type="number" min="0" data-ts-hours="'+idx+'" value="'+esc(en.hours||0)+'"></div>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-ts-remove="'+idx+'" title="Ўчириш" style="margin-bottom:2px;">'+ICONS.trash+'</button>'+
        '</div>';
      }).join("");
      m.querySelector("#ts-rows").innerHTML = rowsHtml || '<div class="field-hint" style="margin-bottom:10px;">Ҳали ходим қўшилмаган.</div>';
      m.querySelectorAll('[data-ts-remove]').forEach(function(btn){
        btn.addEventListener("click", function(){
          syncEntriesFromInputs();
          entries.splice(Number(btn.getAttribute("data-ts-remove")), 1);
          renderRows();
        });
      });
      m.querySelectorAll('[data-ts-ws-add]').forEach(function(btn){
        btn.addEventListener("click", function(){
          syncEntriesFromInputs();
          var idx = Number(btn.getAttribute("data-ts-ws-add"));
          var draft = {
            year: Number(m.querySelector("#ts-year").value)||curY,
            month: Number(m.querySelector("#ts-month").value)||1,
            entries: entries.map(function(x){ return Object.assign({}, x); })
          };
          if(isEdit) draft.id = t.id;
          closeModal();
          openWorkshopForm(null, function(workshopId){
            draft.entries[idx].workshopId = workshopId||"";
            openTimesheetForm(draft);
          });
        });
      });
      m.querySelectorAll('[data-ts-days],[data-ts-hours],[data-ts-emp-select],[data-ts-workshop]').forEach(function(inp){
        inp.addEventListener("change", syncEntriesFromInputs);
      });
    }
    renderCalendar();
    renderRows();
    /* Ой/йил ўзгартирилса, шу ойдаги кун сони ҳам ўзгариши мумкин — аввал
       танланган кунлардан янги ойда мавжуд бўлмаганлари (масалан 31-кун,
       янги ой 30 кунлик бўлса) авто тозаланади. Календарь ҳали ишлатилмаган
       бўлса — ходимларнинг "Кун" қийматларига умуман тегилмайди, у фақат
       ойдаги умумий иш кунини кўрсатади ва табел билан бирга сақланади. */
    m.querySelector("#ts-year").addEventListener("change", function(){
      syncEntriesFromInputs();
      var ym = currentYM();
      var lastDay = daysInMonth(ym.year, ym.month);
      totalWorkDays = totalWorkDays.filter(function(d){return d<=lastDay;});
      renderCalendar();
    });
    m.querySelector("#ts-month").addEventListener("change", function(){
      syncEntriesFromInputs();
      var ym = currentYM();
      var lastDay = daysInMonth(ym.year, ym.month);
      totalWorkDays = totalWorkDays.filter(function(d){return d<=lastDay;});
      renderCalendar();
    });
    m.querySelector("#ts-add-all").addEventListener("click", function(){
      syncEntriesFromInputs();
      var existingIds = entries.map(function(en){return en.employeeId;});
      STATE.employees.filter(function(x){ return x.status!=="bo'shagan" && existingIds.indexOf(x.id)===-1; }).forEach(function(x){
        entries.push({employeeId:x.id, days:0, hours:0, workshopId:x.workshopId||""});
      });
      renderRows();
    });
    m.querySelector("#ts-add-one").addEventListener("click", function(){
      syncEntriesFromInputs();
      entries.push({employeeId:"", days:0, hours:0, workshopId:""});
      renderRows();
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      syncEntriesFromInputs();
      var dateVal = m.querySelector("#ts-date").value || todayISO();
      var year = Number(m.querySelector("#ts-year").value)||curY;
      var month = Number(m.querySelector("#ts-month").value)||1;
      var cleanEntries = entries.filter(function(en){ return en.employeeId; });
      if(!cleanEntries.length){ toast("Камида битта ходим қўшинг"); return; }
      var data = {date:dateVal, year:year, month:month, entries:cleanEntries, workDaysSelected:totalWorkDays.slice(), totalWorkDays:totalWorkDays.length, cancelled:false};
      if(isEdit){ dbUpdate("timesheets", t.id, data, STATE.timesheets); toast("Сақланди"); }
      else { data.createdAt=new Date().toISOString(); dbAdd("timesheets", data, STATE.timesheets); toast("Табел сақланди"); }
      closeModal();
    });
  }

  /* Табел ичидаги ходимлар рўйхатини (кун/соат) кўриш учун ўқишга мўлжалланган
     деталь ойна — фойдаланувчи сўровига кўра (2026-09-30), рўйхатдаги "кўз"
     тугмаси орқали очилади. Ёпиш билан бирга, қулайлик учун таҳрирлаш
     (бекор қилинмаган бўлса) ва чоп этиш тугмалари ҳам бор. */
  function openTimesheetDetail(t){
    if(!t) return;
    var periodLabel = (MONTHS_FULL[(t.month||1)-1]||"")+" "+t.year+" йил";
    var rows = (t.entries||[]).map(function(en, idx){
      var emp = employeeById(en.employeeId);
      return '<tr><td class="cell-muted">'+(idx+1)+'</td><td class="cell-strong">'+esc(emp?emp.fullName:"— (ходим топилмади) —")+'</td><td class="cell-muted">'+esc(en.workshopId?workshopName(en.workshopId):"—")+'</td><td class="num">'+(en.days||0)+'</td><td class="num">'+(en.hours||0)+'</td></tr>';
    }).join("");
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Давр</div><div class="dd">'+esc(periodLabel)+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(t.date||(t.createdAt||"").slice(0,10))+'</div></div>'+
      '<div><div class="dl">Ходимлар сони</div><div class="dd">'+(t.entries||[]).length+'</div></div>'+
      '<div><div class="dl">Ҳолат</div><div class="dd">'+(t.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</div></div>'+
      '</div>'+
      (rows ? '<div class="table-wrap"><table><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Цех</th><th>Кун</th><th>Соат</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="field-hint">Ходимлар йўқ</div>');
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button>'+
      '<button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button>'+
      (t.cancelled?'':'<button class="btn btn-primary" data-edit>Таҳрирлаш</button>');
    var m = openModal("Табел — "+esc(periodLabel), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printTimesheet(t); });
    var editBtn = m.querySelector("[data-edit]");
    if(editBtn) editBtn.addEventListener("click", function(){ closeModal(); openTimesheetForm(t); });
  }

  function printTimesheet(t){
    if(!t) return;
    var periodLabel = (MONTHS_FULL[(t.month||1)-1]||"")+" "+t.year+" йил";
    var rows = (t.entries||[]).map(function(en, idx){
      var emp = employeeById(en.employeeId);
      return '<tr><td>'+(idx+1)+'</td><td>'+esc(emp?emp.fullName:"—")+'</td><td>'+esc(en.workshopId?workshopName(en.workshopId):"—")+'</td><td style="text-align:right;">'+(en.days||0)+'</td><td style="text-align:right;">'+(en.hours||0)+'</td></tr>';
    }).join("");
    var body = '<table><tr><th>№</th><th>Ф.И.Ш.</th><th>Цех</th><th style="text-align:right;">Кун</th><th style="text-align:right;">Соат</th></tr>'+
      rows+
      '</table>'+
      '<div class="v-sign"><div>Тайёрлади</div><div>Тасдиқлади</div></div>';
    /* "wide payroll-print" — Иш ҳақи ведомостисидагидек кенгроқ, кичикроқ
       шрифтли жадвал: кўп ходимли табелларда барча қаторлар бир саҳифага
       сиғиши учун (2026-10-01 сўрови: аввал ярми саҳифага сиғмай қоларди). */
    var html = voucherShell("Табел", "Давр: "+esc(periodLabel)+" · Сана: "+esc(fmtDateShort(t.date||(t.createdAt||"").slice(0,10))), body, "wide payroll-print");
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  /* ---- Иш ҳақи ҳисоблаш ---- */
  function salaryRunById(id){ return STATE.salaryRuns.find(function(x){return x.id===id;}); }

  function daysInMonth(year, month){ return new Date(year, month, 0).getDate(); }

  /* Splits a given month into oklad amount intervals for an employee, based on
     non-cancelled "salary_change" employeeOps whose effectiveDate falls on or
     before the month's end. Lets a mid-month oklad change (e.g. rate changes
     from the 15th) be paid at the old rate before the change and the new rate
     from the change date onward, instead of one flat rate for the whole month. */
  /* Ходимнинг АЙНАН ШУ ойдаги категорияси — «бошқа категорияга
     ўтказиш» амаллари тарихи бўйича (2026-10-17 сўрови). Ўтказилган
     санадан бошлаб (шу санани ўз ичига олган ойдан) янги категория
     амал қилади; ундан олдинги ойлардаги ҳисоб-китоблар ўзгармайди.
     Йил/ой берилмаса — ходимнинг жорий категорияси қайтарилади. */
  function employeeCategoryOn(employeeId, year, month){
    var emp = employeeById(employeeId);
    var cur = emp ? String(emp.category||"").trim() : "";
    if(!year || !month) return cur;
    var ops = STATE.employeeOps.filter(function(o){
      return o.type==="category_change" && o.employeeId===employeeId && !o.cancelled && (o.date||o.effectiveDate);
    }).map(function(o){
      return {d:String(o.date||o.effectiveDate), from:String(o.fromCategory||"").trim(), to:String(o.toCategory||"").trim()};
    }).sort(function(a,b){ return a.d.localeCompare(b.d); });
    if(!ops.length) return cur;
    var lastDay = daysInMonth(year, month);
    var monthEnd = year+"-"+String(month).padStart(2,"0")+"-"+String(lastDay).padStart(2,"0");
    var applied = ops.filter(function(o){ return o.d<=monthEnd; });
    if(applied.length) return applied[applied.length-1].to;
    /* Биринчи ўтказишдан ҳам олдинги давр — ўшандаги эски категория. */
    return ops[0].from || cur;
  }
  function employeeOkladIntervalsForMonth(employeeId, year, month, currentSalaryAmount){
    var lastDay = daysInMonth(year, month);
    var mm = String(month).padStart(2,"0");
    var monthStartStr = year+"-"+mm+"-01";
    var monthEndStr = year+"-"+mm+"-"+String(lastDay).padStart(2,"0");
    var ops = STATE.employeeOps.filter(function(o){
      return o.type==="salary_change" && o.employeeId===employeeId && !o.cancelled && o.effectiveDate;
    }).slice().sort(function(a,b){ return a.effectiveDate.localeCompare(b.effectiveDate); });
    if(!ops.length){
      return [{from:1, to:lastDay, amount:Number(currentSalaryAmount)||0}];
    }
    var opsBeforeOrAtStart = ops.filter(function(o){ return o.effectiveDate<=monthStartStr; });
    var openingAmount = opsBeforeOrAtStart.length ? opsBeforeOrAtStart[opsBeforeOrAtStart.length-1].newAmount : ops[0].previousAmount;
    var opsWithinMonth = ops.filter(function(o){ return o.effectiveDate>monthStartStr && o.effectiveDate<=monthEndStr; });
    var intervals = [];
    var cursorDay = 1, cursorAmount = Number(openingAmount)||0;
    opsWithinMonth.forEach(function(o){
      var changeDay = Number(o.effectiveDate.slice(8,10));
      if(changeDay>cursorDay) intervals.push({from:cursorDay, to:changeDay-1, amount:cursorAmount});
      cursorDay = changeDay;
      cursorAmount = Number(o.newAmount)||0;
    });
    intervals.push({from:cursorDay, to:lastDay, amount:cursorAmount});
    return intervals;
  }

  function computeSalaryGroups(fs){
    var ts = STATE.timesheets.find(function(x){return x.id===fs.timesheetId;});
    var entries = ts ? (ts.entries||[]) : [];
    /* Табелда танланган умумий иш куни (агар киритилган бўлса) оклад
       ҳисоблашдаги "Ойдаги умумий иш куни" учун ФАҚАТ шу қиймат
       ишлатилади (қўлда ўзгартириш/"қолиб кетиш" имконисиз — доим
       танланган Табелнинг ўзидан келади). Эски табеллар (бу майдонсиз)
       учун олдингидек 26 га тушади. */
    var defaultNormDays = (ts && ts.totalWorkDays) ? Number(ts.totalWorkDays) : 26;
    var groupsMap = {}, order = [];
    entries.forEach(function(en){
      var key = en.workshopId || "";
      if(!groupsMap[key]){ groupsMap[key] = []; order.push(key); }
      groupsMap[key].push(en);
    });
    order.sort(function(a,b){
      if(a==="") return 1; if(b==="") return -1;
      return workshopName(a).localeCompare(workshopName(b));
    });
    var idxCounter = 0;
    return order.map(function(key){
      var wsOv = (fs.workshops && fs.workshops[key]) || {};
      var qty = Number(wsOv.qty)||0, price = Number(wsOv.price)||0;
      /* normDays ва day энди ҳеч қачон қўлда ёзилган (эски, бошқа давр
         танланганда "қолиб кетган") қийматлардан emas, ФАҚАТ шу наряд
         учун танланган Табелнинг ЎЗИДАН олинади — давр (йил/ой/Табел)
         алмаштирилганда доим тўғри, жорий Табелга мос қиймат чиқиши учун
         (олдин мавжуд бўлган wsOv.normDays / empOv.day'ни устун қўювчи
         "override" механизми атайлаб олиб ташланди). */
      var normDays = defaultNormDays;
      var prodTotal = qty*price;
      var rowsPre = groupsMap[key].map(function(en){
        var emp = employeeById(en.employeeId);
        var entryKey = en.employeeId + "|" + key;
        /* Жарима/Қўшимча/Изоҳ/файл каби (кун ва нормадан фарқли,
           ҳақиқатан ҳам маъмур қўлда киритадиган) қийматлар учун — битта
           ходим шу наряд ичида БИР НЕЧТА цехда (бир нечта Табел ёзувида)
           қатнашса, ҳар бир ёзув ўзининг АЛОҲИДА (entryKey =
           employeeId+"|"+workshopKey) қийматига эга бўлиши учун аввало
           entryKey бўйича, топилмаса эски (фақат employeeId бўйича
           сақланган) ёзувлар билан мослик учун employeeId бўйича қидирилади. */
        var empOv = (fs.employees && (fs.employees[entryKey] || fs.employees[en.employeeId])) || {};
        var day = Number(en.days)||0;
        var salaryType = emp ? emp.salaryType : "ishbay";
        return {en:en, emp:emp, empOv:empOv, entryKey:entryKey, day:day, salaryType:salaryType};
      });
      var nonOkladDaysSum = rowsPre.filter(function(r){return r.salaryType!=="oylik";}).reduce(function(s,r){return s+r.day;},0);
      var hasNonOklad = rowsPre.some(function(r){return r.salaryType!=="oylik";});
      var hasOklad = rowsPre.some(function(r){return r.salaryType==="oylik";});
      var rows = rowsPre.map(function(r){
        idxCounter++;
        var oklad = r.emp ? Number(r.emp.salaryAmount)||0 : 0;
        var gross = 0;
        if(r.salaryType==="oylik"){
          if(normDays>0 && fs.year && fs.month){
            var lastDay = daysInMonth(fs.year, fs.month);
            var intervals = employeeOkladIntervalsForMonth(r.en.employeeId, fs.year, fs.month, oklad);
            intervals.forEach(function(iv){
              var calDays = iv.to-iv.from+1;
              var fraction = lastDay>0 ? calDays/lastDay : 0;
              gross += (Number(iv.amount)||0)/normDays*(r.day*fraction);
            });
          }
        }
        else { gross = nonOkladDaysSum>0 ? (prodTotal/nonOkladDaysSum*r.day) : 0; }
        /* Аванс ва Бошка ушланма катаклари наряд шаклидан олиб ташланди —
           авансни энди алоҳида «Аванслар» бўлими (шу наряднинг Қолдиғи
           асосида) бошқаради. Наряд ичида фақат Жарима (айирилади) ва
           Қўшимча (қўшилади) қолди — иккисига ҳам файл (акт) бириктириш
           мумкин. */
        var fine = Number(r.empOv.fine)||0, otherAdd = Number(r.empOv.otherAdd)||0;
        var net = gross - fine + otherAdd;
        return {
          idx: idxCounter, employeeId: r.en.employeeId, entryKey: r.entryKey, fullName: r.emp?r.emp.fullName:"— (ходим топилмади) —",
          tabelDays: r.en.days||0, tabelHours: r.en.hours||0, salaryType: r.salaryType,
          oklad: oklad, day: r.day, gross: gross, fine: fine,
          fineFileName: r.empOv.fineFileName||"", fineFileUrl: r.empOv.fineFileUrl||"", fineFileAssetId: r.empOv.fineFileAssetId||"",
          otherAdd: otherAdd,
          otherAddFileName: r.empOv.otherAddFileName||"", otherAddFileUrl: r.empOv.otherAddFileUrl||"", otherAddFileAssetId: r.empOv.otherAddFileAssetId||"",
          note: r.empOv.note||"", net: net
        };
      });
      var groupGross = rows.reduce(function(s,r){return s+r.gross;},0);
      var groupNet = rows.reduce(function(s,r){return s+r.net;},0);
      return {
        key:key, workshopName: key?workshopName(key):"Цех белгиланмаган",
        qty:qty, price:price, normDays:normDays, prodTotal:prodTotal,
        hasNonOklad:hasNonOklad, hasOklad:hasOklad,
        rows: rows, groupGross: groupGross, groupNet: groupNet
      };
    });
  }

  function salaryRunTotals(fs){
    var groups = computeSalaryGroups(fs);
    var gross=0, net=0, empCount=0;
    groups.forEach(function(g){ gross+=g.groupGross; net+=g.groupNet; empCount+=g.rows.length; });
    return {groups:groups, gross:gross, net:net, empCount:empCount};
  }

  /* Шу битта ҳисоблашнинг (иш ҳақи "run") ичидаги — ходимлар бўйича
     тафсилотли — сатрларини Excel'га туширади (умумий рўйхат эмас, худди
     чоп этиладиган ведомостидаги каби ҳар бир ходимнинг ҳисобланган
     ойлиги, жарима, аванс, қўшимча ва қолдиғи). */
  function exportSalaryRunDetail(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var groups = computeSalaryGroups(run);
    var headers = ["№","Ф.И.Ш.","Цех","Кун","Ҳисобланган","Жарима","Қўшимча","Қолдиқ","Изоҳ"];
    var dataRows = [];
    groups.forEach(function(g){
      var groupHeadTxt = "Цех: "+g.workshopName+(g.hasNonOklad ? (" · Ишлаб чиқарилган: "+fmtNum(g.qty)+" дона · 1 донасига нархи: "+fmtSum(g.price)+" · Жами: "+fmtSum(g.prodTotal)) : "");
      dataRows.push([groupHeadTxt,"","","","","","","",""]);
      g.rows.forEach(function(r){
        /* Сон устунлари endi fmtNum() орқали чиқарилади — "." эмас "," билан
           ўнлик ва бўш жой билан минглик ажратилган матн (масалан
           "1 000 000,55"), худди экрандаги кўриниш каби (2026-10-01 сўрови). */
        dataRows.push([
          r.idx, r.fullName, g.workshopName, r.day,
          fmtNum(r.gross), fmtNum(r.fine),
          fmtNum(r.otherAdd), fmtNum(r.net),
          r.note||""
        ]);
      });
    });
    exportHtmlTableAsExcel("Naryad_"+run.year+"_"+String(run.month).padStart(2,"0")+".xls", "Наряд — "+periodLabel, headers, dataRows);
    toast("Excel файли юкланмоқда");
  }

  function renderSalaryTab(){
    setTopbar("Наряд", STATE.salaryRuns.length+" та наряд",
      '<button class="btn btn-primary" id="salaryCreateBtn">'+ICONS.plus+'Яратиш</button>');
    var root = document.getElementById("content");
    var html = empSubnav("salary")+sampleBanner();
    /* Саналар энди ЯРАТИЛГАН вақти эмас, балки киритилган санаси (r.date)
       бўйича камайиш тартибида сараланади; давр (йил) тугмаси орқали
       фақат танланган йилга тегишли нарядлар кўрсатилади (2026-10-01). */
    var allList = STATE.salaryRuns.slice().sort(function(a,b){
      var ad=a.date||(a.createdAt||"").slice(0,10), bd=b.date||(b.createdAt||"").slice(0,10);
      if(ad!==bd) return bd.localeCompare(ad);
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    html += '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:4px;">'+
      yearPickerHtml("salaryList", STATE.salaryListYear, STATE.salaryListYearWin)+
      onlyActiveCheckboxHtml("salaryList-onlyactive", STATE.salaryListOnlyActive)+
      '</div>';
    var yearList = allList.filter(function(r){ return (r.year||0)===STATE.salaryListYear; });
    var list = STATE.salaryListOnlyActive!==false ? yearList.filter(function(r){ return !r.cancelled; }) : yearList;
    if(!allList.length){
      html += emptyState("Ҳали наряд йўқ", "«Яратиш» тугмаси орқали табел асосида наряд ҳисобланг.");
    } else if(!yearList.length){
      html += emptyState("Бу йилда наряд йўқ", "Бошқа йилни танланг ёки «Яратиш» тугмаси орқали янги наряд киритинг.");
    } else if(!list.length){
      html += emptyState("Ҳеч нарса топилмади", "Бу йилда фақат бекор қилинган ёзувлар бор — уларни кўриш учун «Фақат бажарилганлар» белгисини олиб ташланг.");
    } else {
      var rows = list.map(function(r, idx){
        var periodLabel = (MONTHS_FULL[(r.month||1)-1]||"")+" "+r.year+" йил";
        var totals = salaryRunTotals(r);
        return '<tr'+(r.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-strong">'+esc(periodLabel)+'</td>'+
          '<td class="num cell-muted">'+totals.empCount+' та ходим</td>'+
          '<td class="num cell-strong">'+fmtSum(totals.gross)+'</td>'+
          '<td>'+(r.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-sr-copy="'+r.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-sr-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (r.cancelled?'':'<button class="btn btn-ghost btn-icon" data-sr-cancel="'+r.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (r.cancelled?'<button class="btn btn-ghost btn-icon" data-sr-restore="'+r.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-sr-print="'+r.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-sr-export="'+r.id+'" title="Excel’га юклаш">'+ICONS.download+'</button>'+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Давр</th><th>Ходимлар</th><th>Умумий ҳисобланган ойлик</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireEmpSubnav(root);
    wireYearPicker(root, "salaryList",
      function(){ return STATE.salaryListYear; }, function(y){ STATE.salaryListYear=y; },
      function(){ return STATE.salaryListYearWin; }, function(w){ STATE.salaryListYearWin=w; },
      renderSalaryTab);
    var salaryListOnlyActiveEl = document.getElementById("salaryList-onlyactive");
    if(salaryListOnlyActiveEl) salaryListOnlyActiveEl.addEventListener("change", function(){ STATE.salaryListOnlyActive = salaryListOnlyActiveEl.checked; renderSalaryTab(); });
    document.getElementById("salaryCreateBtn").addEventListener("click", function(){ openSalaryForm(null); });
    root.querySelectorAll("[data-sr-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-sr-copy");}); if(!r) return;
      var c = JSON.parse(JSON.stringify(r));
      delete c.id; c.cancelled=false; c.createdAt=""; 
      openSalaryForm(c);
      toast("Нусха олинди — даврни текшириб сақланг");
    }); });
    root.querySelectorAll("[data-sr-edit]").forEach(function(b){ b.addEventListener("click", function(){ openSalaryForm(list.find(function(x){return x.id===b.getAttribute("data-sr-edit");})); }); });
    root.querySelectorAll("[data-sr-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-sr-cancel");});
      openConfirm("Нарядни бекор қилиш", "Бу наряд бекор қилинсинми? Ёзув тарихда сақланиб қолади.", "Ҳа, бекор қилиш", function(){ dbUpdate("salaryRuns", r.id, {cancelled:true}, STATE.salaryRuns); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-sr-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-sr-restore");});
      openConfirm("Нарядни тиклаш", "Бу наряд қайта тикланиб, фаол ҳолатга қайтарилсинми?", "Ҳа, тиклаш", function(){ dbUpdate("salaryRuns", r.id, {cancelled:false}, STATE.salaryRuns); toast("Тикланди"); }, true);
    }); });
    root.querySelectorAll("[data-sr-print]").forEach(function(b){ b.addEventListener("click", function(){
      printSalaryRun(list.find(function(x){return x.id===b.getAttribute("data-sr-print");}));
    }); });
    root.querySelectorAll("[data-sr-export]").forEach(function(b){ b.addEventListener("click", function(){
      exportSalaryRunDetail(list.find(function(x){return x.id===b.getAttribute("data-sr-export");}));
    }); });
  }

  function openSalaryForm(existing){
    var isEdit = !!(existing && existing.id);
    var curY = new Date().getFullYear();
    var fs = {
      date: (existing && existing.date) || todayISO(),
      year: (existing && existing.year) || curY,
      month: (existing && existing.month) || (new Date().getMonth()+1),
      timesheetId: (existing && existing.timesheetId) || "",
      workshops: (existing && existing.workshops) ? JSON.parse(JSON.stringify(existing.workshops)) : {},
      employees: (existing && existing.employees) ? JSON.parse(JSON.stringify(existing.employees)) : {}
    };
    function timesheetOptions(){
      return STATE.timesheets.filter(function(t){ return !t.cancelled && t.year===fs.year && t.month===fs.month; })
        .slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    }

    var head = '<div class="field-row">'+
        '<div class="field"><label>Сана</label><input type="date" id="sr-date" value="'+esc(fs.date)+'"></div>'+
        '<div class="field"><label>Давр</label><div class="field-row" style="grid-template-columns:1fr 1fr;gap:8px;">'+
          '<input type="number" id="sr-year" value="'+esc(fs.year||curY)+'">'+
          '<select id="sr-month">'+MONTHS_FULL.map(function(mn,i){return '<option value="'+(i+1)+'"'+(fs.month===(i+1)?" selected":"")+'>'+mn+'</option>';}).join("")+'</select>'+
        '</div></div>'+
      '</div>'+
      '<div class="field"><label>Табел</label><select id="sr-timesheet"></select></div>'+
      '<div id="sr-groups"></div>'+
      '<div id="sr-summary"></div>';

    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Нарядни таҳрирлаш":"Янги наряд", head, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    function syncFormFromInputs(){
      var dEl = m.querySelector("#sr-date"); if(dEl) fs.date = dEl.value;
      var yEl = m.querySelector("#sr-year"); if(yEl) fs.year = Number(yEl.value)||fs.year;
      var moEl = m.querySelector("#sr-month"); if(moEl) fs.month = Number(moEl.value)||fs.month;
      var tsEl = m.querySelector("#sr-timesheet"); if(tsEl) fs.timesheetId = tsEl.value;
      m.querySelectorAll("[data-sr-qty]").forEach(function(inp){ var k=inp.getAttribute("data-sr-qty"); fs.workshops[k]=fs.workshops[k]||{}; fs.workshops[k].qty=Number(inp.value)||0; });
      m.querySelectorAll("[data-sr-price]").forEach(function(inp){ var k=inp.getAttribute("data-sr-price"); fs.workshops[k]=fs.workshops[k]||{}; fs.workshops[k].price=Number(inp.value)||0; });
      /* ЭСЛАТМА: "Ойдаги умумий иш куни" (normDays) ва "Иш куни" (day)
         майдонлари энди ҳар доим танланган Табелнинг ўзидан автомат
         ҳисобланади (computeSalaryGroups) — улар қулфланган (disabled)
         бўлгани учун бу ерда ЎҚИБ ёзиб қўйилмайди. Аввал шу ерда мавжуд
         бўлган override-ёзиш блоки атайлаб олиб ташланди: у, давр
         (йил/ой/Табел) алмаштирилганда, ҳали қайта рендер бўлмаган ЭСКИ
         Табелнинг (disabled бўлса ҳам) input.value'сини ўқиб, доимий
         "қотиб қолган" қиймат сифатида сақлаб қўяр эди — шу сабабли янги
         давр танланганда ҳам эски давр кунлари кўриниб қолар эди. */
      m.querySelectorAll("[data-sr-fine]").forEach(function(inp){ var k=inp.getAttribute("data-sr-fine"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].fine=Number(inp.value)||0; });
      m.querySelectorAll("[data-sr-otheradd]").forEach(function(inp){ var k=inp.getAttribute("data-sr-otheradd"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].otherAdd=Number(inp.value)||0; });
      m.querySelectorAll("[data-sr-note]").forEach(function(inp){ var k=inp.getAttribute("data-sr-note"); fs.employees[k]=fs.employees[k]||{}; fs.employees[k].note=inp.value; });
    }

    function renderTimesheetSelect(){
      var opts = timesheetOptions();
      var sel = m.querySelector("#sr-timesheet");
      if(!opts.length){
        sel.innerHTML = '<option value="">— бу давр учун табел топилмади —</option>';
        fs.timesheetId = "";
      } else {
        var stillValid = opts.some(function(t){return t.id===fs.timesheetId;});
        if(!stillValid) fs.timesheetId = opts[0].id;
        sel.innerHTML = opts.map(function(t){
          return '<option value="'+t.id+'"'+(fs.timesheetId===t.id?" selected":"")+'>'+fmtDateShort(t.date||(t.createdAt||"").slice(0,10))+' · '+(t.entries||[]).length+' та ходим</option>';
        }).join("");
      }
    }

    // Full structural rebuild — only called when the employee/workshop SET changes
    // (i.e. a different timesheet is selected). Recomputing amounts after that must
    // NOT recreate the <input> nodes (recomputeDisplay below), otherwise the field
    // the user is actively typing/tabbing into gets swapped out from under them and
    // loses focus mid-edit.
    function renderGroups(){
      var groups = computeSalaryGroups(fs);
      var groupsHtml = groups.length ? groups.map(function(g){
        var sharedHtml = '<div class="sr-shared">'+
          (g.hasNonOklad ? (
            '<div class="field"><label>Ишлаб чиқарилган маҳсулот миқдори</label><input class="sr-input" type="number" min="0" step="any" data-sr-qty="'+esc(g.key)+'" value="'+esc(g.qty||0)+'"></div>'+
            '<div class="field"><label>1 донасига нарх (сўм)</label><input class="sr-input" type="number" min="0" step="any" data-sr-price="'+esc(g.key)+'" value="'+esc(g.price||0)+'"></div>'+
            '<div class="field"><label>Жами сумма</label><input class="sr-input" disabled data-sr-jami="'+esc(g.key)+'" value="'+esc(fmtSum(g.prodTotal))+'"></div>'
          ) : '')+
          (g.hasOklad ? (
            '<div class="field"><label>Ойдаги умумий иш куни</label><input class="sr-input" type="number" min="0" step="any" disabled data-sr-normdays="'+esc(g.key)+'" value="'+esc(g.normDays||0)+'" title="Автомат — танланган Табелдаги умумий иш кунидан олинади, қўлда ўзгартириб бўлмайди"></div>'
          ) : '')+
        '</div>';
        var rowsHtml = g.rows.map(function(r){
          return '<tr>'+
            '<td class="cell-muted">'+r.idx+'</td>'+
            '<td class="cell-strong">'+esc(r.fullName)+'</td>'+
            '<td class="num cell-muted">'+r.tabelDays+' кун / '+r.tabelHours+' соат</td>'+
            '<td class="num cell-muted">'+(r.salaryType==="oylik"?fmtSum(r.oklad):"—")+'</td>'+
            '<td class="num cell-strong" data-sr-gross="'+esc(r.entryKey)+'">'+fmtSum(r.gross)+'</td>'+
            '<td><input class="sr-input" type="number" min="0" step="any" style="width:76px;" data-sr-fine="'+esc(r.entryKey)+'" value="'+esc(r.fine||0)+'">'+srFileAttachHtml("fine", r.entryKey, r.fineFileName)+'</td>'+
            '<td><input class="sr-input" type="number" min="0" step="any" style="width:76px;" data-sr-otheradd="'+esc(r.entryKey)+'" value="'+esc(r.otherAdd||0)+'">'+srFileAttachHtml("otheradd", r.entryKey, r.otherAddFileName)+'</td>'+
            '<td class="num cell-strong" data-sr-net="'+esc(r.entryKey)+'">'+fmtSum(r.net)+'</td>'+
            '<td><input class="sr-input" type="text" style="width:120px;" data-sr-note="'+esc(r.entryKey)+'" value="'+esc(r.note||"")+'"></td>'+
          '</tr>';
        }).join("");
        return '<div class="card sr-group">'+
          '<div class="sr-group-head"><h3 style="margin:0;font-size:14.5px;">Цех: <b>'+esc(g.workshopName)+'</b></h3><div class="cell-muted" style="font-size:12px;">'+g.rows.length+' та ходим</div></div>'+
          sharedHtml+
          '<div class="table-wrap"><table class="sr-table"><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Табел</th><th>Оклад</th><th>Ҳисобланган</th><th>Жарима</th><th>Қўшимча</th><th>Қолдиқ</th><th>Изоҳ</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'+
        '</div>';
      }).join("") : '<div class="field-hint" style="margin:8px 0 16px;">Танланган табелда ходим топилмади.</div>';
      m.querySelector("#sr-groups").innerHTML = groupsHtml;
      renderSummary(groups);

      m.querySelectorAll("#sr-groups input:not([type=file])").forEach(function(inp){
        inp.addEventListener("change", function(){ syncFormFromInputs(); recomputeDisplay(); });
      });
      wireSrFileControls();
    }

    /* Жарима/Қўшимча катаклари ёнидаги кичик файл (акт) бириктириш
       тугмаси — жарима ёки қўшимча берилган бўлса, шу асосдаги ҳужжат
       (акт) ни бириктириш имконини беради. Файл танланганда (агар
       STATE.assetsApi мавжуд бўлса) юкланади ва fs.employees[empId] га
       сақланади; акс ҳолда фақат файл номи эслатма сифатида сақланади. */
    function srFileAttachHtml(field, empId, fileName){
      var hasFile = !!fileName;
      return '<div style="display:flex;align-items:center;gap:2px;margin-top:3px;">'+
        '<input type="file" accept="image/*,.pdf" data-sr-filepick="'+field+'" data-row-emp="'+esc(empId)+'" style="display:none;">'+
        '<button type="button" class="btn btn-ghost btn-icon" data-sr-file-btn="'+field+'" data-row-emp="'+esc(empId)+'" title="'+(hasFile?esc(fileName):"Файл (акт) бириктириш")+'" style="padding:3px;'+(hasFile?"color:var(--accent);":"")+'">'+ICONS.paperclip+'</button>'+
        (hasFile?'<button type="button" class="btn btn-ghost btn-icon" data-sr-file-remove="'+field+'" data-row-emp="'+esc(empId)+'" title="Файлни олиб ташлаш" style="padding:3px;">'+ICONS.x+'</button>':'')+
      '</div>';
    }
    function wireSrFileControls(){
      m.querySelectorAll("[data-sr-file-btn]").forEach(function(btn){
        btn.addEventListener("click", function(){
          var field=btn.getAttribute("data-sr-file-btn"), empId=btn.getAttribute("data-row-emp");
          var picker = m.querySelector('[data-sr-filepick="'+field+'"][data-row-emp="'+empId+'"]');
          if(picker) picker.click();
        });
      });
      m.querySelectorAll("[data-sr-file-remove]").forEach(function(btn){
        btn.addEventListener("click", function(){
          var field=btn.getAttribute("data-sr-file-remove"), empId=btn.getAttribute("data-row-emp");
          fs.employees[empId] = fs.employees[empId] || {};
          var prefix = field==="fine" ? "fineFile" : "otherAddFile";
          fs.employees[empId][prefix+"Name"] = ""; fs.employees[empId][prefix+"Url"] = ""; fs.employees[empId][prefix+"AssetId"] = "";
          renderGroups();
        });
      });
      m.querySelectorAll("[data-sr-filepick]").forEach(function(picker){
        picker.addEventListener("change", function(){
          var field=picker.getAttribute("data-sr-filepick"), empId=picker.getAttribute("data-row-emp");
          var file = picker.files[0]; if(!file) return;
          fs.employees[empId] = fs.employees[empId] || {};
          var prefix = field==="fine" ? "fineFile" : "otherAddFile";
          var applyMeta = function(meta){
            fs.employees[empId][prefix+"Name"] = file.name;
            fs.employees[empId][prefix+"Url"] = meta?meta.url:"";
            fs.employees[empId][prefix+"AssetId"] = meta?meta.id:"";
            renderGroups();
          };
          if(STATE.assetsApi){
            STATE.assetsApi.upload(file).then(function(res){ applyMeta(res); }).catch(function(e){
              console.error(e); toast("Файл юкланмади — фақат номи сақланди"); applyMeta(null);
            });
          } else { applyMeta(null); }
        });
      });
    }

    function renderSummary(groups){
      var totalGross = groups.reduce(function(s,g){return s+g.groupGross;},0);
      var totalNet = groups.reduce(function(s,g){return s+g.groupNet;},0);
      var totalEmp = groups.reduce(function(s,g){return s+g.rows.length;},0);
      var summaryRows = groups.map(function(g){
        return '<tr><td class="cell-strong">'+esc(g.workshopName)+'</td><td class="num cell-muted">'+g.rows.length+'</td><td class="num cell-strong">'+fmtSum(g.groupGross)+'</td><td class="num">'+fmtSum(g.groupNet)+'</td></tr>';
      }).join("");
      m.querySelector("#sr-summary").innerHTML = groups.length ? (
        '<div class="section-head" style="margin:14px 0 8px;"><h2 style="font-size:14px;">Цехлар бўйича жамланма</h2></div>'+
        '<div class="table-wrap"><table><thead><tr><th>Цех</th><th>Ходимлар</th><th>Умумий ҳисобланган</th><th>Қолдиқ жами</th></tr></thead><tbody>'+summaryRows+
        '<tr><td class="cell-strong">Жами</td><td class="num cell-strong">'+totalEmp+'</td><td class="num cell-strong">'+fmtSum(totalGross)+'</td><td class="num cell-strong">'+fmtSum(totalNet)+'</td></tr>'+
        '</tbody></table></div>'
      ) : "";
    }

    // Lightweight recalculation used while the user is editing a qty/price/day/fine/etc.
    // field: updates only the read-only computed cells (text/disabled-input values) in
    // place, and never touches the live <input> nodes, so focus is never lost.
    function recomputeDisplay(){
      var groups = computeSalaryGroups(fs);
      groups.forEach(function(g){
        var jamiEl = m.querySelector('[data-sr-jami="'+g.key+'"]');
        if(jamiEl) jamiEl.value = fmtSum(g.prodTotal);
        g.rows.forEach(function(r){
          var grossEl = m.querySelector('[data-sr-gross="'+r.entryKey+'"]');
          if(grossEl) grossEl.textContent = fmtSum(r.gross);
          var netEl = m.querySelector('[data-sr-net="'+r.entryKey+'"]');
          if(netEl) netEl.textContent = fmtSum(r.net);
        });
      });
      renderSummary(groups);
    }

    m.querySelector("#sr-date").addEventListener("change", syncFormFromInputs);
    m.querySelector("#sr-year").addEventListener("change", function(){ syncFormFromInputs(); renderTimesheetSelect(); renderGroups(); });
    m.querySelector("#sr-month").addEventListener("change", function(){ syncFormFromInputs(); renderTimesheetSelect(); renderGroups(); });
    m.querySelector("#sr-timesheet").addEventListener("change", function(){ syncFormFromInputs(); renderGroups(); });

    renderTimesheetSelect();
    renderGroups();

    m.querySelector("[data-save]").addEventListener("click", function(){
      syncFormFromInputs();
      if(!fs.timesheetId){ toast("Табелни танланг"); return; }
      var data = {
        date: fs.date, year: fs.year, month: fs.month, timesheetId: fs.timesheetId,
        workshops: fs.workshops, employees: fs.employees, cancelled:false
      };
      if(isEdit){ dbUpdate("salaryRuns", existing.id, data, STATE.salaryRuns); toast("Сақланди"); }
      else { data.createdAt = new Date().toISOString(); dbAdd("salaryRuns", data, STATE.salaryRuns); toast("Наряд сақланди"); }
      closeModal();
    });
  }

  function printSalaryRun(run){
    if(!run) return;
    var periodLabel = (MONTHS_FULL[(run.month||1)-1]||"")+" "+run.year+" йил";
    var groups = computeSalaryGroups(run);
    var rows = "";
    groups.forEach(function(g){
      var groupHeadTxt = "Цех: "+g.workshopName+(g.hasNonOklad ? (" · Ишлаб чиқарилган: "+fmtNum(g.qty)+" дона · 1 донасига нархи: "+fmtSum(g.price)+" · Жами: "+fmtSum(g.prodTotal)) : "");
      rows += '<tr><td colspan="8" style="font-weight:700;background:#e4eef8;">'+esc(groupHeadTxt)+'</td></tr>';
      g.rows.forEach(function(r){
        rows += '<tr><td>'+r.idx+'</td><td>'+esc(r.fullName)+'</td><td style="text-align:right;">'+r.day+'</td>'+
          '<td style="text-align:right;">'+fmtSum(r.gross)+'</td><td style="text-align:right;">'+fmtSum(r.fine)+'</td>'+
          '<td style="text-align:right;">'+fmtSum(r.otherAdd)+'</td><td style="text-align:right;font-weight:700;">'+fmtSum(r.net)+'</td>'+
          '<td>'+esc(r.note||"")+'</td></tr>';
      });
    });
    var totalGross = groups.reduce(function(s,g){return s+g.groupGross;},0);
    var totalNet = groups.reduce(function(s,g){return s+g.groupNet;},0);
    var body = '<table><tr>'+
        '<th>№</th><th>Ф.И.Ш.</th><th style="text-align:right;">Кун</th>'+
        '<th style="text-align:right;">Ҳисобланган</th><th style="text-align:right;">Жарима</th>'+
        '<th style="text-align:right;">Қўшимча</th><th style="text-align:right;">Қолдиқ</th>'+
        '<th>Изоҳ</th>'+
      '</tr>'+
      rows+
      '<tr><td colspan="3" style="font-weight:700;background:#f4f5f7;">Жами</td><td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totalGross)+'</td>'+
      '<td colspan="2" style="background:#f4f5f7;"></td><td style="text-align:right;font-weight:700;background:#f4f5f7;">'+fmtSum(totalNet)+'</td><td style="background:#f4f5f7;"></td></tr>'+
      '</table>'+
      '<div class="v-sign"><div>Ҳисоблади</div><div>Тасдиқлади</div></div>';
    var html = voucherShell("Наряд ведомости", "Давр: "+esc(periodLabel)+" · Сана: "+esc(fmtDateShort(run.date||"")), body, true);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

