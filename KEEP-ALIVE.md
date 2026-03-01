# إبقاء السيرفر مستيقظاً (Keep-Alive)

على الخطط المجانية (مثل Render) ينام السيرفر بعد ~15 دقيقة بدون طلبات. أول طلب بعد الاستيقاظ قد يستغرق 30-60 ثانية.

## الحل: خدمات Keep-Alive

### UptimeRobot (مجاني)

1. ادخل [uptimerobot.com](https://uptimerobot.com)
2. إنشاء حساب مجاني
3. **Add New Monitor**
4. اختر **HTTP(s)**
5. **Friendly Name:** Karas Chat API
6. **URL:** `https://karas-magdy.onrender.com` (أو رابط السيرفر الخاص بك)
7. **Monitoring Interval:** 5 دقائق
8. احفظ

### cron-job.org (مجاني)

1. ادخل [cron-job.org](https://cron-job.org)
2. إنشاء حساب
3. **Create Cronjob**
4. **URL:** رابط السيرفر (مثلاً `https://karas-magdy.onrender.com`)
5. **Interval:** كل 5 دقائق
6. احفظ

---

## ملاحظة

- استبدل `karas-magdy.onrender.com` برابط السيرفر الفعلي إذا كان مختلفاً
- الهدف هو إرسال طلب HTTP كل بضع دقائق ليبقى السيرفر مستيقظاً
