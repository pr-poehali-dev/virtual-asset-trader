import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type ApiVerification } from "@/api/client";

// ─── VERIFICATIONS TAB ────────────────────────────────────────────────────────

export function AdminVerificationsTab() {
  const [verifications, setVerifications] = useState<ApiVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectInput, setRejectInput] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadList = () => {
    setLoading(true);
    api.verify.adminList()
      .then(({ verifications: list }) => setVerifications(list))
      .catch(() => setVerifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadList(); }, []);

  const handleApprove = async (id: string) => {
    await api.verify.approve(id);
    setVerifications((prev) => prev.filter((v) => v.id !== id));
  };

  const handleReject = async (id: string) => {
    const reason = rejectInput[id] || "Документы не прошли проверку";
    await api.verify.reject(id, reason);
    setVerifications((prev) => prev.filter((v) => v.id !== id));
  };

  const DOC_LABELS: Record<string, string> = {
    passport: "Паспорт РФ",
    international: "Загранпаспорт",
    id_card: "ID-карта",
    driver: "Водительское удостоверение",
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-semibold text-base text-foreground">Заявки на верификацию</h2>
        <Button variant="outline" size="sm" className="border-border text-xs" onClick={loadList}>
          <Icon name="RefreshCw" size={13} className="mr-1.5" />Обновить
        </Button>
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="Loader" size={24} className="mx-auto animate-spin mb-3" />
          <p className="text-sm">Загрузка...</p>
        </div>
      ) : verifications.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="ShieldCheck" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Нет заявок на рассмотрении</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map((v) => (
            <div key={v.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-background/30 transition-colors"
                onClick={() => setExpanded(expanded === v.id ? null : v.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                    {v.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                      {v.username}
                      <span className="text-xs text-muted-foreground font-normal">· {v.fullName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {DOC_LABELS[v.docType] ?? v.docType} · {v.docNumber} · {v.date}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">
                    На рассмотрении
                  </span>
                  <Icon name={expanded === v.id ? "ChevronUp" : "ChevronDown"} size={15} className="text-muted-foreground" />
                </div>
              </div>

              {/* Expanded */}
              {expanded === v.id && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Документы */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {v.docPhoto && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-semibold">Фото документа</p>
                        <a href={v.docPhoto} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={v.docPhoto} alt="Document" className="w-full rounded-lg border border-border object-cover max-h-48 hover:opacity-80 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {v.selfie && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-semibold">Селфи с документом</p>
                        <a href={v.selfie} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={v.selfie} alt="Selfie" className="w-full rounded-lg border border-border object-cover max-h-48 hover:opacity-80 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {!v.docPhoto && !v.selfie && (
                      <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-2 py-4">
                        <Icon name="ImageOff" size={14} />
                        Фотографии не прикреплены
                      </div>
                    )}
                  </div>

                  {/* Действия */}
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                      onClick={() => handleApprove(v.id)}
                    >
                      <Icon name="ShieldCheck" size={15} className="mr-2" />
                      Одобрить верификацию
                    </Button>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Причина отказа..."
                        value={rejectInput[v.id] ?? ""}
                        onChange={(e) => setRejectInput((p) => ({ ...p, [v.id]: e.target.value }))}
                        className="bg-background border-border text-sm flex-1"
                      />
                      <Button
                        variant="outline"
                        className="border-red-400/30 text-red-400 hover:bg-red-400/10 font-semibold"
                        onClick={() => handleReject(v.id)}
                      >
                        <Icon name="XCircle" size={14} className="mr-1.5" />
                        Отклонить
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
