import { useState, useEffect } from 'react';
import { AlertTriangle, Search, RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ErrorLog {
  id: string;
  function_name: string;
  error_message: string;
  error_stack: string | null;
  user_id: string | null;
  request_data: Record<string, unknown> | null;
  created_at: string;
}

export const ErrorLogsTable = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [functions, setFunctions] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedData = (data || []) as ErrorLog[];
      setLogs(typedData);

      // Extract unique function names
      const uniqueFunctions = [...new Set(typedData.map((log) => log.function_name))];
      setFunctions(uniqueFunctions);
    } catch (error) {
      console.error('Error fetching error logs:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب سجلات الأخطاء',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.function_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFunction = functionFilter === 'all' || log.function_name === functionFilter;
    return matchesSearch && matchesFunction;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle>سجلات الأخطاء</CardTitle>
            <Badge variant="destructive">{filteredLogs.length}</Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في الأخطاء..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 w-full sm:w-64"
              />
            </div>
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="كل الدوال" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الدوال</SelectItem>
                {functions.map((fn) => (
                  <SelectItem key={fn} value={fn}>
                    {fn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد سجلات أخطاء
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead className="text-right">الدالة</TableHead>
                  <TableHead className="text-right">رسالة الخطأ</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.function_name}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-destructive">
                      {log.error_message}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            عرض التفاصيل
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" dir="ltr">
                          <DialogHeader>
                            <DialogTitle className="text-right" dir="rtl">
                              تفاصيل الخطأ
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 text-sm">
                            <div>
                              <strong className="text-muted-foreground">الدالة:</strong>
                              <pre className="mt-1 p-2 bg-muted rounded text-foreground">
                                {log.function_name}
                              </pre>
                            </div>
                            <div>
                              <strong className="text-muted-foreground">رسالة الخطأ:</strong>
                              <pre className="mt-1 p-2 bg-destructive/10 rounded text-destructive whitespace-pre-wrap">
                                {log.error_message}
                              </pre>
                            </div>
                            {log.error_stack && (
                              <div>
                                <strong className="text-muted-foreground">Stack Trace:</strong>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
                                  {log.error_stack}
                                </pre>
                              </div>
                            )}
                            {log.request_data && (
                              <div>
                                <strong className="text-muted-foreground">بيانات الطلب:</strong>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.request_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            <div>
                              <strong className="text-muted-foreground">معرف المستخدم:</strong>
                              <pre className="mt-1 p-2 bg-muted rounded">
                                {log.user_id || 'غير معروف'}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
