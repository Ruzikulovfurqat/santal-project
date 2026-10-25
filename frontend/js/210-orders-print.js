  /* ================= буюртма — чоп этиш (юк хати) ================= */
  function printOrderWaybill(o){
    if(!o) return;
    var body = '<div style="text-align:center;font-weight:800;font-size:18px;margin-bottom:14px;">Буюртма №'+esc(o.orderNumber)+'</div>'+
      '<div style="text-align:center;font-size:13px;margin-bottom:22px;">'+fmtDate(o.date||(o.createdAt||"").slice(0,10))+'</div>'+
      '<div style="font-size:13.5px;margin-bottom:6px;">Харидор: <strong>'+esc(o.customer||"—")+'</strong></div>'+
      (o.contractNumber||o.contractDate ? ('<div style="font-size:13.5px;margin-bottom:18px;">Шартнома: <strong>'+(o.contractNumber?esc(o.contractNumber):"—")+(o.contractDate?(" — "+fmtDateShort(o.contractDate)):"")+'</strong></div>') : '<div style="margin-bottom:18px;"></div>')+
      '<table><thead><tr><th style="width:34px;text-align:center;">№</th><th>Маҳсулот номи</th><th style="width:110px;text-align:center;">Ўлчов бирлиги</th><th style="width:90px;text-align:center;">Миқдори</th><th style="width:130px;text-align:right;">Нархи</th><th style="width:140px;text-align:right;">Жами сумма</th></tr></thead><tbody>'+
      orderItemsList(o).map(function(it,i){
        return '<tr><td style="text-align:center;">'+(i+1)+'</td><td>'+esc(it.product||"—")+'</td><td style="text-align:center;">'+esc(it.unit||"—")+'</td><td style="text-align:center;">'+fmtNum(it.quantity)+'</td><td style="text-align:right;">'+fmtSum(it.price||0)+'</td><td style="text-align:right;">'+fmtSum(it.totalAmount||0)+'</td></tr>';
      }).join("")+
      '</tbody></table>'+
      '<div class="v-total">Якуний жами сумма: '+fmtSum(o.totalAmount||0)+'</div>'+
      '<div style="font-size:13px;margin-top:10px;">Муддати: '+fmtDateShort(o.dueDate)+'</div>'+
      '<div style="display:flex;justify-content:space-between;margin-top:46px;font-size:13px;">'+
        '<div style="display:flex;flex-direction:column;gap:30px;min-width:46%;">'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Раҳбар: _____________________</div>'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Масъул шахс: _____________________</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;gap:30px;min-width:46%;">'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Харидор: _____________________</div>'+
        '</div>'+
      '</div>';
    var html = voucherShell("Буюртма", "", body, true);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

