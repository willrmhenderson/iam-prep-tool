// Small shared helpers. Kept dependency-free on purpose.

const ESC_MAP = {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"};

// Escapes a value for safe interpolation into an HTML string.
// Every place in render.js that inserts user-entered text into markup
// MUST pass it through esc() first - this is what closes the XSS gap
// that existed in the original single-file version.
export function esc(v){
  if(v===undefined||v===null)return"";
  return String(v).replace(/[&<>"']/g,function(c){return ESC_MAP[c];});
}

export function debounce(fn,ms){
  var t=null;
  return function(){
    var args=arguments,ctx=this;
    clearTimeout(t);
    t=setTimeout(function(){fn.apply(ctx,args);},ms);
  };
}

export function uuid(){
  if(window.crypto&&window.crypto.randomUUID)return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){
    var r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);
    return v.toString(16);
  });
}

export function nowIso(){return new Date().toISOString();}
