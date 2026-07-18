// Event delegation for the whole app.
//
// Every screen is produced by replacing #root's innerHTML wholesale
// (see draw() in main.js), which destroys and recreates every element
// on every navigation. Attaching a listener to each individual button
// would mean re-attaching hundreds of listeners after every re-render.
// Instead, three listeners are attached ONCE, here, to the stable
// #root container - they keep working across every re-render because
// #root itself is never replaced, only its children - and each event
// is routed to the right IAM.* function by reading data-* attributes
// off the element that was actually interacted with.
//
// This replaces the app's original onclick="IAM.foo(...)" pattern,
// which only works with a relaxed script-src 'unsafe-inline' CSP -
// see the memory note iam-csp-inline-handlers for why that mattered.
//
// Screen markup uses:
//   data-action="fnName" data-args="[...]"   -> click
//   data-field="fnName"  data-args="[...]"   -> input (text/textarea, fires live as you type)
//   data-onchange="fnName" data-args="[...]" -> change (select, checkbox, file input)
// For data-field/data-onchange, the element's current value (or
// .checked for checkboxes, or the file input's file for file pickers)
// is appended as the last argument automatically - the same shape
// "...,this.value" or "...,this.checked" had in the old inline calls.

function parseArgs(el){
  var raw = el.getAttribute("data-args");
  if (!raw) return [];
  try{ return JSON.parse(raw); }catch(e){ return []; }
}

function dispatch(IAM, name, args){
  if (typeof IAM[name] === "function") IAM[name].apply(null, args);
  else console.warn("delegate.js: no IAM handler named", name);
}

export function initDelegation(root, IAM){
  root.addEventListener("click", function(e){
    var el = e.target.closest("[data-action]");
    if (!el || !root.contains(el)) return;
    dispatch(IAM, el.getAttribute("data-action"), parseArgs(el));
  });

  root.addEventListener("input", function(e){
    var el = e.target;
    if (!el.hasAttribute || !el.hasAttribute("data-field")) return;
    var args = parseArgs(el);
    args.push(el.value);
    dispatch(IAM, el.getAttribute("data-field"), args);
  });

  root.addEventListener("change", function(e){
    var el = e.target;
    if (!el.hasAttribute) return;
    if (el.hasAttribute("data-onchange")){
      var args = parseArgs(el);
      if (el.type === "checkbox") args.push(el.checked);
      else if (el.type === "file") args.push(el);
      else args.push(el.value);
      dispatch(IAM, el.getAttribute("data-onchange"), args);
    }
  });
}
