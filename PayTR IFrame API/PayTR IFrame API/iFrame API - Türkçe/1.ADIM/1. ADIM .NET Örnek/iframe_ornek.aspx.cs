// 1. ADIM için örnek kodlar

using Newtonsoft.Json.Linq; // Bu satırda hata alırsanız, site dosyalarınızın olduğu bölümde bin isimli bir klasör oluşturup içerisine Newtonsoft.Json.dll adlı DLL dosyasını kopyalayın.
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.Script.Serialization;
using System.Web.UI;
using System.Web.UI.WebControls;


namespace WebApplication3
{
    public partial class _Default : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

        // ####################### DÜZENLEMESİ ZORUNLU ALANLAR #######################
        //
        // API Entegrasyon Bilgileri - Mağaza paneline giriş yaparak BİLGİ sayfasından alabilirsiniz.
        string merchant_id = "XXXXXX";
        string merchant_key = "YYYYYYYYYYYYYY";
        string merchant_salt = "ZZZZZZZZZZZZZZ";
        //
        // Müşterinizin sitenizde kayıtlı veya form vasıtasıyla aldığınız eposta adresi
        string emailstr = "ZZZZZZZZZZZZZZ";
        //
        // Tahsil edilecek tutar. 9.99 için 9.99 * 100 = 999 gönderilmelidir.
        int payment_amountstr = ;
        //
        // Sipariş numarası: Her işlemde benzersiz olmalıdır!! Bu bilgi bildirim sayfanıza yapılacak bildirimde geri gönderilir.
        string merchant_oid = "";
        //
        // Müşterinizin sitenizde kayıtlı veya form aracılığıyla aldığınız ad ve soyad bilgisi
        string user_namestr = "";
        //
        // Müşterinizin sitenizde kayıtlı veya form aracılığıyla aldığınız adres bilgisi
        string user_addressstr = "";
        //
        // Müşterinizin sitenizde kayıtlı veya form aracılığıyla aldığınız telefon bilgisi
        string user_phonestr = "";
        //
        // Başarılı ödeme sonrası müşterinizin yönlendirileceği sayfa
        // !!! Bu sayfa siparişi onaylayacağınız sayfa değildir! Yalnızca müşterinizi bilgilendireceğiniz sayfadır!
        // !!! Siparişi onaylayacağız sayfa "Bildirim URL" sayfasıdır (Bakınız: 2.ADIM Klasörü).
        string merchant_ok_url = "http://www.siteniz.com/basarili";
        //
        // Ödeme sürecinde beklenmedik bir hata oluşması durumunda müşterinizin yönlendirileceği sayfa
        // !!! Bu sayfa siparişi iptal edeceğiniz sayfa değildir! Yalnızca müşterinizi bilgilendireceğiniz sayfadır!
        // !!! Siparişi iptal edeceğiniz sayfa "Bildirim URL" sayfasıdır (Bakınız: 2.ADIM Klasörü).
        string merchant_fail_url = "http://www.siteniz.com/basarisiz";
        //        
        // !!! Eğer bu örnek kodu sunucuda değil local makinanızda çalıştırıyorsanız
        // buraya dış ip adresinizi (https://www.whatismyip.com/) yazmalısınız. Aksi halde geçersiz paytr_token hatası alırsınız.
        string user_ip = Request.ServerVariables["HTTP_X_FORWARDED_FOR"];
        if (user_ip == "" || user_ip == null)
        {
            user_ip = Request.ServerVariables["REMOTE_ADDR"];
        }
        //
        // ÖRNEK user_basket oluşturma - Ürün adedine göre object'leri çoğaltabilirsiniz
        object[][] user_basket = {
            new object[] {"Örnek ürün 1", "18.00", 1}, // 1. ürün (Ürün Ad - Birim Fiyat - Adet)
            new object[] {"Örnek ürün 2", "33.25", 2}, // 2. ürün (Ürün Ad - Birim Fiyat - Adet)
            new object[] {"Örnek ürün 3", "45.42", 1}, // 3. ürün (Ürün Ad - Birim Fiyat - Adet)
            };
        /* ############################################################################################ */


