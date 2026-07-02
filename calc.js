/* ============================================================
   FlowZone Cyclone 3 — calibration math (pure functions)
   Loaded by index.html; also runs under Node for tests:
     node tests/calc.test.js
   ============================================================ */
(function(){
"use strict";

var TANK_GAL=4;
var SPEEDS=[1,2,3,4,5];
var SQFT_PER_ACRE=43560;
var PER_ACRE_TO_PER_1000=SQFT_PER_ACRE/1000; // 43.56
var OZ_PER_GAL=128;
// 1/128-acre method: the test plot is 1/128 of an acre, so oz collected == gal/acre.
var SQFT_PER_128_PLOT=SQFT_PER_ACRE/128; // 340.3125

/* ---------- helpers ---------- */
function num(v){
  var n=parseFloat(String(v==null?"":v).replace(/,/g,""));
  return isFinite(n)?n:NaN;
}
function r2(n){return Math.round(n*100)/100;}
function r1(n){return Math.round(n*10)/10;}
function fmtTime(sec){
  if(!isFinite(sec)||sec<=0) return "—";
  var m=Math.floor(sec/60), s=Math.round(sec%60);
  return m>0?(m+":"+String(s).padStart(2,"0")):(s+"s");
}
function bandFor(gpk){
  if(!isFinite(gpk)||gpk<=0) return {key:"none",label:"—",v:"ink-soft"};
  if(gpk<0.75) return {key:"light",label:"light coverage",v:"amber"};
  if(gpk<1.5) return {key:"std",label:"standard ≈1 gal/1k",v:"green"};
  if(gpk<=4) return {key:"heavy",label:"heavy / fungicide range",v:"blue"};
  return {key:"vheavy",label:"very heavy",v:"amber"};
}
function estPsiFromFlow(gpm,ratedGpm,ratedPsi){
  if(!isFinite(gpm)||!isFinite(ratedGpm)||!isFinite(ratedPsi)||ratedGpm<=0) return NaN;
  return ratedPsi*Math.pow(gpm/ratedGpm,2);
}

/* ---------- calibration math ---------- */
function computeArea(o){
  var a=num(o.areaSqFt),v=num(o.volume),t=num(o.timeSec);
  if(!isFinite(a)||a<=0||!isFinite(v)||v<=0) return null;
  var volGal=o.volumeUnit==="oz"?v/OZ_PER_GAL:v;
  var gpk=(volGal/a)*1000;
  var timePer1000=(isFinite(t)&&t>0)?(t/a)*1000:NaN;
  var gpm=(isFinite(t)&&t>0)?volGal/(t/60):NaN;
  return {gpk:gpk,timePer1000Sec:timePer1000,gpm:gpm};
}
function computeFlowTime(o){
  var bo=num(o.bucketOz),bs=num(o.bucketSec),ca=num(o.coverArea),cs=num(o.coverSec);
  if(!(isFinite(bo)&&isFinite(bs)&&isFinite(ca)&&isFinite(cs))||bs<=0||ca<=0||cs<=0) return null;
  var gpm=(bo/OZ_PER_GAL)/(bs/60);
  var timePer1000=(cs/ca)*1000;
  var gpk=gpm*(timePer1000/60);
  return {gpk:gpk,timePer1000Sec:timePer1000,gpm:gpm};
}
function compute128(o){
  var p=num(o.plotSqFt),t=num(o.plotSec),c=num(o.collectedOz);
  if(!(isFinite(p)&&isFinite(t)&&isFinite(c))||p<=0||t<=0) return null;
  var gpa=c*(SQFT_PER_128_PLOT/p);
  var gpk=gpa/PER_ACRE_TO_PER_1000;
  var timePer1000=(t/p)*1000;
  var gpm=(c/OZ_PER_GAL)/(t/60);
  return {gpk:gpk,timePer1000Sec:timePer1000,gpm:gpm,gpa:gpa};
}

/* ---------- backup validation ----------
   Accepts a parsed backup object; returns {customNozzles, calibrations,
   dropped} with only well-formed records, or null if the object isn't a
   recognizable backup at all. Guards restore and startup load so a bad
   record can never crash the UI. */
function sanitizeBackup(obj){
  if(!obj||typeof obj!=="object") return null;
  var hasNoz=Array.isArray(obj.customNozzles);
  var hasCal=obj.calibrations&&typeof obj.calibrations==="object"&&!Array.isArray(obj.calibrations);
  if(!hasNoz&&!hasCal) return null;
  var dropped=0;

  var nozzles=[];
  if(hasNoz) obj.customNozzles.forEach(function(n){
    if(n&&typeof n==="object"&&typeof n.id==="string"&&n.id&&typeof n.name==="string"&&n.name.trim()){
      nozzles.push({id:n.id,name:n.name,
        description:typeof n.description==="string"?n.description:"",
        info:typeof n.info==="string"?n.info:"",
        ratedGpm:n.ratedGpm!=null?String(n.ratedGpm):"",
        ratedPsi:n.ratedPsi!=null?String(n.ratedPsi):"40",
        builtin:false,chart:null});
    }else dropped++;
  });

  var cals={};
  if(hasCal) Object.keys(obj.calibrations).forEach(function(k){
    var r=obj.calibrations[k];
    var gpk=r&&Number(r.gpk), speed=r&&Number(r.speed);
    if(r&&typeof r==="object"&&typeof r.nozzleId==="string"&&r.nozzleId&&
       isFinite(gpk)&&gpk>0&&SPEEDS.indexOf(speed)>=0){
      cals[k]={nozzleId:r.nozzleId,
        nozzleName:typeof r.nozzleName==="string"?r.nozzleName:r.nozzleId,
        speed:speed,method:typeof r.method==="string"?r.method:"flowtime",
        gpk:gpk,
        timePer1000Sec:isFinite(Number(r.timePer1000Sec))?Number(r.timePer1000Sec):NaN,
        gpm:isFinite(Number(r.gpm))?Number(r.gpm):NaN,
        chartGpm:isFinite(Number(r.chartGpm))?Number(r.chartGpm):null,
        chartPsi:isFinite(Number(r.chartPsi))?Number(r.chartPsi):null,
        estPsi:isFinite(Number(r.estPsi))?Number(r.estPsi):null,
        inputs:r.inputs&&typeof r.inputs==="object"?r.inputs:{},
        notes:typeof r.notes==="string"?r.notes:"",
        date:typeof r.date==="string"?r.date:"",
        ts:isFinite(Number(r.ts))?Number(r.ts):0};
    }else dropped++;
  });

  return {customNozzles:nozzles,calibrations:cals,dropped:dropped};
}

var CycloneCalc={
  TANK_GAL:TANK_GAL,SPEEDS:SPEEDS,SQFT_PER_ACRE:SQFT_PER_ACRE,
  PER_ACRE_TO_PER_1000:PER_ACRE_TO_PER_1000,OZ_PER_GAL:OZ_PER_GAL,
  SQFT_PER_128_PLOT:SQFT_PER_128_PLOT,
  num:num,r2:r2,r1:r1,fmtTime:fmtTime,bandFor:bandFor,
  estPsiFromFlow:estPsiFromFlow,
  computeArea:computeArea,computeFlowTime:computeFlowTime,compute128:compute128,
  sanitizeBackup:sanitizeBackup
};
if(typeof module!=="undefined"&&module.exports) module.exports=CycloneCalc;
else window.CycloneCalc=CycloneCalc;
})();
