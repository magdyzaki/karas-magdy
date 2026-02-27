/**
 * سكريبت اختبار لميزتي المحادثات والرسائل
 * تشغيل السيرفر أولاً: npm run dev
 * ثم: node test-api.js
 */

const BASE = "http://localhost:5000";

async function request(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function test() {
  console.log("🧪 بداية اختبار API...\n");

  // 1. تسجيل دخول مستخدمين (ينشئهم إذا لم يكونوا موجودين)
  console.log("1️⃣ تسجيل دخول المستخدم 1 (رقم 1111111111)...");
  const { data: login1 } = await request("POST", "/api/auth/login", {
    phone: "1111111111",
  });
  if (!login1.success) {
    console.error("❌ فشل تسجيل الدخول:", login1.message);
    return;
  }
  const token1 = login1.data.token;
  const user1Id = login1.data.user._id;
  console.log("   ✅ المستخدم 1:", login1.data.user.name, "- id:", user1Id);

  console.log("\n2️⃣ تسجيل دخول المستخدم 2 (رقم 2222222222)...");
  const { data: login2 } = await request("POST", "/api/auth/login", {
    phone: "2222222222",
  });
  if (!login2.success) {
    console.error("❌ فشل تسجيل الدخول:", login2.message);
    return;
  }
  const token2 = login2.data.token;
  const user2Id = login2.data.user._id;
  console.log("   ✅ المستخدم 2:", login2.data.user.name, "- id:", user2Id);

  // 2. جلب محادثات المستخدم 1 (فارغة في البداية)
  console.log("\n3️⃣ جلب محادثات المستخدم 1...");
  const { data: convList1 } = await request("GET", "/api/conversations", null, token1);
  if (!convList1.success) {
    console.error("   ❌ فشل:", convList1.message);
    return;
  }
  console.log("   ✅ عدد المحادثات:", convList1.conversations?.length || 0);

  // 3. إنشاء محادثة بين المستخدم 1 والمستخدم 2
  console.log("\n4️⃣ إنشاء محادثة بين المستخدم 1 والمستخدم 2...");
  const { data: convCreate } = await request(
    "POST",
    "/api/conversations",
    { userId: user2Id },
    token1
  );
  if (!convCreate.success) {
    console.error("   ❌ فشل:", convCreate.message);
    return;
  }
  const conversationId = convCreate.conversation._id;
  console.log("   ✅ تم إنشاء المحادثة، id:", conversationId);

  // 4. إرسال رسالة من المستخدم 1
  console.log("\n5️⃣ إرسال رسالة من المستخدم 1...");
  const { data: sendMsg } = await request(
    "POST",
    "/api/messages",
    {
      conversationId,
      content: "مرحبا! هذه رسالة اختبار من المستخدم 1 🎉",
    },
    token1
  );
  if (!sendMsg.success) {
    console.error("   ❌ فشل إرسال الرسالة:", sendMsg.message);
    return;
  }
  const msgId = sendMsg.message?._id;
  console.log("   ✅ تم إرسال الرسالة، id:", msgId);

  // 5. إرسال رد من المستخدم 2
  console.log("\n6️⃣ إرسال رد من المستخدم 2...");
  const { data: replyMsg } = await request(
    "POST",
    "/api/messages",
    {
      conversationId,
      content: "أهلاً! الرسالة وصلت بنجاح 👍",
      replyTo: msgId,
    },
    token2
  );
  if (!replyMsg.success) {
    console.error("   ❌ فشل الرد:", replyMsg.message);
    return;
  }
  console.log("   ✅ تم إرسال الرد");

  // 6. جلب رسائل المحادثة
  console.log("\n7️⃣ جلب رسائل المحادثة...");
  const { data: getMsgs } = await request(
    "GET",
    `/api/messages/${conversationId}`,
    null,
    token1
  );
  if (!getMsgs.success) {
    console.error("   ❌ فشل جلب الرسائل:", getMsgs.message);
    return;
  }
  console.log("   ✅ عدد الرسائل:", getMsgs.messages?.length || 0);
  getMsgs.messages?.forEach((m, i) => {
    console.log(`      ${i + 1}. [${m.sender?.name}]: ${m.content}`);
  });

  // 7. تحديد كمقروءة من المستخدم 1
  console.log("\n8️⃣ تحديد الرسائل كمقروءة (من المستخدم 1)...");
  const { data: readResp } = await request(
    "POST",
    `/api/messages/${conversationId}/read`,
    {},
    token1
  );
  if (!readResp.success) {
    console.error("   ❌ فشل:", readResp.message);
  } else {
    console.log("   ✅ تم");
  }

  // 8. جلب محادثات المستخدم 1 مرة أخرى (يجب أن تظهر المحادثة مع lastMessage)
  console.log("\n9️⃣ جلب محادثات المستخدم 1 بعد الإرسال...");
  const { data: convList2 } = await request("GET", "/api/conversations", null, token1);
  if (convList2.success && convList2.conversations?.[0]) {
    console.log("   ✅ آخر رسالة في القائمة:", convList2.conversations[0].lastMessage);
  }

  console.log("\n✅ انتهى الاختبار بنجاح!");
}

test().catch((err) => {
  console.error("\n❌ خطأ:", err.message);
  if (err.cause?.code === "ECONNREFUSED") {
    console.log("\n💡 تأكد من تشغيل السيرفر أولاً: npm run dev");
  }
  process.exit(1);
});
