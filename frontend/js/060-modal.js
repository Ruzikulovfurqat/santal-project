  /* ================= modal ================= */
  function closeModal(){ document.getElementById("modalRoot").innerHTML=""; }
  /* ҳозир очиқ модалнинг "орқага қайтиш" чақирувчиси — openModal'нинг
     ихтиёрий 5-параметри (onClose) орқали ўрнатилади. Фақат footer'даги
     алоҳида "Бекор қилиш/Ёпиш" тугмаси эмас, балки юқоридаги × тугмаси ва
     Esc тугмаси ҳам шу орқали "ёпиш эмас, орқага қайтиш" хулқини олади —
     масалан Буюртма шаклидан очилган Харидор/Маҳсулот танлов ойналарида ×
     босилганда БУТУН буюртма ойнаси эмас, фақат танлов ойнаси ёпилиб, ортга
     (буюртма қораламаси билан) қайтилади (2026-10-03 сўровига кўра).
     Ҳар бир openModal чақируви буни қайта ўрнатади (onClose йўқ бўлса —
     null), шунга кўра эски (5-параметрсиз) чақирувлар учун хулқ ўзгармайди. */
  var _modalBackHandler = null;
  function closeModalOrBack(){
    var cb = _modalBackHandler; _modalBackHandler = null;
    closeModal();
    if(cb) cb();
  }
  function openModal(titleHtml, bodyHtml, footHtml, wide, onClose){
    var root = document.getElementById("modalRoot");
    /* `wide` одатда true/false, лекин алоҳида CSS класс керак бўлганда
       (масалан, кўп устунли жадваллар учун "xwide"/"xxwide") тўғридан-тўғри
       матн (класс номи) сифатида ҳам узатилиши мумкин — voucherShell'даги
       худди шундай андозага қаранг. */
    var wideClass = wide===true ? " wide" : (typeof wide==="string" && wide ? " "+wide : "");
    var backdrop = el('<div class="modal-backdrop"><div class="modal'+wideClass+'"><div class="modal-head"><h3></h3><button class="btn btn-ghost btn-icon" data-close>'+ICONS.x+'</button></div><div class="modal-body"></div><div class="modal-foot"></div></div></div>');
    backdrop.querySelector("h3").innerHTML = titleHtml;
    backdrop.querySelector(".modal-body").innerHTML = bodyHtml;
    backdrop.querySelector(".modal-foot").innerHTML = footHtml || "";
    _modalBackHandler = onClose || null;
    backdrop.addEventListener("mousedown", function(e){ if(e.target===backdrop) closeModalOrBack(); });
    backdrop.querySelector("[data-close]").addEventListener("click", closeModalOrBack);
    root.innerHTML=""; root.appendChild(backdrop);
    return backdrop;
  }
  /* Ҳар қандай очиқ модал ойнани × тугмасини босмасдан, клавиатурадаги
     Esc тугмаси орқали ҳам бекор қилиш мумкин — бир хил modalRoot
     ишлатилгани учун битта умумий тингловчи етарли. */
  document.addEventListener("keydown", function(e){
    if(e.key!=="Escape" && e.key!=="Esc") return;
    var modalRootEl = document.getElementById("modalRoot");
    if(modalRootEl && modalRootEl.children.length) closeModalOrBack();
  });
  function openConfirm(title, body, confirmLabel, onConfirm, danger){
    /* Матн хавфсизлик учун экранланади, лекин оддий <br> ва <b> белгилари
       қайта тикланади — тасдиқлаш ойналарида сатр кўчириш ва қалин ёзув
       ишлаши учун (2026-10-16 тузатиши). */
    var safeBody = esc(body).replace(/&lt;br\s*\/?&gt;/g, "<br>")
      .replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
    var m = openModal(esc(title), '<p style="font-size:13.5px;color:var(--ink-2);line-height:1.5;margin:0;">'+safeBody+'</p>',
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn '+(danger?"btn-danger":"btn-primary")+'" style="'+(danger?"background:var(--critical);color:#fff;":"")+'" data-ok>'+esc(confirmLabel)+'</button>');
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-ok]").addEventListener("click", function(){ closeModal(); onConfirm(); });
  }

