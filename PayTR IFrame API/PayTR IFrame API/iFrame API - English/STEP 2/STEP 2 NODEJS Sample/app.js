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

// API - Information Integration  - You can get them from the information page after logging into the PayTR Merchant Panel.

var merchant_id = 'XXXXXX';
var merchant_key = 'YYYYYYYYYYYYYY';
var merchant_salt = 'ZZZZZZZZZZZZZZ';
var basket = JSON.stringify([
    ['Sample Product 1', '18.00', 1],
    ['Sample Product 2', '33.25', 2],
    ['Sample Product 3', '45.42', 1]
]);
var user_basket = nodeBase64.encode(basket);
var merchant_oid = "IN" + microtime.now();  // The unique order id you set for the transaction.

// Specifies the maximum number of installments to be displayed
var max_installment = '0';
var no_installment = '0'  // Taksit yapılmasını istemiyorsanız, sadece tek çekim sunacaksanız 1 yapın.
var user_ip = ''; // If you send as 1, the installment options are not displayed (example usage: installment ban for mobile phone sales)
var email = 'XXXXXXXX'; 
var payment_amount = 100; // The total amount of the order. (Multiply the amount by 100)
var currency = 'TL';
var test_mode = '0'; // When the merchant is in live mode, it can be sent as 1 to run a test
var user_name = ''; 
var user_address = ''; 
var user_phone = '05555555555';
var merchant_ok_url = 'http://www.siteniz.com/odeme_basarili.php';
var merchant_fail_url = 'http://www.siteniz.com/odeme_hata.php';
var timeout_limit = 30; 
var debug_on = 1; 
var lang = 'tr';



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

    var callback = req.body;

    paytr_token = callback.merchant_oid + merchant_salt + callback.status + callback.total_amount;
    var token = crypto.createHmac('sha256', merchant_key).update(paytr_token).digest('base64');


    if (token != callback.hash) {
        throw new Error("PAYTR notification failed: bad hash");
    }

    
    if (callback.status == 'success') {
        //success
    } else {
        //fail
    }

    res.send('OK');

});


var port = 3000;
app.listen(port, function () {
    console.log("Server is running. Port:" + port);
});