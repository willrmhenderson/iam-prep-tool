// Tiny static server for local browser preview of the www/ folder.
// Dev use only - the shipped app loads these files directly from the
// Capacitor bundle, not from any server. Run via: npm run serve
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "www");
const PORT = 8100;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};

http.createServer(function(req, res){
  var urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  var filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)){
    res.writeHead(403); res.end("Forbidden"); return;
  }
  fs.readFile(filePath, function(err, data){
    if (err){ res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, function(){
  console.log("I-AM dev server running at http://localhost:" + PORT);
});
