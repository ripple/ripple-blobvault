var config = require("../../config")
var idHost = config.phone.url.indexOf("sandbox") === -1
           ? "https://id.ripple.com"
           : "https://idripple.com";

[
  "name-change",
  "password-change",
  "phone-change",
  "signup",
  "verify-fail",
  "verify-ok",
  "verify-pending",
  "step-null",          "step-null-CN",          "step-null-JP",          "step-null-KR",
  "step-jumio-id",      "step-jumio-id-CN",      "step-jumio-id-JP",      "step-jumio-id-KR",
  "step-jumio-doc",     "step-jumio-doc-CN",     "step-jumio-doc-JP",     "step-jumio-doc-KR",
  "step-jumio-company", "step-jumio-company-CN", "step-jumio-company-JP", "step-jumio-company-KR",
].forEach(function(file) {
  var json = require("./" + file + ".json").slice();
  if (json[0].type === "include") {
    var include = json.shift().include;
    json = require("./" + include + ".json").concat([
      "Thanks,\nThe Ripple Trade team",
    ], json);
  } else {
    json.push("Thanks,\nThe Ripple Trade team");
  }
  json.push({
    "type": "small",
    "text": "\nYou are receiving this email because you created a Ripple Trade account.\t"
          + "If you did not sign up for a Ripple Trade account, please disregard this email.",
  });
  json.push({type: "hr"});
  json.push({
    "type": "small",
    "text": "Need help? Contact support@ripple.com",
  });
  module.exports[file + ".txt"]  = emailToText(json);
  module.exports[file + ".html"] = emailToHTML(json);
});

function emailToText(tmpl) {
    return tmpl.map(function(item) {
        if (typeof item === "string") return item;
        if (item.type === "button")   return item.text + ": " + item.href;
        if (item.type === "small")    return item.text;
        if (item.type === "hr")       return "";
        if (item.type === "list")     return listText(item.items);
    }).filter(function(item) {
        return !!item;
    }).join("\n\n").replace(/\t/g, "\n");
}

function emailToHTML(tmpl) {
    var json = tmpl.map(function(item) {
        if (typeof item === "string") return paragraph(item);
        if (item.type === "button") {
            return '<a href="' + item.href + '" style="background:#326cad;color:#ffffff;padding:10px 40px;text-decoration:none;border-radius:4px;margin:0px;display:inline-block;">'
                 +   item.text
                 + '</a>';
        }
        if (item.type === "small") {
            return paragraph('<small style="color:#888888;display:block;">' + item.text + '</small>');
        }
        if (item.type === "hr") {
            return '<hr style="border:none;border-top:1px solid #ddd;margin:0px -40px;">';
        }
        if (item.type === "list") {
            return listHTML(item.items)
        }
    });
    return '<table cellspacing="0" cellpadding="0" border="0" width="440" style="font-family:sans-serif;color:#222222;padding-left:40px;">'
         +   '<tr><td bgcolor="#FFFFFF" align="left">'
         +     '<br>'
         +     '<img src="' + idHost + '/assets/images/ripple-trade.png" alt="Ripple Trade">'
         +     '<br><br>'
         +     '<div>'
         +       json.join('').replace(/\n/g, "<br>").replace(/\t/g, " ")
         +     '</div>'
         +   '</td></tr>'
         + '</table>';
}

function paragraph(text) {
  return '<p style="margin-top:16px;">' + text + '</p>';
}

function listHTML(items) {
  var str = "";
  for (var i = 0; i < items.length; i++) {
    str += '<li>' + items[i] + '</li>'
  }
  return '<ul>' + str + '</ul>';
}

function listText(items) {
  var str = "";
  for (var i = 0; i < items.length; i++) {
    str += '  * ' + items[i] + '\n';
  }
  return str
}
