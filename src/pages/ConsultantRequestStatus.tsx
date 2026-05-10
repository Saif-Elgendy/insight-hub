import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock3, CheckCircle2, XCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

interface ConsultantRequest {
  id: string;
  status: string;
  specialty: string;
  rejection_reason: string | null;
  admin_review_notes: string | null;
  reviewed_at: string | null;
  admin_reviewed_at: string | null;
  super_admin_approved_at: string | null;
  created_at: string;
  updated_at: string;
  last_save_error: string | null;
  last_save_error_at: string | null;
  photo_url: string | null;
  id_card_url: string | null;
  license_url: string | null;
  certificates_urls: string[] | null;
  video_url: string | null;
}

const ConsultantRequestStatus = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ConsultantRequest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) fetchRequest();
  }, [user, authLoading]);

  const fetchRequest = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("consultant_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .maybeSingle();
    setRequest(data as any);
    setLoading(false);
  };

  const renderStatus = () => {
    if (!request) return null;
    switch (request.status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-base px-4 py-2">
            <Clock3 className="w-4 h-4 ml-2" />
            معلق - قيد المراجعة
          </Badge>
        );
      case "admin_reviewed":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-base px-4 py-2">
            <CheckCircle2 className="w-4 h-4 ml-2" />
            تمت مراجعة الآدمن - بانتظار التأكيد النهائي
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-base px-4 py-2">
            <CheckCircle2 className="w-4 h-4 ml-2" />
            مقبول
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-base px-4 py-2">
            <XCircle className="w-4 h-4 ml-2" />
            مرفوض
          </Badge>
        );
      default:
        return <Badge variant="outline">{request.status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="mb-4">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للملف الشخصي
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>حالة طلب الاستشاري</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="text-muted-foreground">جاري التحميل...</p>
            ) : !request ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">لا يوجد طلب استشاري حالياً</p>
                <Button onClick={() => navigate("/profile")}>الذهاب للملف الشخصي</Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">الحالة الحالية</p>
                  {renderStatus()}
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">التخصص</span>
                    <span className="font-medium">{request.specialty || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">تاريخ الإرسال</span>
                    <span className="font-medium">{new Date(request.created_at).toLocaleString("ar-EG")}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">آخر تحديث</span>
                    <span className="font-medium">{new Date(request.updated_at).toLocaleString("ar-EG")}</span>
                  </div>
                  {request.reviewed_at && (
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">تاريخ المراجعة</span>
                      <span className="font-medium">{new Date(request.reviewed_at).toLocaleString("ar-EG")}</span>
                    </div>
                  )}
                </div>

                {request.status === "rejected" && (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertTitle>سبب الرفض</AlertTitle>
                    <AlertDescription>
                      {request.rejection_reason || "لم يتم تحديد سبب من قبل الإدارة"}
                    </AlertDescription>
                  </Alert>
                )}

                {request.admin_review_notes && (
                  <Alert>
                    <AlertTitle>ملاحظات الإدارة</AlertTitle>
                    <AlertDescription>{request.admin_review_notes}</AlertDescription>
                  </Alert>
                )}

                {request.last_save_error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>آخر خطأ في الحفظ</AlertTitle>
                    <AlertDescription>
                      <p>{request.last_save_error}</p>
                      {request.last_save_error_at && (
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(request.last_save_error_at).toLocaleString("ar-EG")}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Documents status section */}
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">حالة المستندات</h3>
                  {(() => {
                    const isRejected = request.status === "rejected";
                    const certs = request.certificates_urls || [];
                    const fullReason = request.rejection_reason || "";

                    // Keyword sets used for issue-type classification
                    const MISSING_KEYWORDS = [
                      "ناقص", "ناقصة", "مفقود", "مفقودة", "غير مرفوع", "غير مرفوعة",
                      "لم يتم رفع", "لم ترفع", "لم يُرفع", "بدون", "missing", "not uploaded", "absent",
                    ];
                    const MISMATCH_KEYWORDS = [
                      "غير مطابق", "غير مطابقة", "غير واضح", "غير واضحة", "غير صالح", "غير صالحة",
                      "غير مقروء", "غير مقروءة", "منتهي", "منتهية", "مزور", "مزورة", "خاطئ", "خاطئة",
                      "لا يطابق", "لا تطابق", "رديء", "رديئة", "ضبابي", "ضبابية",
                      "mismatch", "invalid", "expired", "unclear", "blurry", "wrong",
                    ];

                    // Pre-split the rejection text once into clean sentences with a normalized form
                    const sentences = fullReason
                      .split(/[\n\.،,;:]+/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((s) => ({
                        raw: s,
                        norm: s
                          .toLowerCase()
                          // remove Arabic diacritics for more robust matching
                          .replace(/[\u064B-\u0652\u0670]/g, "")
                          // normalize alef variants
                          .replace(/[إأآا]/g, "ا")
                          .replace(/ى/g, "ي")
                          .replace(/ة/g, "ه"),
                      }));

                    const normalize = (s: string) =>
                      s
                        .toLowerCase()
                        .replace(/[\u064B-\u0652\u0670]/g, "")
                        .replace(/[إأآا]/g, "ا")
                        .replace(/ى/g, "ي")
                        .replace(/ة/g, "ه");

                    // Score each sentence against keywords (more matches = higher score)
                    const matchSentence = (
                      keywords: string[]
                    ): { raw: string; norm: string; score: number } | null => {
                      if (!isRejected || sentences.length === 0) return null;
                      const normKeys = keywords.map(normalize);
                      let best: { raw: string; norm: string; score: number } | null = null;
                      for (const s of sentences) {
                        const score = normKeys.reduce(
                          (acc, k) => acc + (k && s.norm.includes(k) ? 1 : 0),
                          0
                        );
                        if (score > 0 && (!best || score > best.score)) {
                          best = { ...s, score };
                        }
                      }
                      return best;
                    };

                    // Detect explicit "label: reason" prefixed lines, which are highest priority
                    const prefixedReason = (keywords: string[]): string | null => {
                      const normKeys = keywords.map(normalize);
                      for (const s of sentences) {
                        // match patterns like "<label> - <reason>" or "<label> => <reason>"
                        const m = s.raw.match(/^(.+?)\s*(?:[-—–]|=>|:)\s*(.+)$/);
                        if (!m) continue;
                        const head = normalize(m[1]);
                        if (normKeys.some((k) => k && head.includes(k))) {
                          return m[2].trim();
                        }
                      }
                      return null;
                    };

                    const classifyIssue = (
                      text: string
                    ): "missing" | "mismatch" => {
                      const n = normalize(text);
                      const missingHit = MISSING_KEYWORDS.some((k) => n.includes(normalize(k)));
                      const mismatchHit = MISMATCH_KEYWORDS.some((k) => n.includes(normalize(k)));
                      // Mismatch wins over missing if both appear (more specific)
                      if (mismatchHit) return "mismatch";
                      if (missingHit) return "missing";
                      return "mismatch";
                    };

                    const docs: {
                      label: string;
                      url: string | null;
                      required: boolean;
                      count?: number;
                      keywords: string[];
                    }[] = [
                      { label: "الصورة الشخصية", url: request.photo_url, required: true, keywords: ["صورة", "الشخصية", "photo"] },
                      { label: "بطاقة الهوية", url: request.id_card_url, required: true, keywords: ["هوية", "بطاقة", "id"] },
                      { label: "ترخيص مزاولة المهنة", url: request.license_url, required: true, keywords: ["ترخيص", "مزاولة", "license"] },
                      { label: "الشهادات العلمية", url: certs.length > 0 ? "ok" : null, required: true, count: certs.length, keywords: ["شهادة", "شهادات", "certificate"] },
                      { label: "فيديو تعريفي", url: request.video_url, required: false, keywords: ["فيديو", "video"] },
                    ];
                    return (
                      <ul className="divide-y divide-border">
                        {docs.map((d) => {
                          // Resolution priority:
                          // 1. If file is missing AND required -> "missing" (URL truth wins)
                          // 2. Explicit "label: reason" line in rejection text
                          // 3. Best-scoring sentence containing the doc keywords
                          // 4. Issue type derived from keyword classification of that text
                          let issueType: "missing" | "mismatch" | null = null;
                          let reason: string | null = null;

                          if (isRejected) {
                            if (!d.url && d.required) {
                              issueType = "missing";
                              const prefixed = prefixedReason(d.keywords);
                              const sentence = matchSentence(d.keywords);
                              reason = prefixed || sentence?.raw || null;
                            } else {
                              const prefixed = prefixedReason(d.keywords);
                              if (prefixed) {
                                reason = prefixed;
                                issueType = classifyIssue(prefixed);
                              } else {
                                const sentence = matchSentence(d.keywords);
                                if (sentence) {
                                  reason = sentence.raw;
                                  issueType = classifyIssue(sentence.raw);
                                }
                              }
                            }
                          }

                          let statusBadge;
                          if (issueType === "missing") {
                            statusBadge = (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                                <AlertTriangle className="w-3 h-3 ml-1" /> ناقص
                              </Badge>
                            );
                          } else if (issueType === "mismatch") {
                            statusBadge = (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                                <XCircle className="w-3 h-3 ml-1" /> غير مطابق
                              </Badge>
                            );
                          } else if (d.url) {
                            statusBadge = (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 ml-1" /> مستلم
                              </Badge>
                            );
                          } else if (d.required) {
                            statusBadge = (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                                <AlertTriangle className="w-3 h-3 ml-1" /> ناقص
                              </Badge>
                            );
                          } else {
                            statusBadge = (
                              <Badge variant="outline" className="text-muted-foreground">اختياري</Badge>
                            );
                          }

                          return (
                            <li key={d.label} className="py-2 gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                  <span>{d.label}</span>
                                  {d.count !== undefined && d.count > 0 && (
                                    <span className="text-xs text-muted-foreground">({d.count})</span>
                                  )}
                                </div>
                                {statusBadge}
                              </div>
                              {issueType && (
                                <p className="text-xs text-destructive mt-1 pr-1">
                                  {issueType === "missing"
                                    ? "السبب: المستند مفقود ولم يتم رفعه."
                                    : `السبب: ${reason}`}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                  {request.status === "rejected" && (
                    <>
                      {request.rejection_reason && (
                        <div className="text-xs bg-destructive/5 border border-destructive/20 rounded p-2">
                          <span className="font-medium text-destructive">سبب الرفض الكامل: </span>
                          <span className="text-foreground/80">{request.rejection_reason}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        تم رفض الطلب — قد تحتاج إلى استبدال أو تحديث المستندات أعلاه ثم إعادة الإرسال.
                      </p>
                    </>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={fetchRequest} variant="outline">تحديث</Button>
                  <Button onClick={() => navigate("/profile")} variant="ghost">تعديل البيانات</Button>
                  {request.status === "rejected" && (
                    <Button
                      onClick={async () => {
                        const { toast } = await import("sonner");
                        const { error } = await supabase.rpc("resubmit_consultant_request" as any);
                        if (error) {
                          toast.error(error.message || "تعذر إعادة الإرسال");
                          return;
                        }
                        toast.success("تم إعادة إرسال الطلب. عدّل بياناتك ثم احفظ.");
                        await fetchRequest();
                        navigate("/profile");
                      }}
                    >
                      تحديث البيانات وإعادة الإرسال
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultantRequestStatus;
