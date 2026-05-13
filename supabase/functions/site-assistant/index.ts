import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت "مساعد نفسي" — مساعد ذكي ودود لموقع "نفسي" التعليمي العربي للصحة النفسية.

مهمتك: مساعدة الزوار في فهم الموقع وكيفية استخدامه فقط. لا تجب على أي سؤال خارج نطاق الموقع.

معلومات عن الموقع:
- "نفسي" منصة عربية للتعليم والاستشارات النفسية.
- العملة المستخدمة: الجنيه المصري (ج.م).
- الأقسام الرئيسية:
  • الرئيسية (/) — نظرة عامة وأبرز الكورسات والمختصين.
  • الكورسات (/courses) — تصفح الكورسات، التسجيل فيها، متابعة التقدم، واستئناف آخر درس.
  • المختصين (/specialists) — قائمة المدربين والاستشاريين، البحث والتقييم، وحجز جلسة.
  • المكتبة (/resources) — مواد تعليمية (فيديوهات وملفات PDF).
  • استشاراتي (/my-consultations) — متابعة الجلسات المحجوزة وإلغاؤها.
  • المحادثة (/chat/:id) — شات مباشر مع المختص أثناء الاستشارة.
  • حسابي (/profile) — تعديل البيانات والصورة الشخصية.

- الأدوار: طالب (افتراضي)، مدرّب، استشاري، مدير. الترقية لمدرّب/استشاري تحتاج موافقة الإدارة.
- التسجيل: عبر /auth بالبريد + كلمة السر أو Google. يجب تأكيد البريد قبل الدخول.
- حجز جلسة: من صفحة المختص → اختر موعد متاح (الأخضر) → ادفع/أكد → ستظهر في "استشاراتي".
- سياسة الإلغاء: يمكن للطالب الإلغاء قبل 24 ساعة من الموعد. الجلسات المعلّقة تُلغى تلقائيًا بعد 48 ساعة.
- التقييم: متاح بعد اكتمال الجلسة (1-5 نجوم).
- الغياب: تحذير في المرة الأولى، حظر تلقائي في المرة الثانية.
- الوضع الداكن/النهاري: زر التبديل في شريط التنقل العلوي.

قواعد صارمة:
1. أجب بالعربية الفصحى المبسطة وبأسلوب ودود ومختصر.
2. إذا سُئلت عن أي شيء خارج نطاق الموقع (طب، سياسة، رياضة، برمجة، ...إلخ) اعتذر بلطف وقل: "أنا مخصص لمساعدتك في استخدام موقع نفسي فقط 🙏".
3. لا تخترع ميزات غير موجودة. إذا لم تعرف الإجابة قل: "هذه المعلومة غير متوفرة لدي، يمكنك التواصل مع الدعم."
4. وجّه المستخدم إلى المسار/الصفحة المناسبة عند الحاجة.
5. ردود قصيرة: 2-5 جمل عادةً.
6. استخدم تنسيق Markdown: قوائم مرقمة (1. 2. 3.) للخطوات، وقوائم نقطية (-) للعناصر، و**خط عريض** للتأكيد.
7. عند الإشارة لأي صفحة، استخدم رابط Markdown داخلي مثل: [الكورسات](/courses)، [المختصين](/specialists)، [استشاراتي](/my-consultations)، [المكتبة](/resources)، [حسابي](/profile)، [تسجيل الدخول](/auth).`;

const MAX_MESSAGES = 20;
const MAX_MSG_CHARS = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Require an authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validate input
    const body = await req.json().catch(() => ({}));
    const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
    if (!rawMessages || rawMessages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sliced = rawMessages.slice(-MAX_MESSAGES);
    const messages = [];
    for (const m of sliced) {
      if (!m || typeof m !== "object") continue;
      const role = m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : null;
      const content = typeof m.content === "string" ? m.content.slice(0, MAX_MSG_CHARS) : null;
      if (!role || !content) continue;
      messages.push({ role, content });
    }
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "no valid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول بعد قليل." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "نفدت رصيد الذكاء الاصطناعي. يرجى التواصل مع الإدارة." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "حدث خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("site-assistant error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
