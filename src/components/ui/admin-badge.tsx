import Icon from "@/components/ui/icon";

const ADMIN_AVATAR_URL =
  "https://cdn.poehali.dev/projects/6d96cf49-c0b6-45ab-ab7b-3c1367bdc4ef/files/af5c60f3-2d62-4a1a-8b4f-975d402f20cf.jpg";

// ─── РАДУЖНЫЙ БЕЙДЖ "АДМИН" С КОРОНОЙ ─────────────────────────────────────────

export function AdminBadge({ size = "sm" }: { size?: "xs" | "sm" | "md" }) {
  const sizes = {
    xs: { text: "text-[9px]", icon: 9, px: "px-1.5 py-0.5" },
    sm: { text: "text-[10px]", icon: 11, px: "px-1.5 py-0.5" },
    md: { text: "text-xs", icon: 13, px: "px-2 py-1" },
  }[size];
  return (
    <span
      className={`inline-flex items-center gap-1 ${sizes.px} rounded border border-gold/40 bg-gold/10 font-bold ${sizes.text}`}
    >
      <Icon name="Crown" size={sizes.icon} className="text-gold shrink-0" />
      <span className="rainbow-text font-display">Админ</span>
    </span>
  );
}

// ─── АВАТАР АДМИНА (ФОТО ПРОФИЛЯ) ─────────────────────────────────────────────

export function AdminAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="relative rounded-full overflow-hidden border-2 border-gold shrink-0"
      style={{ width: size, height: size }}
      title="Админ Gorant.shop"
    >
      <img
        src={ADMIN_AVATAR_URL}
        alt="Админ Gorant.shop"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export { ADMIN_AVATAR_URL };
