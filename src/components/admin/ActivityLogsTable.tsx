import { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw, Filter } from 'lucide-react';
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

interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  enroll: 'تسجيل في كورس',
  activate: 'تفعيل تسجيل',
  cancel: 'إلغاء تسجيل',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
};

const actionVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  enroll: 'default',
  activate: 'secondary',
  cancel: 'destructive',
  login: 'outline',
  logout: 'outline',
};

export const ActivityLogsTable = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actions, setActions] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedData = (data || []) as ActivityLog[];
      setLogs(typedData);

      // Extract unique actions
      const uniqueActions = [...new Set(typedData.map((log) => log.action))];
      setActions(uniqueActions);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب سجلات النشاطات',
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
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle>سجلات النشاطات</CardTitle>
            <Badge variant="secondary">{filteredLogs.length}</Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في النشاطات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 w-full sm:w-64"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="كل الإجراءات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الإجراءات</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] || action}
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
            لا توجد سجلات نشاطات
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">نوع الكيان</TableHead>
                  <TableHead className="text-right">معرف المستخدم</TableHead>
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
                      <Badge variant={actionVariants[log.action] || 'outline'}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {log.user_id ? log.user_id.slice(0, 8) + '...' : 'غير معروف'}
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
                              تفاصيل النشاط
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <strong className="text-muted-foreground">الإجراء:</strong>
                                <pre className="mt-1 p-2 bg-muted rounded">
                                  {actionLabels[log.action] || log.action}
                                </pre>
                              </div>
                              <div>
                                <strong className="text-muted-foreground">نوع الكيان:</strong>
                                <pre className="mt-1 p-2 bg-muted rounded">{log.entity_type}</pre>
                              </div>
                            </div>
                            <div>
                              <strong className="text-muted-foreground">معرف الكيان:</strong>
                              <pre className="mt-1 p-2 bg-muted rounded">
                                {log.entity_id || 'غير متوفر'}
                              </pre>
                            </div>
                            <div>
                              <strong className="text-muted-foreground">معرف المستخدم:</strong>
                              <pre className="mt-1 p-2 bg-muted rounded">
                                {log.user_id || 'غير معروف'}
                              </pre>
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <strong className="text-muted-foreground">البيانات الإضافية:</strong>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.ip_address && (
                              <div>
                                <strong className="text-muted-foreground">عنوان IP:</strong>
                                <pre className="mt-1 p-2 bg-muted rounded">{log.ip_address}</pre>
                              </div>
                            )}
                            {log.user_agent && (
                              <div>
                                <strong className="text-muted-foreground">User Agent:</strong>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
                                  {log.user_agent}
                                </pre>
                              </div>
                            )}
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
