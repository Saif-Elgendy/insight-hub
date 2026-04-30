import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
5. ردود قصيرة: 2-5 جمل عادةً.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
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
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
