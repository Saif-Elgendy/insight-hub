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
                    // Snapshot the URLs the admin saw at rejection time, so we can detect
                    // which specific documents the user has replaced before re-submitting.
                    const snapshotKey = `consultant_req_snapshot_${request.id}`;
                    let snapshot: Record<string, string | number | null> | null = null;
                    if (isRejected && typeof window !== "undefined") {
                      const raw = sessionStorage.getItem(snapshotKey);
                      if (raw) {
                        try { snapshot = JSON.parse(raw); } catch { snapshot = null; }
                      }
                      if (!snapshot) {
                        snapshot = {
                          photo_url: request.photo_url,
                          id_card_url: request.id_card_url,
                          license_url: request.license_url,
                          certificates_count: certs.length,
                          video_url: request.video_url,
                        };
                        sessionStorage.setItem(snapshotKey, JSON.stringify(snapshot));
                      }
                    }

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

                    type DocItem = {
                      key: string;
                      label: string;
                      url: string | null;
                      required: boolean;
                      count?: number;
                      keywords: string[];
                      snapshotValue: string | number | null;
                      currentValue: string | number | null;
                    };
                    const docs: DocItem[] = [
                      {
                        key: "photo_url",
                        label: "الصورة الشخصية",
                        url: request.photo_url,
                        required: true,
                        keywords: [
                          "الصورة الشخصية", "صوره شخصيه", "صورة شخصية", "الصوره الشخصيه",
                          "صورة", "صوره", "الصورة", "الصوره",
                          "بروفايل", "البروفايل", "الافاتار", "افاتار",
                          "photo", "picture", "profile picture", "profile photo", "headshot", "selfie", "avatar", "portrait",
                        ],
                        snapshotValue: snapshot?.photo_url ?? null,
                        currentValue: request.photo_url,
                      },
                      {
                        key: "id_card_url",
                        label: "بطاقة الهوية",
                        url: request.id_card_url,
                        required: true,
                        keywords: [
                          "بطاقة الهوية", "بطاقه الهويه", "البطاقة الشخصية", "البطاقه الشخصيه",
                          "بطاقة شخصية", "بطاقه شخصيه", "صورة البطاقة", "صوره البطاقه",
                          "الرقم القومي", "الرقم القومى", "الرقم الوطني", "الرقم الوطنى",
                          "هوية", "هويه", "الهوية", "الهويه", "بطاقة", "بطاقه",
                          "جواز", "جواز السفر", "باسبور", "الباسبور",
                          "id", "id card", "identity", "identity card", "national id", "nid", "passport",
                        ],
                        snapshotValue: snapshot?.id_card_url ?? null,
                        currentValue: request.id_card_url,
                      },
                      {
                        key: "license_url",
                        label: "ترخيص مزاولة المهنة",
                        url: request.license_url,
                        required: true,
                        keywords: [
                          "ترخيص مزاولة المهنة", "ترخيص مزاوله المهنه", "تصريح مزاولة المهنة",
                          "رخصة المهنة", "رخصه المهنه", "رخصة مزاولة", "رخصه مزاوله",
                          "كرنيه النقابة", "كارنيه النقابه", "كارنيه نقابة", "كرنيه نقابة",
                          "النقابة", "النقابه", "نقابة", "نقابه",
                          "ترخيص", "تصريح", "رخصة", "رخصه", "مزاولة", "مزاوله",
                          "license", "permit", "practice license", "professional license", "syndicate", "syndicate card",
                        ],
                        snapshotValue: snapshot?.license_url ?? null,
                        currentValue: request.license_url,
                      },
                      {
                        key: "certificates",
                        label: "الشهادات العلمية",
                        url: certs.length > 0 ? "ok" : null,
                        required: true,
                        count: certs.length,
                        keywords: [
                          "الشهادات العلمية", "الشهادات العلميه", "شهادات علمية", "شهادات علميه",
                          "المؤهل العلمي", "المؤهل العلمى", "المؤهلات العلمية", "المؤهلات العلميه",
                          "شهادة التخرج", "شهاده التخرج", "شهادة البكالوريوس", "شهاده البكالوريوس",
                          "شهادة الماجستير", "شهادة الدكتوراه", "شهادة الدبلوم",
                          "شهادة", "شهاده", "الشهادة", "الشهاده", "شهادات", "الشهادات",
                          "مؤهل", "المؤهل", "مؤهلات", "المؤهلات", "تخرج", "التخرج",
                          "certificate", "certificates", "certification", "diploma", "degree", "qualification", "credential", "transcript",
                        ],
                        snapshotValue: snapshot?.certificates_count ?? 0,
                        currentValue: certs.length,
                      },
                      {
                        key: "video_url",
                        label: "فيديو تعريفي",
                        url: request.video_url,
                        required: false,
                        keywords: [
                          "فيديو تعريفي", "الفيديو التعريفي", "فيديو التعريف", "فيديو تقديمي",
                          "فيديو", "الفيديو", "مقطع فيديو", "تسجيل مرئي", "مقطع مرئي",
                          "video", "intro video", "introduction video", "introductory video", "presentation video", "clip",
                        ],
                        snapshotValue: snapshot?.video_url ?? null,
                        currentValue: request.video_url,
                      },
                    ];

                    // Build per-doc analysis: issue + replacement status
                    const analyzed = docs.map((d) => {
                      let issueType: "missing" | "mismatch" | null = null;
                      let reason: string | null = null;
                      if (isRejected) {
                        if (!d.url && d.required) {
                          issueType = "missing";
                          reason = prefixedReason(d.keywords) || matchSentence(d.keywords)?.raw || null;
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
                      // Replacement detection (only meaningful if flagged)
                      let replaced = false;
                      if (issueType === "missing") {
                        // Needs to now have a value
                        replaced = d.key === "certificates"
                          ? (d.currentValue as number) > (Number(d.snapshotValue) || 0)
                          : !!d.currentValue;
                      } else if (issueType === "mismatch") {
                        // Needs to differ from snapshot
                        replaced = d.key === "certificates"
                          ? (d.currentValue as number) !== (Number(d.snapshotValue) || 0)
                          : !!d.currentValue && d.currentValue !== d.snapshotValue;
                      }
                      const actionLabel = issueType === "missing"
                        ? "ارفع المستند المفقود"
                        : issueType === "mismatch"
                        ? "استبدل المستند بآخر مطابق"
                        : null;
                      return { ...d, issueType, reason, replaced, actionLabel };
                    });

                    const pending = analyzed.filter((a) => a.issueType && !a.replaced);
                    // expose for the resubmit button via dataset attribute on the container
                    (window as any).__consultantPending = pending.length;

                    return (
                      <ul className="divide-y divide-border">
                        {analyzed.map((d) => {
                          let statusBadge;
                          if (d.issueType && d.replaced) {
                            statusBadge = (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 ml-1" /> تم الاستبدال
                              </Badge>
                            );
                          } else if (d.issueType === "missing") {
                            statusBadge = (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                                <AlertTriangle className="w-3 h-3 ml-1" /> ناقص
                              </Badge>
                            );
                          } else if (d.issueType === "mismatch") {
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
                            statusBadge = <Badge variant="outline" className="text-muted-foreground">اختياري</Badge>;
                          }

                          return (
                            <li key={d.label} className="py-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                  <span>{d.label}</span>
                                  {d.count !== undefined && d.count > 0 && (
                                    <span className="text-xs text-muted-foreground">({d.count})</span>
                                  )}
                                </div>
                                {statusBadge}
                              </div>
                              {d.issueType && (
                                <p className="text-xs text-destructive pr-1">
                                  {d.issueType === "missing"
                                    ? d.reason ? `السبب (مفقود): ${d.reason}` : "السبب: المستند مفقود ولم يتم رفعه."
                                    : `السبب (غير مطابق): ${d.reason}`}
                                </p>
                              )}
                              {d.issueType && !d.replaced && d.actionLabel && (
                                <div className="flex items-center justify-between gap-2 bg-muted/40 border border-border rounded p-2">
                                  <p className="text-xs">
                                    <span className="font-medium">الخطوة المطلوبة: </span>
                                    {d.actionLabel}
                                  </p>
                                  <Button size="sm" variant="outline" onClick={() => navigate("/profile")}>
                                    اذهب للاستبدال
                                  </Button>
                                </div>
                              )}
                              {d.issueType && d.replaced && (
                                <p className="text-xs text-emerald-700">تم استبدال هذا المستند ✓</p>
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
                        استبدل المستندات المحددة أعلاه. سيتم تفعيل زر إعادة الإرسال تلقائياً عند معالجة جميع المستندات المطلوبة.
                      </p>
                    </>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={fetchRequest} variant="outline">تحديث</Button>
                  <Button onClick={() => navigate("/profile")} variant="ghost">تعديل البيانات</Button>
                  {request.status === "rejected" && (() => {
                    const pendingCount = (typeof window !== "undefined" && (window as any).__consultantPending) || 0;
                    const disabled = pendingCount > 0;
                    return (
                      <Button
                        disabled={disabled}
                        title={disabled ? `يجب استبدال ${pendingCount} مستند(ات) قبل إعادة الإرسال` : undefined}
                        onClick={async () => {
                          const { toast } = await import("sonner");
                          const { error } = await supabase.rpc("resubmit_consultant_request" as any);
                          if (error) {
                            toast.error(error.message || "تعذر إعادة الإرسال");
                            return;
                          }
                          // Clear snapshot so future rejections start fresh
                          if (request) sessionStorage.removeItem(`consultant_req_snapshot_${request.id}`);
                          toast.success("تم إعادة إرسال الطلب بنجاح.");
                          await fetchRequest();
                          navigate("/profile");
                        }}
                      >
                        {disabled
                          ? `استبدل ${pendingCount} مستند(ات) أولاً`
                          : "إعادة الإرسال"}
                      </Button>
                    );
                  })()}
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
