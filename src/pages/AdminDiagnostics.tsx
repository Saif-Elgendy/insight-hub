import { useEffect, useState, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Activity, AlertTriangle, Globe, Terminal, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { ErrorLogsTable } from "@/components/admin/ErrorLogsTable";
import { ActivityLogsTable } from "@/components/admin/ActivityLogsTable";
import {
  getConsoleEntries,
  getApiEntries,
  clearConsoleEntries,
  clearApiEntries,
  maskEmail,
  maskUserId,
  type ConsoleEntry,
  type ApiCallEntry,
} from "@/lib/diagnosticsRecorder";

const MaskingContext = createContext<{ masked: boolean }>({ masked: true });

const useMasking = () => useContext(MaskingContext);

const levelVariant = (level: ConsoleEntry["level"]) => {
  if (level === "error") return "destructive" as const;
  if (level === "warn") return "secondary" as const;
  return "outline" as const;
};

const statusVariant = (status: number) => {
  if (status === 0) return "destructive" as const;
  if (status >= 500) return "destructive" as const;
  if (status >= 400) return "secondary" as const;
  return "outline" as const;
};

const ConsolePanel = () => {
  const [entries, setEntries] = useState<ConsoleEntry[]>(getConsoleEntries());
  const refresh = () => setEntries(getConsoleEntries());

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("diagnostics:update", onUpdate);
    const interval = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("diagnostics:update", onUpdate);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <CardTitle>ملاحظات الـ Console</CardTitle>
            <Badge variant="outline">{entries.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearConsoleEntries();
                refresh();
              }}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              مسح
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد ملاحظات في الـ console بعد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead className="text-right">المستوى</TableHead>
                  <TableHead className="text-right">المصدر</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الرسالة</TableHead>
                  <TableHead className="text-right">الصفحة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(e.ts).toLocaleString("ar-EG")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={levelVariant(e.level)}>{e.level}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.source}</TableCell>
                    <TableCell className="text-xs">
                      {e.userId ? (
                        <div className="space-y-1">
                          {e.email && <div className="font-medium">{e.email}</div>}
                          {e.role && <Badge variant="outline">{e.role}</Badge>}
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]" dir="ltr">{e.userId}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">زائر</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm whitespace-pre-wrap break-words">{e.message}</div>
                      {e.stack && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            stack
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
                            {e.stack}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                      {e.url}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ApiPanel = () => {
  const [entries, setEntries] = useState<ApiCallEntry[]>(getApiEntries());
  const [onlyErrors, setOnlyErrors] = useState(false);
  const refresh = () => setEntries(getApiEntries());

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("diagnostics:update", onUpdate);
    const interval = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("diagnostics:update", onUpdate);
      window.clearInterval(interval);
    };
  }, []);

  const filtered = onlyErrors ? entries.filter((e) => !e.ok) : entries;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle>نتائج استدعاءات الـ API</CardTitle>
            <Badge variant="outline">{filtered.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant={onlyErrors ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyErrors((v) => !v)}
            >
              الأخطاء فقط
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearApiEntries();
                refresh();
              }}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              مسح
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد استدعاءات مسجّلة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead className="text-right">الطريقة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">المدة</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الرابط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(e.ts).toLocaleString("ar-EG")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(e.status)}>
                        {e.status === 0 ? "فشل" : e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.durationMs}ms
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.userId ? (
                        <div className="space-y-1">
                          {e.email && <div className="font-medium">{e.email}</div>}
                          {e.role && <Badge variant="outline">{e.role}</Badge>}
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]" dir="ltr">{e.userId}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">زائر</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-xs break-all" dir="ltr">{e.url}</div>
                      {e.error && (
                        <div className="text-xs text-destructive mt-1">{e.error}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminDiagnostics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
        toast({
          title: "غير مصرح",
          description: "ليس لديك صلاحية الوصول لهذه الصفحة",
          variant: "destructive",
        });
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate, toast]);

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">تشخيصات الموقع</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  متابعة سريعة لأخطاء النظام وملاحظات الـ console واستدعاءات الـ API
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للوحة الأدمن
              </Button>
            </div>

            <Tabs defaultValue="errors" className="space-y-4">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
                <TabsTrigger value="errors">
                  <AlertTriangle className="w-4 h-4 ml-2" />
                  أخطاء الخادم
                </TabsTrigger>
                <TabsTrigger value="console">
                  <Terminal className="w-4 h-4 ml-2" />
                  Console
                </TabsTrigger>
                <TabsTrigger value="api">
                  <Globe className="w-4 h-4 ml-2" />
                  API
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="w-4 h-4 ml-2" />
                  النشاط
                </TabsTrigger>
              </TabsList>

              <TabsContent value="errors">
                <ErrorLogsTable />
              </TabsContent>
              <TabsContent value="console">
                <ConsolePanel />
              </TabsContent>
              <TabsContent value="api">
                <ApiPanel />
              </TabsContent>
              <TabsContent value="activity">
                <ActivityLogsTable />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDiagnostics;
