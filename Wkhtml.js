var exec = require("child_process").exec,
    util = {
        buildOptions: function (options) {
            var commandOptions = [];
            if (!options) {
                return [];
            }
            Object.keys(options).forEach(function (name) {
                commandOptions = commandOptions.concat(" ", name.length == 1 ? "-" : "--", name, " ", options[name]);
            });
            return commandOptions;
        },
        buildCommand: function (doc, filename) {
            var command = [doc.command],
                stdin = [],
                self = this;
            doc.objects.forEach(function (object) {
                command = command.concat(" ");
                if (object.html) {
                    stdin.push(object.html);
                } else {
                    command = command.concat(object.filename || object.url);
                }
                if (object.options) {
                    command = command.concat(self.buildOptions(object.options));
                }
            });
            if (stdin.length) {
                command.unshift(doc.binaryPath);
                command = command.concat("-");
                command = command.concat(" ", filename || "-");
                command = ["echo  \"", util.addCSlashes(stdin.join("\n"), '"'), "\" | "].concat(command);
            } else {
                command = command.concat(" ", filename || "-");
                command.unshift(doc.binaryPath);
            }
            return command.join("");
        },
        addCSlashes: function (str, charlist) {
            var target = '',
                chrs = [],
                i = 0,
                j = 0,
                c = '',
                next = '',
                rangeBegin = '',
                rangeEnd = '',
                chr = '',
                begin = 0,
                end = 0,
                octalLength = 0,
                postOctalPos = 0,
                cca = 0,
                escHexGrp = [],
                encoded = '',
                percentHex = /%([\dA-Fa-f]+)/g;
            var _pad = function (n, c) {
                if ((n = n + '').length < c) {
                    return new Array(++c - n.length).join('0') + n;
                }
                return n;
            };

            for (i = 0; i < charlist.length; i++) {
                c = charlist.charAt(i);
                next = charlist.charAt(i + 1);
                if (c === '\\' && next && (/\d/).test(next)) { // Octal
                    rangeBegin = charlist.slice(i + 1).match(/^\d+/)[0];
                    octalLength = rangeBegin.length;
                    postOctalPos = i + octalLength + 1;
                    if (charlist.charAt(postOctalPos) + charlist.charAt(postOctalPos + 1) === '..') { // Octal begins range
                        begin = rangeBegin.charCodeAt(0);
                        if ((/\\\d/).test(charlist.charAt(postOctalPos + 2) + charlist.charAt(postOctalPos + 3))) { // Range ends with octal
                            rangeEnd = charlist.slice(postOctalPos + 3).match(/^\d+/)[0];
                            i += 1; // Skip range end backslash
                        } else if (charlist.charAt(postOctalPos + 2)) { // Range ends with character
                            rangeEnd = charlist.charAt(postOctalPos + 2);
                        } else {
                            throw 'Range with no end point';
                        }
                        end = rangeEnd.charCodeAt(0);
                        if (end > begin) { // Treat as a range
                            for (j = begin; j <= end; j++) {
                                chrs.push(String.fromCharCode(j));
                            }
                        } else { // Supposed to treat period, begin and end as individual characters only, not a range
                            chrs.push('.', rangeBegin, rangeEnd);
                        }
                        i += rangeEnd.length + 2; // Skip dots and range end (already skipped range end backslash if present)
                    } else { // Octal is by itself
                        chr = String.fromCharCode(parseInt(rangeBegin, 8));
                        chrs.push(chr);
                    }
                    i += octalLength; // Skip range begin
                } else if (next + charlist.charAt(i + 2) === '..') { // Character begins range
                    rangeBegin = c;
                    begin = rangeBegin.charCodeAt(0);
                    if ((/\\\d/).test(charlist.charAt(i + 3) + charlist.charAt(i + 4))) { // Range ends with octal
                        rangeEnd = charlist.slice(i + 4).match(/^\d+/)[0];
                        i += 1; // Skip range end backslash
                    } else if (charlist.charAt(i + 3)) { // Range ends with character
                        rangeEnd = charlist.charAt(i + 3);
                    } else {
                        throw 'Range with no end point';
                    }
                    end = rangeEnd.charCodeAt(0);
                    if (end > begin) { // Treat as a range
                        for (j = begin; j <= end; j++) {
                            chrs.push(String.fromCharCode(j));
                        }
                    } else { // Supposed to treat period, begin and end as individual characters only, not a range
                        chrs.push('.', rangeBegin, rangeEnd);
                    }
                    i += rangeEnd.length + 2; // Skip dots and range end (already skipped range end backslash if present)
                } else { // Character is by itself
                    chrs.push(c);
                }
            }

            for (i = 0; i < str.length; i++) {
                c = str.charAt(i);
                if (chrs.indexOf(c) !== -1) {
                    target += '\\';
                    cca = c.charCodeAt(0);
                    if (cca < 32 || cca > 126) { // Needs special escaping
                        switch (c) {
                            case '\n':
                                target += 'n';
                                break;
                            case '\t':
                                target += 't';
                                break;
                            case '\u000D':
                                target += 'r';
                                break;
                            case '\u0007':
                                target += 'a';
                                break;
                            case '\v':
                                target += 'v';
                                break;
                            case '\b':
                                target += 'b';
                                break;
                            case '\f':
                                target += 'f';
                                break;
                            default:
                                //target += _pad(cca.toString(8), 3);break; // Sufficient for UTF-16
                                encoded = encodeURIComponent(c);

                                // 3-length-padded UTF-8 octets
                                if ((escHexGrp = percentHex.exec(encoded)) !== null) {
                                    target += _pad(parseInt(escHexGrp[1], 16).toString(8), 3); // already added a slash above
                                }
                                while ((escHexGrp = percentHex.exec(encoded)) !== null) {
                                    target += '\\' + _pad(parseInt(escHexGrp[1], 16).toString(8), 3);
                                }
                                break;
                        }
                    } else { // Perform regular backslashed escaping
                        target += c;
                    }
                } else { // Just add the character unescaped
                    target += c;
                }
            }
            return target;
        },
        safeMixin: function (target, source) {
            var name, t, op = Object.prototype, opts = op.toString,cname = "constructor";
            // add props adding metadata for incoming functions skipping a constructor
            for (name in source) {
                t = source[name];
                if ((t !== op[name] || !(name in op)) && name != cname) {
                    if (opts.call(t) == "[object Function]") {
                        // non-trivial function method => attach its name
                        t.nom = name;
                    }
                    target[name] = t;
                }
            }
            return target;
        },
        applyIf:function(src,props){
            for(var k in props){
                if(props.hasOwnProperty(k) && !(k in src)){
                    src[k] = props[k];
                }
            }
            return src;
        }
    };
