# تشغيل تطبيق التنبيهات بدون Replit — استخدام ngrok

Replit فيه مشاكل. الحل ده يعمل **مباشرة** من جهازك بدون منصات نشر، ومجاني بالكامل.

---

## الفكرة

- تشغّل الـ Backend على جهازك
- **ngrok** يعطيك رابط عام (مثلاً `https://xxxx.ngrok-free.app`)
- تطبيق الموبايل يتصل بهذا الرابط

**ملاحظة:** جهازك لازم يكون شغّال ومتصل بالنت لما تحب تستخدم التطبيق من الموبايل.

---

## الخطوة 1: تثبيت ngrok

1. ادخل: **https://ngrok.com**
2. **Sign up** (مجاني)
3. بعد تسجيل الدخول: **Download** → اختر **Windows**
4. فك الضغط عن الملف (Zip) وضعه في مجلد، مثلاً: `C:\ngrok`
5. احفظ **authtoken** من الموقع (هيظهرلك بعد التسجيل)

---

## الخطوة 2: تفعيل ngrok

1. افتح **Command Prompt** أو **PowerShell**
2. اكتب:
   ```
   cd C:\ngrok
   ngrok config add-authtoken YOUR_TOKEN
   ```
   (استبدل YOUR_TOKEN بالـ token من الموقع)

---

## الخطوة 3: تشغيل الـ Backend

1. افتح **PowerShell** أو **Command Prompt**
2. اكتب:
   ```
   cd D:\programs\reminders-backend
   npm start
   ```
3. انتظر رسالة: **سيرفر التنبيهات يعمل على المنفذ 4000**
4. **اترك هذه النافذة مفتوحة**

---

## الخطوة 4: تشغيل ngrok

1. افتح **نافذة جديدة** من PowerShell أو Command Prompt
2. اكتب:
   ```
   cd C:\ngrok
   ngrok http 4000
   ```
3. هيظهر لك رابط مثل: `https://a1b2c3d4.ngrok-free.app`
4. **انسخ هذا الرابط كاملاً**

---

## الخطوة 5: ضبط Vercel

1. ادخل **vercel.com** → reminders-frontend
2. **Settings** → **Environment Variables**
3. عدّل `VITE_API_URL` = الرابط من ngrok
   مثال: `https://a1b2c3d4.ngrok-free.app`
4. **Redeploy** للمشروع

---

## الخطوة 6: التجربة من الموبايل

1. افتح التطبيق من الموبايل
2. سجّل الدخول
3. المفروض يعمل بدون "Failed to fetch"

---

## ملاحظات

- **كل مرة** تحب تستخدم التطبيق: شغّل **npm start** ثم **ngrok http 4000**
- الرابط من ngrok بيتغير في الخطة المجانية لو أعدت تشغيل ngrok — وقتها حدّث `VITE_API_URL` على Vercel واعمل Redeploy
- لو حابب رابط ثابت: ngrok فيه خطة مجانية بـ رابط ثابت (تأكد من الموقع)

---

## ملخص الأوامر (للنسخ)

**نافذة 1 — Backend:**
```
cd D:\programs\reminders-backend
npm start
```

**نافذة 2 — ngrok:**
```
cd C:\ngrok
ngrok http 4000
```

بعدها انسخ الرابط من ngrok وضعه في VITE_API_URL على Vercel.
