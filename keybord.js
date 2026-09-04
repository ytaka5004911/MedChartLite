(()=>{
"use strict";
let target=null,keyboard=null,mode="kana";

const kana=[
["あ","か","さ","た","な","は","ま","や","ら","わ"],
["い","き","し","ち","に","ひ","み","ゆ","り","を"],
["う","く","す","つ","ぬ","ふ","む","よ","る","ん"],
["え","け","せ","て","ね","へ","め","れ"],
["お","こ","そ","と","の","ほ","も","ろ"]
];

const abc=[
["q","w","e","r","t","y","u","i","o","p"],
["a","s","d","f","g","h","j","k","l"],
["z","x","c","v","b","n","m"]
];

const ABC=[
["Q","W","E","R","T","Y","U","I","O","P"],
["A","S","D","F","G","H","J","K","L"],
["Z","X","C","V","B","N","M"]
];

const nums=[
["1","2","3","4","5"],
["6","7","8","9","0"],
["-","_","@",".",",","/"],
["!","?","#","$","%","&"]
];

const dakuten={
"か":"が","き":"ぎ","く":"ぐ","け":"げ","こ":"ご",
"さ":"ざ","し":"じ","す":"ず","せ":"ぜ","そ":"ぞ",
"た":"だ","ち":"ぢ","つ":"づ","て":"で","と":"ど",
"は":"ば","ひ":"び","ふ":"ぶ","へ":"べ","ほ":"ぼ",
"う":"ゔ"
};

const handakuten={
"は":"ぱ","ひ":"ぴ","ふ":"ぷ","へ":"ぺ","ほ":"ぽ"
};

const small={
"あ":"ぁ","い":"ぃ","う":"ぅ","え":"ぇ","お":"ぉ",
"つ":"っ","や":"ゃ","ゆ":"ゅ","よ":"ょ","わ":"ゎ"
};

function editable(el){
if(!el)return false;
if(el.matches("textarea"))return true;
if(el.matches('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])'))return true;
return el.isContentEditable;
}
function insertContentEditable(text){
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();

  const node = document.createTextNode(text);
  range.insertNode(node);

  range.setStartAfter(node);
  range.setEndAfter(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

function backspaceContentEditable(){
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  if (!range.collapsed) {
    range.deleteContents();
    return;
  }

  if (range.startOffset === 0) return;

  range.setStart(range.startContainer, range.startOffset - 1);
  range.deleteContents();
}

function enterContentEditable(){
  insertContentEditable("\n");
}
function create(){
if(keyboard)return;

keyboard=document.createElement("div");
keyboard.id="gojuonKeyboard";

keyboard.innerHTML=`
<div class="gk-head">
<span id="gk-mode">かな</span>
<button data-a="close">×</button>
</div>
<div id="gk-keys"></div>
<div class="gk-switch">
<button data-m="kana">かな</button>
<button data-m="abc">abc</button>
<button data-m="ABC">ABC</button>
<button data-m="123">123</button>
</div>
<div class="gk-bottom">
<button data-a="dakuten">゛</button>
<button data-a="handakuten">゜</button>
<button data-a="small">小</button>
<button data-a="backspace">⌫</button>
<button data-a="space">空白</button>
<button data-a="enter">↵</button>
</div>`;

document.body.appendChild(keyboard);

keyboard.addEventListener("pointerdown",e=>{
const b=e.target.closest("button");
if(!b)return;
e.preventDefault();

if(b.dataset.char){
insert(b.dataset.char);
return;
}

if(b.dataset.m){
mode=b.dataset.m;
render();
return;
}

switch(b.dataset.a){
case"close":hide();break;
case"backspace":backspace();break;
case"space":insert(" ");break;
case"enter":enter();break;
case"dakuten":mark(dakuten);break;
case"handakuten":mark(handakuten);break;
case"small":mark(small);break;
}
});

render();
}
window.create = create;
function render(){
const keys=keyboard.querySelector("#gk-keys");
const title=keyboard.querySelector("#gk-mode");
keys.innerHTML="";

let rows,titleText;

if(mode==="kana"){
rows=kana;
titleText="かな";
}else if(mode==="abc"){
rows=abc;
titleText="abc";
}else if(mode==="ABC"){
rows=ABC;
titleText="ABC";
}else{
rows=nums;
titleText="123";
}

title.textContent=titleText;

rows.forEach(row=>{
const div=document.createElement("div");
div.className="gk-row";

row.forEach(char=>{
const b=document.createElement("button");
b.textContent=char;
b.dataset.char=char;
div.appendChild(b);
});

keys.appendChild(div);
});
}

function insert(text){
if(!target)return;
target.focus();

if(target instanceof HTMLInputElement||
target instanceof HTMLTextAreaElement){

const s=target.selectionStart??target.value.length;
const e=target.selectionEnd??s;

target.setRangeText(text,s,e,"end");

target.dispatchEvent(
new Event("input",{bubbles:true})
);

return;
}

if(target.isContentEditable){
insertContentEditable(text);
}
}

function backspace(){
if(!target)return;
target.focus();

if(target instanceof HTMLInputElement||
target instanceof HTMLTextAreaElement){

const s=target.selectionStart??0;
const e=target.selectionEnd??0;

if(s!==e){
target.setRangeText("",s,e,"start");
}else if(s>0){
target.setRangeText("",s-1,s,"start");
}

target.dispatchEvent(
new Event("input",{bubbles:true})
);

return;
}

if(target.isContentEditable){
backspaceContentEditable();
}
}

function mark(map){
if(!target)return;
target.focus();

if(!(target instanceof HTMLInputElement||
target instanceof HTMLTextAreaElement))return;

const pos=target.selectionStart??0;
if(pos<=0)return;

const value=target.value;
const last=value[pos-1];
const converted=map[last];

if(!converted)return;

target.setRangeText(
converted,
pos-1,
pos,
"end"
);

target.dispatchEvent(
new Event("input",{bubbles:true})
);
}

function enter(){
if(!target)return;

target.focus();

if(target instanceof HTMLTextAreaElement){
insert("\n");
return;
}

if(target.isContentEditable){
enterContentEditable();
return;
}

target.dispatchEvent(
new KeyboardEvent("keydown",{
key:"Enter",
code:"Enter",
bubbles:true
})
);
}

function show(el){
create();
target=el;
keyboard.classList.add("show");
}

function hide(){
if(keyboard)keyboard.classList.remove("show");
target=null;
}

document.addEventListener("focusin",e=>{
if(editable(e.target))show(e.target);
},true);

document.addEventListener("focusout",()=>{
setTimeout(()=>{
if(!keyboard)return;

if(keyboard.contains(document.activeElement))return;

if(!editable(document.activeElement))hide();
},100);
},true);

const style=document.createElement("style");

style.textContent=`
#gojuonKeyboard{
position:fixed;
left:0;
right:0;
bottom:0;
z-index:2147483647;
background:#eee;
padding:6px;
box-sizing:border-box;
user-select:none;
-webkit-user-select:none;
transform:translateY(110%);
transition:transform .15s ease;
font-family:system-ui,sans-serif;
}

#gojuonKeyboard.show{
transform:translateY(0);
}

.gk-head{
height:30px;
display:flex;
align-items:center;
justify-content:space-between;
}

.gk-head span{
font-size:13px;
font-weight:bold;
}

.gk-head button{
width:38px;
height:28px;
border:0;
border-radius:6px;
background:#fff;
font-size:20px;
}

.gk-row{
display:flex;
gap:4px;
margin:4px 0;
}

.gk-row button{
flex:1;
height:43px;
border:0;
border-radius:7px;
background:#fff;
font-size:20px;
box-shadow:0 1px 2px rgba(0,0,0,.2);
touch-action:manipulation;
}

.gk-switch{
display:flex;
gap:4px;
margin-top:5px;
}

.gk-switch button{
flex:1;
height:34px;
border:0;
border-radius:6px;
background:#d5d5d5;
font-size:14px;
touch-action:manipulation;
}

.gk-bottom{
display:flex;
gap:4px;
margin-top:4px;
}

.gk-bottom button{
flex:1;
height:40px;
border:0;
border-radius:7px;
background:#d5d5d5;
font-size:16px;
touch-action:manipulation;
}

#gojuonKeyboard button:active{
transform:scale(.95);
background:#ccc;
}
`;

document.head.appendChild(style);
const editableTargets = document.querySelectorAll('input, textarea, [contenteditable="true"]');
if (editableTargets.length > 0) {
  editableTargets.forEach(el=>{
    el.setAttribute('inputmode', 'none');
  });
}
})();
