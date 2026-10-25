  /* ================= калькулятор ================= */
  function openCalculatorModal(initialValue, onApply){
    var st = { display: (initialValue && Number(initialValue)) ? String(Number(initialValue)) : "0", first: null, op: null, waitingSecond: false };
    var body = '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:12px;text-align:right;">'+
      '<div class="num" id="calc-display" style="font-size:26px;font-weight:800;word-break:break-all;">'+esc(st.display)+'</div></div>'+
      '<div id="calc-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">'+
        ['C','⌫','±','÷','7','8','9','×','4','5','6','−','1','2','3','+'].map(function(k){
          return '<button type="button" class="btn btn-secondary" data-calc-key="'+esc(k)+'" style="font-size:16px;padding:12px 0;">'+esc(k)+'</button>';
        }).join("")+
        '<button type="button" class="btn btn-secondary" data-calc-key="0" style="font-size:16px;padding:12px 0;grid-column:span 2;">0</button>'+
        '<button type="button" class="btn btn-secondary" data-calc-key="." style="font-size:16px;padding:12px 0;">.</button>'+
        '<button type="button" class="btn btn-primary" data-calc-key="=" style="font-size:16px;padding:12px 0;">=</button>'+
      '</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-apply>Натижани қўйиш</button>';
    var m = openModal("Калькулятор", body, foot);
    var disp = m.querySelector("#calc-display");
    var render = function(){ disp.textContent = st.display; };
    var compute = function(){
      if(st.op==null || st.first==null) return;
      var a = st.first, b = Number(st.display)||0, r = 0;
      if(st.op==="+") r = a+b;
      else if(st.op==="−") r = a-b;
      else if(st.op==="×") r = a*b;
      else if(st.op==="÷") r = b===0 ? 0 : a/b;
      r = Math.round(r*1e6)/1e6;
      st.display = String(r);
      st.first = r;
    };
    var pressKey = function(k){
      if(/^[0-9]$/.test(k)){
        if(st.waitingSecond){ st.display = k; st.waitingSecond=false; }
        else st.display = (st.display==="0") ? k : st.display+k;
      } else if(k==="."){
        if(st.waitingSecond){ st.display="0."; st.waitingSecond=false; }
        else if(st.display.indexOf(".")===-1) st.display += ".";
      } else if(k==="C"){
        st.display="0"; st.first=null; st.op=null; st.waitingSecond=false;
      } else if(k==="⌫"){
        st.display = st.display.length>1 ? st.display.slice(0,-1) : "0";
      } else if(k==="±"){
        st.display = (st.display.charAt(0)==="-") ? st.display.slice(1) : (st.display==="0" ? "0" : "-"+st.display);
      } else if(k==="+"||k==="−"||k==="×"||k==="÷"){
        if(st.op!=null && !st.waitingSecond) compute();
        else st.first = Number(st.display)||0;
        st.op = k; st.waitingSecond = true;
      } else if(k==="="){
        compute(); st.op=null; st.waitingSecond=true;
      }
      render();
    };
    m.querySelector("#calc-grid").addEventListener("click", function(e){
      var b = e.target.closest("[data-calc-key]"); if(!b) return;
      pressKey(b.getAttribute("data-calc-key"));
    });
    var applyBtn = m.querySelector("[data-apply]");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    applyBtn.addEventListener("click", function(){
      var val = Number(st.display)||0;
      closeModal();
      onApply(val);
    });
    /* Калькулятор физик клавиатура орқали ҳам ишлайди: рақамлар, +,-,*,/,
       Backspace (ўчириш), C/Delete (тозалаш), Enter (ҳисоблаб натижани
       қўллаш) ва Escape (бекор қилиш). Модал қандай ёпилишидан қатъий
       назар (X, ташқарига босиш, Бекор қилиш, Натижани қўйиш, Escape)
       document'га қўшилган тингловчи MutationObserver орқали олиб
       ташланади — сизиб қолмайди. */
    var onCalcKeydown = function(e){
      if(e.ctrlKey || e.metaKey || e.altKey) return;
      var key = e.key;
      if(/^[0-9]$/.test(key)){ e.preventDefault(); pressKey(key); }
      else if(key==="."){ e.preventDefault(); pressKey("."); }
      else if(key==="+"){ e.preventDefault(); pressKey("+"); }
      else if(key==="-"){ e.preventDefault(); pressKey("−"); }
      else if(key==="*" || key.toLowerCase()==="x"){ e.preventDefault(); pressKey("×"); }
      else if(key==="/"){ e.preventDefault(); pressKey("÷"); }
      else if(key==="Backspace"){ e.preventDefault(); pressKey("⌫"); }
      else if(key==="Delete" || (key.toLowerCase()==="c")){ e.preventDefault(); pressKey("C"); }
      else if(key==="Escape"){ e.preventDefault(); closeModal(); }
      else if(key==="Enter" || key==="="){ e.preventDefault(); pressKey("="); applyBtn.click(); }
    };
    document.addEventListener("keydown", onCalcKeydown);
    var modalRootEl = document.getElementById("modalRoot");
    var calcObserver = new MutationObserver(function(){
      if(!modalRootEl.contains(m)){ document.removeEventListener("keydown", onCalcKeydown); calcObserver.disconnect(); }
    });
    calcObserver.observe(modalRootEl, {childList:true});
  }

