# نشر Karas Magdy للعمل من أي موبايل وأي شبكة

هذا الدليل يساعدك على نشر التطبيق على الإنترنت للوصول إليه من أي جهاز أو شبكة.

---

## الطريقة الأولى: Render.com (مجاناً)

### 1. MongoDB Atlas (قاعدة البيانات السحابية)

1. أنشئ حساباً مجانياً على [MongoDB Atlas](https://cloud.mongodb.com)
2. أنشئ كلستر (Cluster) جديد
3. من **Database Access** → أضف مستخدماً جديداً واحفظ اسم المستخدم وكلمة المرور
4. من **Network Access** → أضف `0.0.0.0/0` للسماح بالاتصال من أي مكان
5. من **Database** → **Connect** → **Connect your application** → انسخ رابط الاتصال (`mongodb+srv://...`)

### 2. رفع المشروع إلى GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-clone.git
git push -u origin main
```

### 3. النشر على Render

1. ادخل إلى [Render.com](https://render.com) وأنشئ حساباً
2. **New** → **Web Service**
3. اربط مخزن GitHub الخاص بالمشروع
4. Render سيكتشف `render.yaml` تلقائياً
5. في **Environment** أضف المتغيرات:
   - `MONGO_URI`: رابط MongoDB Atlas الذي نسخته
   - `JWT_SECRET`: كلمة سر عشوائية طويلة
   - `BASE_URL`: سيُملأ بعد النشر (مثال: `https://karas-magdy-xxxx.onrender.com`)
   - `ADMIN_PHONES`: أرقام الأدمن مفصولة بفاصلة (اختياري)

6. اضغط **Create Web Service**
7. بعد انتهاء النشر، انسخ رابط التطبيق وضعه في `BASE_URL` في Environment، ثم أعد تشغيل الخدمة

### ملاحظات Render

- **الخطة المجانية**: الخدمة تتوقف بعد 15 دقيقة بدون استخدام. الطلب الأول قد يستغرق ~30 ثانية للاستيقاظ.
- **المرفقات**: المجلد `uploads` مؤقت؛ الملفات تُفقد عند إعادة التشغيل. للاحتفاظ بها، يمكن لاحقاً ربط تخزين سحابي (S3).

---

## الطريقة الثانية: تشغيل محلي مع ngrok

للاختبار السريع دون نشر سحابي:

1. ثبّت [ngrok](https://ngrok.com)
2. شغّل السيرفر: `npm start`
3. في نافذة أخرى: `ngrok http 5000`
4. انسخ رابط HTTPS من ngrok وشاركه للموبايل
5. ضع `BASE_URL` في `.env` بنفس رابط ngrok

---

## متطلبات التشغيل

- Node.js 18+
- MongoDB (محلي أو Atlas)
- المتغيرات في `.env` (راجع `.env.example`)

---

## الحفاظ على الميزات

جميع الميزات تعمل بعد النشر دون تعديل:
- مؤشر الكتابة، حالة الاتصال، علامات القراءة
- حذف وتثبيت وأرشفة وكتم المحادثات
- إعادة التوجيه، الرسائل المفضلة، البحث
- نظام الدعوة، PWA، المكالمات، وغيرها
