  /* ================= умумий: "сўнгги ..." рўйхатлари учун сана оралиғи +
     қидирув асбоблар панели =================
     Кўп бўлимларда (Кирим, Лом кирим, Лом возврат, Ички кўчириш, Хисобдан
     чиқариш, Инвентаризация, Таъминотчилар, Ускуна ва жиҳозлар) бир хил
     филтр панели керак: сана оралиғи + қидирув (баъзан + Excel тугмаси).
     Такрорланишни камайтириш учун умумий ёрдамчи функциялар. */
  function recFilterToolbar(prefix, state, searchPlaceholder, extraHtml, showExport){
    return '<div class="filter-row" style="margin-bottom:14px;align-items:flex-end;">'+
      '<div class="field" style="margin-bottom:0;"><label>Сана (дан)</label><input type="date" id="'+prefix+'-from" value="'+esc(state.from||"")+'" style="min-width:142px;"></div>'+
      '<div class="field" style="margin-bottom:0;"><label>Сана (гача)</label><input type="date" id="'+prefix+'-to" value="'+esc(state.to||"")+'" style="min-width:142px;"></div>'+
      (extraHtml||"")+
      '<div class="search-box" style="margin-bottom:0;">'+ICONS.search+'<input type="text" id="'+prefix+'-search" placeholder="'+esc(searchPlaceholder||"Қидириш…")+'" value="'+esc(state.search||"")+'"></div>'+
      (showExport!==false ? '<button class="btn btn-secondary btn-sm" id="'+prefix+'-export" title="Excelга юклаб олиш">'+ICONS.download+'Excel</button>' : '')+
      '</div>';
  }
  /* Диққат (тузатиш, 2026-09-30): "state" объекти ҳар бир render() чақируви
     сайин ЯНГИДАН яратилади (renderXxx функцияси бошида), шунга кўра фақат
     шу локал объектни ўзгартириш (эски хатти-ҳаракат) render() ичкарисида
     ЭСКИ қийматни ўқишга олиб келарди — сана/қидирув майдонига ёзилган
     матн render() чақирилиши билан йўқолиб қоларди (STATE'га ёзилмагани
     учун). Шунинг учун энди STATE[prefix+"From"/"To"/"Search"]'га ТЎҒРИДАН
     ёзамиз (бошқа катакчалар — категория ва ш.к. — ҳар бир алоҳида
     render() каллбекида шу андозада тўғри ёзилган эди). */
  function wireRecFilterToolbar(root, prefix, state, onExport, onChangeExtra){
    var f=root.querySelector("#"+prefix+"-from"), t=root.querySelector("#"+prefix+"-to"), s=root.querySelector("#"+prefix+"-search"), ex=root.querySelector("#"+prefix+"-export");
    if(f) f.addEventListener("change", function(){ state.from=this.value; STATE[prefix+"From"]=this.value; render(); });
    if(t) t.addEventListener("change", function(){ state.to=this.value; STATE[prefix+"To"]=this.value; render(); });
    if(s) s.addEventListener("input", function(){
      state.search=this.value; STATE[prefix+"Search"]=this.value; render();
      var e2=document.getElementById(prefix+"-search");
      if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); }
    });
    if(ex && onExport) ex.addEventListener("click", onExport);
    if(onChangeExtra) onChangeExtra(root);
  }
  function recMatchesDate(dateStr, from, to){
    var d=(dateStr||"").slice(0,10);
    if(from && (!d || d<from)) return false;
    if(to && (!d || d>to)) return false;
    return true;
  }
  function recMatchesSearch(hay, search){
    if(!search) return true;
    return (hay||"").toLowerCase().indexOf(search.trim().toLowerCase())>-1;
  }

