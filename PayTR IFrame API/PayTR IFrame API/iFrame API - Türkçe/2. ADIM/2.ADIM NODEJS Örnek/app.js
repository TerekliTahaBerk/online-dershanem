var express = require('express');
var ejsLayouts = require('express-ejs-layouts');
var microtime = require('microtime');
var crypto = require('crypto');
var app = express();
var nodeBase64 = require('nodejs-base64-converter');
var request = require('request');
var path = require('path');


app.set('views', path.join(__dirname, '/app_server/views'));

app.set('view engine', 'ejs');
app.use(ejsLayouts);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var merchant_id = 'XXXXXX';
var merchant_key = 'YYYYYYYYYYYYYY';
var merchant_salt = 'ZZZZZZZZZZZZZZ';
var basket = JSON.stringify([
    ['Örnek Ürün 1', '18.00', 1],
    ['Örnek Ürün 2', '33.25', 2],
    ['Örnek Ürün 3', '45.42', 1]
]);
var user_basket = nodeBase64.encode(basket);
var merchant_oid = "IN" + microtime.now(); // Sipariş numarası: Her işlemde benzersiz olmalıdır!! Bu bilgi bildirim sayfanıza yapılacak bildirimde geri gönderilir.
// Sayfada görüntülenecek taksit adedini sınırlamak istiyorsanız uygun şekilde değiştirin.
// Sıfır (0) gönderilmesi durumunda yürürlükteki en fazla izin verilen taksit geçerli olur.
var max_installment = '0';
var no_installment = '0'  // Taksit yapılmasını istemiyorsanız, sadece tek çekim sunacaksanız 1 yapın.
var user_ip = '';
var email = 'XXXXXXXX'; // Müşterinizin sitenizde kayıtlı veya form vasıtasıyla aldığınız eposta adresi.
var payment_amount = 100; // Tahsil edilecek tutar. 9.99 için 9.99 * 100 = 999 gönderilmelidir.
var currency = 'TL';
var test_mode = '0'; // Mağaza canlı modda iken test işlem yapmak için 1 olarak gönderilebilir.
var user_name = ''; // Müşterinizin sitenizde kayıtlı veya form aracılığıyla aldığınız ad ve soyad bilgisi
var user_address = ''; // Müşterinizin sitenizde kayıtlı veya form aracılığıyla aldığınız adres bilgisi
var user_phone = '05555555555'; // Müşterinizin sitenizde kayıtlı veya form aracılığıyla aldığınız telefon bilgisi

// Başarılı ödeme sonrası müşterinizin yönlendirileceği sayfa
// Bu sayfa siparişi onaylayacağınız sayfa değildir! Yalnızca müşterinizi bilgilendireceğiniz sayfadır!
var merchant_ok_url = 'http://www.siteniz.com/odeme_basarili.php';
// Ödeme sürecinde beklenmedik bir hata oluşması durumunda müşterinizin yönlendirileceği sayfa
// Bu sayfa siparişi iptal edeceğiniz sayfa değildir! Yalnızca müşterinizi bilgilendireceğiniz sayfadır!
var merchant_fail_url = 'http://www.siteniz.com/odeme_hata.php';
var timeout_limit = 30; // İşlem zaman aşımı süresi - dakika cinsinden
var debug_on = 1; // Hata mesajlarının ekrana basılması için entegrasyon ve test sürecinde 1 olarak bırakın. Daha sonra 0 yapabilirsiniz.
var lang = 'tr'; // Türkçe için tr veya İngilizce için en gönderilebilir. Boş gönderilirse tr geçerli olur.



app.get("/", function (req, res) {


    var hashSTR = `${merchant_id}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;

    var paytr_token = hashSTR + merchant_salt;

    var token = crypto.createHmac('sha256', merchant_key).update(paytr_token).digest('base64');


    var options = {
        method: 'POST',
        url: 'https://www.paytr.com/odeme/api/get-token',
        headers:
            { 'content-type': 'application/x-www-form-urlencoded' },
        formData: {
            merchant_id: merchant_id,
            merchant_key: merchant_key,
            merchant_salt: merchant_salt,
            email: email,
            payment_amount: payment_amount,
            merchant_oid: merchant_oid,
            user_name: user_name,
            user_address: user_address,
            user_phone: user_phone,
            merchant_ok_url: merchant_ok_url,
            merchant_fail_url: merchant_fail_url,
            user_basket: user_basket,
            user_ip: user_ip,
            timeout_limit: timeout_limit,
            debug_on: debug_on,
            test_mode: test_mode,
            lang: lang,
            no_installment: no_installment,
            max_installment: max_installment,
            currency: currency,
            paytr_token: token,


        }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        var res_data = JSON.parse(body);

        if (res_data.status == 'success') {
            res.render('layout', { iframetoken: res_data.token });
        } else {

            res.end(body);
        }


    });


});


app.post("/callback", function (req, res) {

    // ÖNEMLİ UYARILAR!
    // 1) Bu sayfaya oturum (SESSION) ile veri taşıyamazsınız. Çünkü bu sayfa müşterilerin yönlendirildiği bir sayfa değildir.
    // 2) Entegrasyonun 1. ADIM'ında gönderdiğniz merchant_oid değeri bu sayfaya POST ile gelir. Bu değeri kullanarak
    // veri tabanınızdan ilgili siparişi tespit edip onaylamalı veya iptal etmelisiniz.
    // 3) Aynı sipariş için birden fazla bildirim ulaşabilir (Ağ bağlantı sorunları vb. nedeniyle). Bu nedenle öncelikle
    // siparişin durumunu veri tabanınızdan kontrol edin, eğer onaylandıysa tekrar işlem yapmayın. Örneği aşağıda bulunmaktadır.

    var callback = req.body;

    // POST değerleri ile hash oluştur.
    paytr_token = callback.merchant_oid + merchant_salt + callback.status + callback.total_amount;
    var token = crypto.createHmac('sha256', merchant_key).update(paytr_token).digest('base64');

    // Oluşturulan hash'i, paytr'dan gelen post içindeki hash ile karşılaştır (isteğin paytr'dan geldiğine ve değişmediğine emin olmak için)
    // Bu işlemi yapmazsanız maddi zarara uğramanız olasıdır.

    if (token != callback.hash) {
        throw new Error("PAYTR notification failed: bad hash");
    }

    if (callback.status == 'success') {
        //basarili
    } else {
        //basarisiz
    }

    res.send('OK');

});


var port = 3000;
app.listen(port, function () {
    console.log("Server is running. Port:" + port);
});