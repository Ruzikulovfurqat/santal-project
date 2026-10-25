  /* ================= davr (yil) tanlash — aylantma widget ================= */
  /* Табел/Наряд/Аванслар/Иш ҳақи бўлимларида бир хил кўринишда ишлатиладиган
     "йил танлаш" тугмаси (2020–2100), бир вақтда фақат 3 та йил кўринади —
     "<" / ">" тугмалари орқали ойна (кўриниш) бошқа йилларга сурилади.
     prefix — DOM'да уникаллик учун (масалан "tabel"), selYear — ҳозир
     танланган йил, winStart — кўринаётган 3 та йилнинг биринчиси (0 бўлса
     автоматик selYear−1 деб олинади). */
  var YEAR_MIN = 2020, YEAR_MAX = 2100;
  function yearPickerHtml(prefix, selYear, winStart){
    var ws = winStart || (selYear-1);
    if(ws < YEAR_MIN) ws = YEAR_MIN;
    if(ws > YEAR_MAX-2) ws = YEAR_MAX-2;
    var years = [ws, ws+1, ws+2];
    return '<div class="year-picker" data-yp="'+prefix+'">'+
      '<button type="button" class="yp-nav" data-yp-prev="'+prefix+'"'+(ws<=YEAR_MIN?' disabled':'')+' title="Олдинги йиллар">'+ICONS.arrowLeft+'</button>'+
      years.map(function(y){ return '<button type="button" class="yp-year'+(y===selYear?' active':'')+'" data-yp-year="'+prefix+'" data-yp-val="'+y+'">'+y+'</button>'; }).join("")+
      '<button type="button" class="yp-nav" data-yp-next="'+prefix+'"'+(ws>=YEAR_MAX-2?' disabled':'')+' title="Кейинги йиллар">'+ICONS.arrowRight+'</button>'+
    '</div>';
  }
  /* getSt()/setSt() — STATE'даги {year:.., win:..} сақловчи обороти ўқиш/
     ёзиш функциялари; rerender — шу бўлимнинг ўзини қайта чизадиган
     функция (масалан renderTabelTab). */
  function wireYearPicker(container, prefix, getYear, setYear, getWin, setWin, rerender){
    var root = container.querySelector('[data-yp="'+prefix+'"]');
    if(!root) return;
    root.querySelectorAll('[data-yp-year="'+prefix+'"]').forEach(function(b){
      b.addEventListener("click", function(){ setYear(Number(b.getAttribute("data-yp-val"))); rerender(); });
    });
    var prevBtn = root.querySelector('[data-yp-prev="'+prefix+'"]');
    if(prevBtn) prevBtn.addEventListener("click", function(){ setWin(Math.max(YEAR_MIN, getWin()-1)); rerender(); });
    var nextBtn = root.querySelector('[data-yp-next="'+prefix+'"]');
    if(nextBtn) nextBtn.addEventListener("click", function(){ setWin(Math.min(YEAR_MAX-2, getWin()+1)); rerender(); });
  }

