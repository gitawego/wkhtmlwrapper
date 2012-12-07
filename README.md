wkhtmlwrapper
=============
a wrapper for tool [Wkhtml][wkhtml] in NodeJs

binary wkhtmlpdf or wkhtmlimage is required

Usage:
```
var wkhtml = new require('Wkhtml')({
    options:{
        "margin-top":0,
        "margin-bottom":25,
        "margin-left":0,
        "margin-right":0,
        "footer-html":"{CLIENT_PATH}/templates/pdftpl2/footer.html",
        "orientation":"Landscape"
    },
    type:"pdf",
    binaryPath:"/usr/bin/"
});

wkhtml.add({
    filename:"pdf1.pdf"
});

wkhtml.convertAs('/var/www/SITES/test.pdf',function(err){
    //callback
});
```




[wkhtml]:http://code.google.com/p/wkhtmltopdf/