        // İşlem zaman aşımı süresi - dakika cinsinden
        string timeout_limit = "30";
        //
        // Hata mesajlarının ekrana basılması için entegrasyon ve test sürecinde 1 olarak bırakın. Daha sonra 0 yapabilirsiniz.
        string debug_on = "1";
        //
        // Mağaza canlı modda iken test işlem yapmak için 1 olarak gönderilebilir.
        string test_mode = "1";
        //
        // Taksit yapılmasını istemiyorsanız, sadece tek çekim sunacaksanız 1 yapın
        string no_installment = "0";
        //
        // Sayfada görüntülenecek taksit adedini sınırlamak istiyorsanız uygun şekilde değiştirin.
        // Sıfır (0) gönderilmesi durumunda yürürlükteki en fazla izin verilen taksit geçerli olur.
        string max_installment = "0";
        //
        // Para birimi olarak TL, EUR, USD gönderilebilir. USD ve EUR kullanmak için kurumsal@paytr.com 
        // üzerinden bilgi almanız gerekmektedir. Boş gönderilirse TL geçerli olur.
        string currency = "TL";
        //
        // Türkçe için tr veya İngilizce için en gönderilebilir. Boş gönderilirse tr geçerli olur.
        string lang = "";


        // Gönderilecek veriler oluşturuluyor
        NameValueCollection data = new NameValueCollection();
        data["merchant_id"] = merchant_id;
        data["user_ip"] = user_ip;
        data["merchant_oid"] = merchant_oid;
        data["email"] = emailstr;
        data["payment_amount"] = payment_amountstr.ToString();
        //
        // Sepet içerği oluşturma fonksiyonu, değiştirilmeden kullanılabilir.
        JavaScriptSerializer ser = new JavaScriptSerializer();
        string user_basket_json = ser.Serialize(user_basket);
        string user_basketstr = Convert.ToBase64String(Encoding.UTF8.GetBytes(user_basket_json));
        data["user_basket"] = user_basketstr;
        //
        // Token oluşturma fonksiyonu, değiştirilmeden kullanılmalıdır.
        string Birlestir = string.Concat(merchant_id, user_ip, merchant_oid, emailstr, payment_amountstr.ToString(), user_basketstr, no_installment, max_installment, currency, test_mode, merchant_salt);
        HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(merchant_key));
        byte[] b = hmac.ComputeHash(Encoding.UTF8.GetBytes(Birlestir));
        data["paytr_token"] = Convert.ToBase64String(b);
        //
        data["debug_on"] = debug_on;
        data["test_mode"] = test_mode;
        data["no_installment"] = no_installment;
        data["max_installment"] = max_installment;
        data["user_name"] = user_namestr;
        data["user_address"] = user_addressstr;
        data["user_phone"] = user_phonestr;
        data["merchant_ok_url"] = merchant_ok_url;
        data["merchant_fail_url"] = merchant_fail_url;
        data["timeout_limit"] = timeout_limit;
        data["currency"] = currency;
        data["lang"] = lang;

        using (WebClient client = new WebClient())
        {
            client.Headers.Add("Content-Type", "application/x-www-form-urlencoded");
            byte[] result = client.UploadValues("https://www.paytr.com/odeme/api/get-token", "POST", data);
            string ResultAuthTicket = Encoding.UTF8.GetString(result);
            dynamic json = JValue.Parse(ResultAuthTicket);

            if (json.status == "success")
            { 
                paytriframe.Attributes["src"] = "https://www.paytr.com/odeme/guvenli/" + json.token;
                paytriframe.Visible = true;
            }
            else
            {
                Response.Write("PAYTR IFRAME failed. reason:" + json.reason + "");
            }
        }
    }
}

}


