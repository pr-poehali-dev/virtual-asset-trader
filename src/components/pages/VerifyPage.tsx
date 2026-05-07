import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    pending:  { label: "На рассмотрении", color: "text-amber-400 bg-amber-400/10 border-amber-400/30", icon: "Clock" },
    approved: { label: "Верифицирован",   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: "ShieldCheck" },
    rejected: { label: "Отклонена",       color: "text-red-400 bg-red-400/10 border-red-400/30", icon: "XCircle" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${s.color}`}>
      <Icon name={s.icon} size={12} />
      {s.label}
    </span>
  );
}

// ─── VERIFY PAGE ──────────────────────────────────────────────────────────────

export function VerifyPage({ setActive }: { setActive: (s: string) => void }) {
  const { user, refreshNotifications } = useAuth();
  const [verStatus, setVerStatus] = useState<{
    status: string | null; id?: string; reject_reason?: string; date?: string; verified?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [docType, setDocType] = useState("passport");
  const [docNumber, setDocNumber] = useState("");
  const [docPhotoFile, setDocPhotoFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const docRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    api.verify.status()
      .then(setVerStatus)
      .catch(() => setVerStatus({ status: null }))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center animate-fade-in">
        <Icon name="LogIn" size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground mb-4">Войдите, чтобы пройти верификацию</p>
        <Button className="bg-gold text-background hover:bg-gold/90 font-semibold" onClick={() => setActive("login")}>Войти</Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!fullName.trim() || !docNumber.trim()) {
      setError("Заполните все обязательные поля");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      let docPhotoB64: string | undefined;
      let selfieB64: string | undefined;
      if (docPhotoFile) docPhotoB64 = await fileToBase64(docPhotoFile);
      if (selfieFile) selfieB64 = await fileToBase64(selfieFile);

      await api.verify.submit({
        full_name: fullName.trim(),
        doc_type: docType,
        doc_number: docNumber.trim(),
        doc_photo: docPhotoB64,
        selfie: selfieB64,
      });
      setSuccess(true);
      setVerStatus({ status: "pending", date: new Date().toLocaleDateString("ru-RU") });
      await refreshNotifications();
    } catch (e: unknown) {
      const err = e as { error?: string };
      if (err?.error === "already_pending") setError("Заявка уже находится на рассмотрении");
      else if (err?.error === "already_verified") setError("Аккаунт уже верифицирован");
      else setError("Ошибка отправки. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <button onClick={() => setActive("cabinet")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
        <Icon name="ArrowLeft" size={14} />Назад в профиль
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
          <Icon name="ShieldCheck" size={24} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Верификация аккаунта</h1>
          <p className="text-sm text-muted-foreground">Подтвердите личность для вывода средств без ограничений</p>
        </div>
      </div>

      {/* Преимущества верификации */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { icon: "Zap", title: "Мгновенный вывод", desc: "Средства сразу после продажи" },
          { icon: "TrendingUp", title: "Больше доверия", desc: "Значок верификации в профиле" },
          { icon: "ShieldCheck", title: "Защита аккаунта", desc: "Дополнительный уровень безопасности" },
        ].map((f) => (
          <div key={f.title} className="bg-surface border border-border rounded-xl p-4">
            <Icon name={f.icon} size={18} className="text-emerald-400 mb-2" />
            <div className="font-display font-semibold text-sm text-foreground mb-0.5">{f.title}</div>
            <div className="text-xs text-muted-foreground">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Текущий статус */}
      {loading ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
          <Icon name="Loader" size={24} className="mx-auto animate-spin mb-3" />
          <p className="text-sm">Загрузка...</p>
        </div>
      ) : user.verified || verStatus?.verified ? (
        <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-6 text-center">
          <Icon name="ShieldCheck" size={40} className="text-emerald-400 mx-auto mb-3" />
          <h2 className="font-display font-bold text-xl text-foreground mb-2">Аккаунт верифицирован</h2>
          <p className="text-sm text-muted-foreground">Вы можете выводить средства сразу после продажи.</p>
        </div>
      ) : verStatus?.status === "pending" ? (
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-6 text-center">
          <Icon name="Clock" size={40} className="text-amber-400 mx-auto mb-3" />
          <h2 className="font-display font-bold text-xl text-foreground mb-2">Заявка на рассмотрении</h2>
          <p className="text-sm text-muted-foreground mb-4">Заявка {verStatus.id} подана {verStatus.date}. Рассмотрение занимает 1–3 рабочих дня.</p>
          <StatusBadge status="pending" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          {verStatus?.status === "rejected" && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 flex items-start gap-3">
              <Icon name="XCircle" size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-red-400 mb-1">Предыдущая заявка отклонена</div>
                <p className="text-xs text-muted-foreground">{verStatus.reject_reason || "Документы не прошли проверку."} Вы можете подать новую заявку.</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4 flex items-center gap-3">
              <Icon name="CheckCircle" size={16} className="text-emerald-400" />
              <p className="text-sm text-emerald-400 font-semibold">Заявка успешно отправлена! Ожидайте рассмотрения.</p>
            </div>
          )}

          <h2 className="font-display font-semibold text-base text-foreground">Данные для верификации</h2>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">ФИО *</label>
            <Input placeholder="Иванов Иван Иванович" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="bg-background border-border text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Тип документа</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground">
                <option value="passport">Паспорт РФ</option>
                <option value="international">Загранпаспорт</option>
                <option value="id_card">ID-карта</option>
                <option value="driver">Водительское удостоверение</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Серия и номер *</label>
              <Input placeholder="0000 000000" value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                className="bg-background border-border text-sm" />
            </div>
          </div>

          {/* Загрузка файлов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Документ */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Фото документа</label>
              <div
                onClick={() => docRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-gold/40 transition-colors group"
              >
                {docPhotoFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Icon name="Image" size={16} className="text-emerald-400" />
                    <span className="text-xs text-foreground font-medium">{docPhotoFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Icon name="Upload" size={24} className="mx-auto mb-2 text-muted-foreground group-hover:text-gold transition-colors" />
                    <p className="text-xs text-muted-foreground">Нажмите для загрузки</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">JPG, PNG до 5 МБ</p>
                  </>
                )}
                <input ref={docRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => setDocPhotoFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            {/* Селфи */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Селфи с документом</label>
              <div
                onClick={() => selfieRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-gold/40 transition-colors group"
              >
                {selfieFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Icon name="Camera" size={16} className="text-emerald-400" />
                    <span className="text-xs text-foreground font-medium">{selfieFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Icon name="Camera" size={24} className="mx-auto mb-2 text-muted-foreground group-hover:text-gold transition-colors" />
                    <p className="text-xs text-muted-foreground">Фото лица с документом</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">JPG, PNG до 5 МБ</p>
                  </>
                )}
                <input ref={selfieRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          </div>

          <div className="bg-secondary/50 border border-border rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Icon name="Lock" size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            Ваши данные защищены SSL-шифрованием и хранятся в соответствии с политикой конфиденциальности. Документы используются только для верификации.
          </div>

          {error && (
            <div className="text-xs text-red-400 flex items-center gap-1.5">
              <Icon name="AlertCircle" size={13} />
              {error}
            </div>
          )}

          <Button
            className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
            onClick={handleSubmit}
            disabled={submitting || success}
          >
            {submitting ? <><Icon name="Loader" size={15} className="animate-spin mr-2" />Отправка...</> : "Отправить на верификацию"}
          </Button>
        </div>
      )}
    </div>
  );
}
