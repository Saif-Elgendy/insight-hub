import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, FileHeart, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Record {
  id: string;
  patient_id: string;
  specialist_id: string;
  consultation_id: string | null;
  diagnosis: string;
  recommendations: string | null;
  notes: string | null;
  visible_to_patient: boolean;
  created_at: string;
}

interface Props {
  patientId: string;
  consultationId?: string;
  /** If true, render in patient-view mode (read-only, only visible records) */
  patientView?: boolean;
}

export const MedicalRecordsPanel = ({ patientId, consultationId, patientView = false }: Props) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    diagnosis: '',
    recommendations: '',
    notes: '',
    visible_to_patient: true,
  });

  useEffect(() => {
    init();
  }, [patientId]);

  const init = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (!patientView) {
        const { data: spec } = await supabase
          .from('specialists')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setSpecialistId(spec?.id ?? null);
      }
      const { data, error } = await supabase
        .from('patient_medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecords((data || []) as Record[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!specialistId) { toast.error('لا يمكن إضافة سجل: لم يتم العثور على بيانات الاستشاري'); return; }
    if (!form.diagnosis.trim()) { toast.error('التشخيص مطلوب'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('patient_medical_records').insert({
        patient_id: patientId,
        specialist_id: specialistId,
        consultation_id: consultationId || null,
        diagnosis: form.diagnosis.trim(),
        recommendations: form.recommendations.trim() || null,
        notes: form.notes.trim() || null,
        visible_to_patient: form.visible_to_patient,
      });
      if (error) throw error;
      toast.success('تم حفظ السجل الطبي');
      setAdding(false);
      setForm({ diagnosis: '', recommendations: '', notes: '', visible_to_patient: true });
      init();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return;
    try {
      const { error } = await supabase.from('patient_medical_records').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم الحذف');
      init();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileHeart className="w-5 h-5 text-primary" />
          {patientView ? 'سجلي الطبي' : 'السجل الطبي للمريض'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!patientView && !adding && (
          <Button onClick={() => setAdding(true)} className="gap-2" size="sm">
            <Plus className="w-4 h-4" /> إضافة تشخيص جديد
          </Button>
        )}

        {adding && !patientView && (
          <div className="space-y-3 p-4 border border-border rounded-xl bg-muted/30">
            <div className="space-y-1">
              <Label>التشخيص *</Label>
              <Input
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="مثال: قلق عام معتدل"
              />
            </div>
            <div className="space-y-1">
              <Label>التوصيات</Label>
              <Textarea
                value={form.recommendations}
                onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
                placeholder="توصيات للمريض..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>ملاحظات داخلية</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ملاحظات للمتابعة..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-background">
              <Label className="flex items-center gap-2 text-sm cursor-pointer">
                {form.visible_to_patient ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                إظهار للمريض
              </Label>
              <Switch
                checked={form.visible_to_patient}
                onCheckedChange={(v) => setForm({ ...form, visible_to_patient: v })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2 flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setAdding(false)} className="flex-1">إلغاء</Button>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات بعد</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="p-4 border border-border rounded-xl space-y-2 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{r.diagnosis}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!patientView && (
                      <Badge variant={r.visible_to_patient ? 'default' : 'secondary'} className="text-[10px]">
                        {r.visible_to_patient ? 'ظاهر' : 'خاص'}
                      </Badge>
                    )}
                    {!patientView && (
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {r.recommendations && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">التوصيات:</p>
                    <p className="text-sm whitespace-pre-wrap">{r.recommendations}</p>
                  </div>
                )}
                {!patientView && r.notes && (
                  <div className="bg-muted/40 p-2 rounded">
                    <p className="text-xs font-medium text-muted-foreground">ملاحظات داخلية:</p>
                    <p className="text-sm whitespace-pre-wrap">{r.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
