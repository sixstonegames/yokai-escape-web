// 장 구성 (게임과 생성기 공용) — 10장 × 50판
(function(root){
const CHAPTERS=[
 {n:1, name:'마을 입구', en:'Village Gate',   focus:'fox',   theme:['#A8E6A1','#9CDD94','#7CC97C']},
 {n:2, name:'어둠의 숲', en:'Dark Forest',   focus:'ghost', theme:['#9FD8C2','#8ECDB5','#4E9C86']},
 {n:3, name:'궁궐', en:'Palace',        focus:'hae',   theme:['#F4D9B8','#EDCBA2','#C0784A']},
 {n:4, name:'장승 고개', en:'Jangseung Pass',   focus:'jang',  theme:['#DCE3C8','#CFD8B6','#8A9466']},
 {n:5, name:'늪', en:'Swamp',          focus:'toad',  theme:['#C9DDA0','#BCD38E','#7D9A4F']},
 {n:6, name:'옹기 골목', en:'Pottery Alley',   focus:'gang',  theme:['#EBD9C4','#E2CBB0','#A9774F']},
 {n:7, name:'산', en:'Mountain',          focus:'san',   theme:['#C8E0B4','#B9D6A2','#6F8F5A']},
 {n:8, name:'도깨비 시장', en:'Goblin Market', focus:'fire',  theme:['#E6D6F2','#DAC6EC','#8E62B3']},
 {n:9, name:'강나루', en:'River Ferry',      focus:'hop',   theme:['#BFE2F4','#AED7EE','#5B9BC8']},
 {n:10,name:'하늘 문', en:'Sky Gate',     focus:'twin',  theme:['#F7E3A8','#F2D78C','#D4A73A']}
];
const PER=50;
if(typeof module!=='undefined'&&module.exports) module.exports={CHAPTERS,PER}; else { root.YO_CHAPTERS=CHAPTERS; root.YO_PER=PER; }
})(this);
