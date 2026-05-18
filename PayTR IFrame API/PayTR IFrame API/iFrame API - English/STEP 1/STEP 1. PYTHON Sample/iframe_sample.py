# Python 3.6+

import base64
import hmac
import hashlib
import requests
import json


merchant_id = 'XXXXXX'
merchant_key = b'YYYYYYYYYYYYYY'
merchant_salt = b'ZZZZZZZZZZZZZZ'
email = 'XXXXXXXX'
payment_amount = '' 
merchant_oid = ''
user_name = ''
user_address = ''
user_phone = ''
merchant_ok_url = 'http://www.siteniz.com/odeme_basarili.php'
merchant_fail_url = 'http://www.siteniz.com/odeme_hata.php'
user_basket = ''

# EXAMPLE $user_basket creation - You can duplicate arrays per each product
"""
user_basket = base64.b64encode(json.dumps([['Örnek ürün 1', '18.00', 1],
               ['Örnek ürün 2', '33.25', 2],
               ['Örnek ürün 3', '45.42', 1]]).encode())
"""


user_ip = ''
timeout_limit = '30'
debug_on = '1'
test_mode = '1'
no_installment = '0' 
max_installment = '0'
currency = 'TL'


hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket.decode() + no_installment + max_installment + currency + test_mode
paytr_token = base64.b64encode(hmac.new(merchant_key, hash_str.encode() + merchant_salt, hashlib.sha256).digest())

params = {
    'merchant_id': merchant_id,
    'user_ip': user_ip,
    'merchant_oid': merchant_oid,
    'email': email,
    'payment_amount': payment_amount,
    'paytr_token': paytr_token,
    'user_basket': user_basket,
    'debug_on': debug_on,
    'no_installment': no_installment,
    'max_installment': max_installment,
    'user_name': user_name,
    'user_address': user_address,
    'user_phone': user_phone,
    'merchant_ok_url': merchant_ok_url,
    'merchant_fail_url': merchant_fail_url,
    'timeout_limit': timeout_limit,
    'currency': currency,
    'test_mode': test_mode
}

result = requests.post('https://www.paytr.com/odeme/api/get-token', params)
res = json.loads(result.text)

if res['status'] == 'success':
    print(res['token'])

    """
    context = {
        'token': res['token']
    }
    """
else:
    print(result.text)


"""
# HTML Blog for iFrame  #

<script src="https://www.paytr.com/js/iframeResizer.min.js"></script>
<iframe src="https://www.paytr.com/odeme/guvenli/{ token }" id="paytriframe" frameborder="0" scrolling="no" style="width: 100%;"></iframe>
<script>iFrameResize({},'#paytriframe');</script>

# HTML Blog for iFrame #
"""