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
