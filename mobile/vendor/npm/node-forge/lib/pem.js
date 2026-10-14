/**
 * Javascript implementation of basic PEM (Privacy Enhanced Mail) algorithms.
 *
 * See: RFC 1421.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2013-2014 Digital Bazaar, Inc.
 *
 * A Forge PEM object has the following fields:
 *
 * type: identifies the type of message (eg: "RSA PRIVATE KEY").
 *
 * procType: identifies the type of processing performed on the message,
 *   it has two subfields: version and type, eg: 4,ENCRYPTED.
 *
 * contentDomain: identifies the type of content in the message, typically
 *   only uses the value: "RFC822".
 *
 * dekInfo: identifies the message encryption algorithm and mode and includes
 *   any parameters for the algorithm, it has two subfields: algorithm and
 *   parameters, eg: DES-CBC,F8143EDE5960C597.
 *
 * headers: contains all other PEM encapsulated headers -- where order is
 *   significant (for pairing data like recipient ID + key info).
 *
 * body: the binary-encoded body.
 */
var forge = require('./forge');
require('./util');

// shortcut for pem API
var pem = module.exports = forge.pem = forge.pem || {};

/**
 * Encodes (serializes) the given PEM object.
 *
 * @param msg the PEM message object to encode.
 * @param options the options to use:
 *          maxline the maximum characters per line for the body, (default: 64).
 *
 * @return the PEM-formatted string.
 */
pem.encode = function(msg, options) {
  options = options || {};
  var rval = '-----BEGIN ' + msg.type + '-----\r\n';

  // encode special headers
  var header;
  if(msg.procType) {
    header = {
      name: 'Proc-Type',
      values: [String(msg.procType.version), msg.procType.type]
    };
    rval += foldHeader(header);
  }
  if(msg.contentDomain) {
    header = {name: 'Content-Domain', values: [msg.contentDomain]};
    rval += foldHeader(header);
  }
  if(msg.dekInfo) {
    header = {name: 'DEK-Info', values: [msg.dekInfo.algorithm]};
    if(msg.dekInfo.parameters) {
      header.values.push(msg.dekInfo.parameters);
    }
    rval += foldHeader(header);
  }

  if(msg.headers) {
    // encode all other headers
    for(var i = 0; i < msg.headers.length; ++i) {
      rval += foldHeader(msg.headers[i]);
    }
  }

  // terminate header
  if(msg.procType) {
    rval += '\r\n';
  }

  // add body
  rval += forge.util.encode64(msg.body, options.maxline || 64) + '\r\n';

  rval += '-----END ' + msg.type + '-----\r\n';
  return rval;
};

/**
 * Decodes (deserializes) all PEM messages found in the given string.
 *
 * @param str the PEM-formatted string to decode.
 *
 * @return the PEM message objects in an array.
 */
pem.decode = function(str) {
  var rval = [];

  // split string into PEM messages (be lenient w/EOF on BEGIN line)
  // Proje yaması: önceki düzenli ifadeler (rMessage/rHeader ve satır sonu
  // kırpma) uzun kötü niyetli girdilerde karesel/üstel geri izlemeye
  // giriyordu (CodeQL js/polynomial-redos). Aynı eşleşmeleri doğrusal zamanda
  // bulan tarayıcı kullanılır; bkz. _pemMessages.
  var rCRLF = /\r?\n/;
  var messages = _pemMessages(str);
  var match;
  for(var mi = 0; mi < messages.length; ++mi) {
    match = messages[mi];

    // accept "NEW CERTIFICATE REQUEST" as "CERTIFICATE REQUEST"
    // https://datatracker.ietf.org/doc/html/rfc7468#section-7
    var type = match[1];
    if(type === 'NEW CERTIFICATE REQUEST') {
      type = 'CERTIFICATE REQUEST';
    }

    var msg = {
      type: type,
      procType: null,
      contentDomain: null,
      dekInfo: null,
      headers: [],
      body: forge.util.decode64(match[3])
    };
    rval.push(msg);

    // no headers
    if(!match[2]) {
      continue;
    }

    // parse headers
    var lines = match[2].split(rCRLF);
    var li = 0;
    while(match && li < lines.length) {
      // get line, trim any rhs whitespace
      var line = _rtrim(lines[li]);

      // RFC2822 unfold any following folded lines
      for(var nl = li + 1; nl < lines.length; ++nl) {
        var next = lines[nl];
        if(!/\s/.test(next[0])) {
          break;
        }
        line += next;
        li = nl;
      }

      // parse header
      match = _matchHeader(line);
      if(match) {
        var header = {name: match[1], values: []};
        var values = match[2].split(',');
        for(var vi = 0; vi < values.length; ++vi) {
          header.values.push(ltrim(values[vi]));
        }

        // Proc-Type must be the first header
        if(!msg.procType) {
          if(header.name !== 'Proc-Type') {
            throw new Error('Invalid PEM formatted message. The first ' +
              'encapsulated header must be "Proc-Type".');
          } else if(header.values.length !== 2) {
            throw new Error('Invalid PEM formatted message. The "Proc-Type" ' +
              'header must have two subfields.');
          }
          msg.procType = {version: values[0], type: values[1]};
        } else if(!msg.contentDomain && header.name === 'Content-Domain') {
          // special-case Content-Domain
          msg.contentDomain = values[0] || '';
        } else if(!msg.dekInfo && header.name === 'DEK-Info') {
          // special-case DEK-Info
          if(header.values.length === 0) {
            throw new Error('Invalid PEM formatted message. The "DEK-Info" ' +
              'header must have at least one subfield.');
          }
          msg.dekInfo = {algorithm: values[0], parameters: values[1] || null};
        } else {
          msg.headers.push(header);
        }
      }

      ++li;
    }

    if(msg.procType === 'ENCRYPTED' && !msg.dekInfo) {
      throw new Error('Invalid PEM formatted message. The "DEK-Info" ' +
        'header must be present if "Proc-Type" is "ENCRYPTED".');
    }
  }

  if(rval.length === 0) {
    throw new Error('Invalid PEM formatted message.');
  }

  return rval;
};