/**
 * @class Wkhtml
 * @param args
 * @param {String} args.type pdf or image
 * @param {String} args.binaryPath
 * @param {String} args.binFile binary file name
 * @param {Object} args.options
 * @constructor
 */
function Wkhtml(args) {
    util.safeMixin(this,args);
    this.type = this.type || "pdf";
    var binFile = "wkhtmlto" + this.type;
    binFile = args.binFile || binFile;
    this.binaryPath = this.binaryPath ? this.binaryPath + "/" + binFile : binFile;
    //build global options
    this.command = this.options ? util.buildOptions(this.options).join("") : "";
    this.objects = [];
}
util.applyIf(Wkhtml.prototype,{
    /**
     * @method add
     * @param {Object} option
     * @param {String} option.html if html is defined, ignore filename and url
     * @param {String} option.filename if filename is defined, ignore url
     * @param {String} option.url a website url
     * @return {Wkhtml}
     */
    add: function (option) {
        this.objects.push(option);
        return this;
    },
    /**
     * generate pdf to stdout
     * @method convert
     * @param {Function} callback
     */
    convert: function (callback) {
        exec(util.buildCommand(this), callback);
    },
    /**
     * generate pdf to a file
     * @method convertAs
     * @param {String} filename
     * @param {Function} callback
     */
    convertAs: function (filename, callback) {
        exec(util.buildCommand(this, filename), callback);
    }
});
module.exports = Wkhtml;

