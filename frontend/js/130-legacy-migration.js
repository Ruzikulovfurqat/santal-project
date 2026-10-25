  /* ================= one-time legacy-data migration ================= */
  function maybeMigrate(){
    if(!STATE.db || STATE.migrationAttempted) return;
    STATE.migrationAttempted = true;
    var lockDoc = STATE.db.collection("meta").doc("migration_v2");
    lockDoc.get().then(function(snap){
      if(snap.exists && snap.data() && snap.data().done) return;
      return lockDoc.acquire({holder:"migrator-"+uid(), ttlMs:25000}).then(function(res){
        if(!res.acquired) return;
        return lockDoc.get().then(function(snap2){
          if(snap2.exists && snap2.data() && snap2.data().done) return;
          return performMigration().then(function(){ return lockDoc.set({done:true, at:new Date().toISOString()}); });
        });
      });
    }).catch(function(e){ console.error("migration check failed", e); });
  }

  function performMigration(){
    return Promise.all([
      STATE.db.collection("materials").get(),
      STATE.db.collection("products").get(),
      STATE.db.collection("calculations").get(),
      STATE.db.collection("warehouses").get(),
    ]).then(function(results){
      var matsSnap=results[0], prodsSnap=results[1], calcsSnap=results[2], whSnap=results[3];
      if(!matsSnap.size && !prodsSnap.size && !calcsSnap.size) return;
      var whId;
      var whPromise;
      if(whSnap.size){ whId = whSnap.docs[0].id; whPromise = Promise.resolve(); }
      else {
        whPromise = STATE.db.collection("warehouses").add({name:"Асосий омбор", note:"Тизимни янгилашда автоматик яратилди", createdAt:new Date().toISOString()}).then(function(ref){ whId=ref.id; });
      }
      return whPromise.then(function(){
        var itemIdByMatName = {}, itemIdByProdName = {};
        var chain = Promise.resolve();
        matsSnap.docs.forEach(function(d){
          var m = d.data();
          chain = chain.then(function(){
            return STATE.db.collection("items").add({
              name:m.name||"", itemType:"xomashyo", unit:m.unit||UNIT_OPTIONS[0],
              minQuantity:Number(m.minQuantity)||0, price:Number(m.unitCost)||0, categoryId:"",
              sample:!!m.sample, createdAt:new Date().toISOString()
            }).then(function(ref){
              itemIdByMatName[(m.name||"").trim().toLowerCase()] = ref.id;
              return STATE.db.collection("stock").doc(ref.id+"__"+whId).set({itemId:ref.id, warehouseId:whId, quantity:Number(m.quantity)||0, updatedAt:new Date().toISOString()});
            });
          });
        });
        prodsSnap.docs.forEach(function(d){
          var p = d.data();
          chain = chain.then(function(){
            return STATE.db.collection("items").add({
              name:p.name||"", itemType:"mahsulot", unit:p.unit||UNIT_OPTIONS[0],
              minQuantity:Number(p.minQuantity)||0, price:0, categoryId:"",
              sample:!!p.sample, createdAt:new Date().toISOString()
            }).then(function(ref){
              itemIdByProdName[(p.name||"").trim().toLowerCase()] = ref.id;
              return STATE.db.collection("stock").doc(ref.id+"__"+whId).set({itemId:ref.id, warehouseId:whId, quantity:Number(p.quantity)||0, updatedAt:new Date().toISOString()});
            });
          });
        });
        chain = chain.then(function(){
          var recipeSeen = {};
          var calcs = calcsSnap.docs.map(function(d){ var c=d.data(); c._id=d.id; return c; }).sort(function(a,b){ return (a.createdAt||"").localeCompare(b.createdAt||""); });
          var recChain = Promise.resolve();
          calcs.forEach(function(c){
            recChain = recChain.then(function(){
              var pKey = (c.productName||"").trim().toLowerCase();
              var productItemId = itemIdByProdName[pKey];
              var items = (c.items||[]).map(function(it){
                var mKey = (it.materialName||"").trim().toLowerCase();
                return { materialItemId: itemIdByMatName[mKey]||"", materialName:it.materialName||"", qty:Number(it.qty)||0, price:Number(it.price)||0, altMaterialItemId:"", altMaterialName:"" };
              });
              var recipeKey = pKey+"__"+(c.machineName||"");
              var recipePromise;
              if(!recipeSeen[recipeKey]){
                recipePromise = STATE.db.collection("recipes").add({
                  productItemId:productItemId||"", productName:c.productName||"", unit:c.unit||UNIT_OPTIONS[0],
                  quantity:Number(c.quantity)||1, items:items, labor:Number(c.laborCost)||0, overhead:Number(c.overheadCost)||0,
                  machineName:c.machineName||"", note:c.note||"", sample:!!c.sample, createdAt:c.createdAt||new Date().toISOString()
                }).then(function(ref){ recipeSeen[recipeKey]=ref.id; });
              } else { recipePromise = Promise.resolve(); }
              return recipePromise.then(function(){
                return STATE.db.collection("productions").add({
                  recipeId:recipeSeen[recipeKey]||"", productItemId:productItemId||"", productName:c.productName||"",
                  quantity:Number(c.quantity)||0, unit:c.unit||UNIT_OPTIONS[0], warehouseId:whId, producerEmployeeId:"", categoryId:"",
                  machineName:c.machineName||"", items:items.map(function(it){ return {itemId:it.materialItemId,name:it.materialName,qty:it.qty,price:it.price,cost:it.qty*it.price,isAlt:false}; }),
                  materialsCost:Number(c.materialsCost)||0, laborCost:Number(c.laborCost)||0, overheadCost:Number(c.overheadCost)||0,
                  totalCost:Number(c.totalCost)||0, costPerUnit:Number(c.costPerUnit)||0, note:c.note||"", sample:!!c.sample,
                  createdAt:c.createdAt||new Date().toISOString(), migrated:true
                });
              });
            });
          });
          return recChain;
        });
        return chain;
      });
    });
  }