// --- Proje yaması: doğrusal zamanlı PEM tarayıcısı -------------------------
// Önceki /\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?
// ([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g ifadesinin geçerli PEM'lerde
// ürettiği eşleşmeleri ([tam, tür, başlıklar, gövde]) üretir.
var _WS = /\s/;
function _isWs(ch) {
  return _WS.test(ch);
}
function _inPrintable(code) {
  return code >= 0x21 && code <= 0x7e;
}
function _inHeaderSet(ch) {
  return _inPrintable(ch.charCodeAt(0)) || _isWs(ch);
}
function _inBodySet(ch) {
  return /[:A-Za-z0-9+\/=]/.test(ch) || _isWs(ch);
}
function _inTypeSet(ch) {
  return /[A-Z0-9\- ]/.test(ch);
}
// `-----` ile biten tür adını okur (yalnız [A-Z0-9- ]); yoksa -1.
function _typeEnd(str, start) {
  var close = start;
  while(close < str.length && _inTypeSet(str[close])) {
    if(str.substr(close, 5) === '-----' && close > start) {
      return close;
    }
    ++close;
  }
  return -1;
}
function _pemMessages(str) {
  var n = str.length;
  var i;
  // nextBadHeader[i]: i ve sonrasında başlık kümesinde olmayan ilk konum.
  var nextBadHeader = new Array(n + 1);
  nextBadHeader[n] = n;
  for(i = n - 1; i >= 0; --i) {
    nextBadHeader[i] = _inHeaderSet(str[i]) ? nextBadHeader[i + 1] : i;
  }
  // lastBadBody[i]: i'den önce gövde kümesinde olmayan son konum (-1 yok).
  var lastBadBody = new Array(n + 1);
  lastBadBody[0] = -1;
  for(i = 0; i < n; ++i) {
    lastBadBody[i + 1] = _inBodySet(str[i]) ? lastBadBody[i] : i;
  }
  // blankLen[p]: p'de \r?\n\r?\n eşleşmesinin uzunluğu; nextBlank[i]: i ve
  // sonrasında boş satırın başladığı ilk konum.
  var blankLen = new Array(n + 1);
  var nextBlank = new Array(n + 2);
  nextBlank[n + 1] = -1;
  blankLen[n] = 0;
  nextBlank[n] = -1;
  for(i = n - 1; i >= 0; --i) {
    var j = i;
    if(str[j] === '\r') {
      ++j;
    }
    var len = 0;
    if(str[j] === '\n') {
      ++j;
      if(str[j] === '\r') {
        ++j;
      }
      if(str[j] === '\n') {
        len = j + 1 - i;
      }
    }
    blankLen[i] = len;
    nextBlank[i] = len ? i : nextBlank[i + 1];
  }
  // Tüm END işaretleri türlerine göre (artan konumla) bir kez toplanır.
  var ends = Object.create(null);
  var at = str.indexOf('-----END ');
  while(at !== -1) {
    var close = _typeEnd(str, at + 9);
    if(close !== -1) {
      var key = str.substring(at + 9, close);
      (key in ends ? ends[key] : (ends[key] = [])).push(at);
    }
    at = str.indexOf('-----END ', at + 1);
  }
  function firstEnd(list, from) {
    var lo = 0;
    var hi = list.length;
    while(lo < hi) {
      var mid = (lo + hi) >> 1;
      if(list[mid] < from) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo < list.length ? list[lo] : -1;
  }
  // `s` gövde başlangıcı için eşleşmeyi dener.
  function attempt(type, list, s) {
    var e = firstEnd(list, s + 1);
    if(e === -1) {
      return null;
    }
    var bad = lastBadBody[e];
    // başlık bölümü (tembel, isteğe bağlı grup önce denenir)
    var p = nextBlank[Math.max(s + 1, bad - 3)];
    while(p !== -1 && p < e) {
      var bodyStart = p + blankLen[p];
      if(p > nextBadHeader[s]) {
        break;
      }
      if(bodyStart > bad && bodyStart < e) {
        return {headers: str.substring(s, bodyStart), body: str.substring(bodyStart, e), end: e};
      }
      p = nextBlank[p + 1];
    }
    // başlıksız
    if(bad < s && s < e) {
      return {headers: undefined, body: str.substring(s, e), end: e};
    }
    return null;
  }
  var out = [];
  var from = 0;
  while(true) {
    var b = str.indexOf('-----BEGIN ', from);
    if(b === -1) {
      break;
    }
    var typeEnd = _typeEnd(str, b + 11);
    var found = null;
    if(typeEnd !== -1) {
      var type = str.substring(b + 11, typeEnd);
      var list = type in ends ? ends[type] : null;
      if(list) {
        // `\r?\n?` açgözlüdür; geri izleme sırasıyla adaylar denenir.
        var s0 = typeEnd + 5;
        var starts = [];
        if(str[s0] === '\r') {
          if(str[s0 + 1] === '\n') {
            starts.push(s0 + 2);
          }
          starts.push(s0 + 1);
        } else if(str[s0] === '\n') {
          starts.push(s0 + 1);
        }
        starts.push(s0);
        for(var k = 0; k < starts.length && !found; ++k) {
          found = attempt(type, list, starts[k]);
        }
      }
      if(found) {
        var endLen = 9 + type.length + 5;
        var match = [str.substring(b, found.end + endLen), type, found.headers, found.body];
        out.push(match);
        from = found.end + endLen;
        continue;
      }
    }
    from = b + 1;
  }
  return out;
}

function _rtrim(line) {
  var end = line.length;
  while(end > 0 && _isWs(line[end - 1])) {
    --end;
  }
  return line.substring(0, end);
}

// /([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/ ile aynı sonucu doğrusal zamanda verir.
function _matchHeader(line) {
  var n = line.length;
  var t = 0;
  while(t < n) {
    if(!_inPrintable(line.charCodeAt(t))) {
      ++t;
      continue;
    }
    var tokenEnd = t;
    while(tokenEnd < n && _inPrintable(line.charCodeAt(tokenEnd))) {
      ++tokenEnd;
    }
    for(var c = tokenEnd - 1; c > t; --c) {
      if(line[c] !== ':') {
        continue;
      }
      var w = c + 1;
      while(w < n && _isWs(line[w])) {
        ++w;
      }
      var valueStart;
      if(w < n && _inHeaderSet(line[w])) {
        valueStart = w;
      } else if(w > c + 1) {
        valueStart = w - 1;
      } else {
        continue;
      }
      var valueEnd = valueStart;
      while(valueEnd < n && _inHeaderSet(line[valueEnd])) {
        ++valueEnd;
      }
      return [line.substring(t, valueEnd), line.substring(t, c),
        line.substring(valueStart, valueEnd)];
    }
    t = tokenEnd;
  }
  return null;
}

function foldHeader(header) {
  var rval = header.name + ': ';

  // ensure values with CRLF are folded
  var values = [];
  var insertSpace = function(match, $1) {
    return ' ' + $1;
  };
  for(var i = 0; i < header.values.length; ++i) {
    values.push(header.values[i].replace(/^(\S+\r\n)/, insertSpace));
  }
  rval += values.join(',') + '\r\n';

  // do folding
  var length = 0;
  var candidate = -1;
  for(var i = 0; i < rval.length; ++i, ++length) {
    if(length > 65 && candidate !== -1) {
      var insert = rval[candidate];
      if(insert === ',') {
        ++candidate;
        rval = rval.substr(0, candidate) + '\r\n ' + rval.substr(candidate);
      } else {
        rval = rval.substr(0, candidate) +
          '\r\n' + insert + rval.substr(candidate + 1);
      }
      length = (i - candidate - 1);
      candidate = -1;
      ++i;
    } else if(rval[i] === ' ' || rval[i] === '\t' || rval[i] === ',') {
      candidate = i;
    }
  }

  return rval;
}

function ltrim(str) {
  return str.replace(/^\s+/, '');
}
