  /* ================= Excel'га экспорт ================= */
  /* Тизим офлайн (заводдаги LAN серверда) ишлаши ҳам мумкинлиги учун
     ташқи китобхона (масалан SheetJS, CDN)дан фойдаланмаймиз — Excel
     "HTML жадвал" форматини .xls кенгайтмаси билан тўғридан-тўғри очади;
     бу ҳеч қандай интернет ёки қўшимча файлсиз, соф браузер имкониятлари
     билан ишлайди. */
  /* downloadExcelHtml — умумий MSO-Excel қобиғи/Blob-юклаш механизми.
     exportHtmlTableAsExcel (оддий бир-жадвалли экспорт) ва
     exportKassaAccountDetail (касса — бир нечта рангли блокли экспорт)
     иккаласи ҳам шуни ишлатади (2026-10-01 сўрови). */
  function downloadExcelHtml(filename, sheetTitle, tableInnerHtml){
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'+
      '<head><meta charset="UTF-8">'+
      '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>'+esc(sheetTitle)+'</x:Name>'+
      '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->'+
      '<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;} td,th{padding:4px 8px;}</style></head>'+
      '<body><table>'+tableInnerHtml+'</table></body></html>';
    var blob = new Blob(["﻿"+html], {type:"application/vnd.ms-excel;charset=utf-8;"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  }
  function exportHtmlTableAsExcel(filename, sheetTitle, headerCells, rowsArr){
    var headHtml = '<tr>'+headerCells.map(function(h){ return '<th style="background:#eef0f3;font-weight:700;border:1px solid #999;">'+esc(h)+'</th>'; }).join("")+'</tr>';
    var bodyHtml = rowsArr.map(function(r){
      return '<tr>'+r.map(function(c){ return '<td style="border:1px solid #999;">'+esc(c===undefined||c===null?"":String(c))+'</td>'; }).join("")+'</tr>';
    }).join("");
    downloadExcelHtml(filename, sheetTitle, headHtml+bodyHtml);
  }

  /* ===== Касса — бир кассанинг тўлиқ тарихини (кирим/чиқим/конвертация/
     кўчирма) усул бўйича (Нақд/Карта/Пул ўтказмаси/Доллар) алоҳида рангли
     блоклар шаклида БИТТА Excel файлига экспорт қилиш (2026-10-01 сўрови,
     расмдаги "Радиатор цех кассаси" намунасига мос). */
  function kassaMethodLedgerRows(accountId, method){
    var rows = [];
    STATE.cashTransactions.forEach(function(t){
      if(t.cashAccountId!==accountId || t.cancelled) return;
      var v = txMethodValue(t, method);
      if(!v) return;
      rows.push({
        date: t.date || (t.createdAt||"").slice(0,10),
        createdAt: t.createdAt||"",
        counterparty: t.counterpartyName || "",
        kirim: t.direction==="kirim" ? v : 0,
        chiqim: t.direction==="chiqim" ? v : 0,
        note: t.description || ""
      });
    });
    STATE.cashConversions.forEach(function(c){
      if(c.cashAccountId!==accountId || c.cancelled) return;
      var date = c.date || (c.createdAt||"").slice(0,10);
      if(c.fromMethod===method){
        var vf = isUsdMethod(method) ? (Number(c.fromUsdAmount)||0) : (Number(c.fromAmount)||0);
        if(vf) rows.push({date:date, createdAt:c.createdAt||"", counterparty:"Конвертация ("+paymentMethodLabel(c.toMethod)+"га)", kirim:0, chiqim:vf, note:c.note||""});
      }
      if(c.toMethod===method){
        var vt = isUsdMethod(method) ? (Number(c.toUsdAmount)||0) : (Number(c.toAmount)||0);
        if(vt) rows.push({date:date, createdAt:c.createdAt||"", counterparty:"Конвертация ("+paymentMethodLabel(c.fromMethod)+"дан)", kirim:vt, chiqim:0, note:c.note||""});
      }
    });
    STATE.cashTransfers.forEach(function(tr){
      if(tr.cancelled || tr.method!==method) return;
      var date = tr.date || (tr.createdAt||"").slice(0,10);
      var v = isUsdMethod(method) ? (Number(tr.usdAmount)||0) : (Number(tr.amount)||0);
      if(!v) return;
      if(tr.fromCashAccountId===accountId){
        rows.push({date:date, createdAt:tr.createdAt||"", counterparty:"Кўчирма ("+cashAccountName(tr.toCashAccountId)+"га)", kirim:0, chiqim:v, note:tr.note||""});
      }
      if(tr.toCashAccountId===accountId){
        rows.push({date:date, createdAt:tr.createdAt||"", counterparty:"Кўчирма ("+cashAccountName(tr.fromCashAccountId)+"дан)", kirim:v, chiqim:0, note:tr.note||""});
      }
    });
    rows.sort(function(a,b){
      if(a.date!==b.date) return a.date.localeCompare(b.date);
      return (a.createdAt||"").localeCompare(b.createdAt||"");
    });
    return rows;
  }
  function exportKassaAccountDetail(account){
    if(!account) return;
    var cell = function(txt, style, span){ return '<td'+(span?' colspan="'+span+'"':'')+(style?' style="'+style+'"':'')+'>'+esc(txt===undefined||txt===null?"":String(txt))+'</td>'; };
    var borderPlain = "border:1px solid #999;";
    var borderYellow = "border:1px solid #999;background:#ffe699;font-weight:700;";
    var borderGreen = "border:1px solid #999;background:#c6e0b4;font-weight:700;";
    var borderHead = "border:1px solid #999;background:#eef0f3;font-weight:700;";
    var rowsHtml = "";
    rowsHtml += '<tr>'+cell(account.name||"Касса", "border:none;font-weight:800;font-size:14px;", 5)+'</tr>';
    rowsHtml += '<tr><td colspan="5" style="border:none;height:8px;"></td></tr>';
    PAYMENT_METHODS.forEach(function(pm){
      var method = pm[0], label = pm[1];
      var ledger = kassaMethodLedgerRows(account.id, method);
      var balance = cashMethodBalance(account.id, method);
      var balanceTxt = isUsdMethod(method) ? fmtUsd(balance) : fmtSum(balance);
      rowsHtml += '<tr>'+cell(label, borderYellow)+cell("Қолдиқ сумма", borderYellow)+cell(balanceTxt, borderGreen, 3)+'</tr>';
      rowsHtml += '<tr>'+cell("Сана", borderHead)+cell("Контрагент номи", borderHead)+cell("Кирим сумма", borderHead)+cell("Чиким сумма", borderHead)+cell("Изоҳ", borderHead)+'</tr>';
      var totKirim = 0, totChiqim = 0;
      if(!ledger.length){
        rowsHtml += '<tr>'+cell("Операция йўқ", borderPlain, 5)+'</tr>';
      } else {
        ledger.forEach(function(r){
          totKirim += r.kirim; totChiqim += r.chiqim;
          rowsHtml += '<tr>'+
            cell(fmtDateShort(r.date), borderPlain)+
            cell(r.counterparty, borderPlain)+
            cell(r.kirim ? fmtNum(r.kirim) : "", borderPlain)+
            cell(r.chiqim ? fmtNum(r.chiqim) : "", borderPlain)+
            cell(r.note, borderPlain)+'</tr>';
        });
      }
      rowsHtml += '<tr>'+cell("Жами", borderHead)+cell("", borderHead)+cell(fmtNum(totKirim), borderHead)+cell(fmtNum(totChiqim), borderHead)+cell("", borderHead)+'</tr>';
      rowsHtml += '<tr><td colspan="5" style="border:none;height:14px;"></td></tr>';
    });
    /* ЭСЛАТМА: файл номида (download атрибутида) кирилл ҳарфлари ишлатилса,
       баъзи браузерлар (blob: манзили билан) номни "download"га алмаштириб
       қўяди — шунинг учун файл номи фақат лотин ҳарфлари/рақамлардан
       иборат, кассанинг ўзи ва тўлиқ номи эса файл ичидаги биринчи
       қаторда ва ҳар бир блок бошида аниқ кўрсатилади (2026-10-01 сўрови). */
    downloadExcelHtml("Kassa_hisobot_"+todayISO().replace(/-/g,"")+".xls", account.name||"Касса", rowsHtml);
    toast("Excel файли юкланмоқда");
  }

