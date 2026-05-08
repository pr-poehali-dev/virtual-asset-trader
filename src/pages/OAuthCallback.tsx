import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code     = searchParams.get("code");
    const pathname = window.location.pathname;

    let provider: "google" | "vk" | null = null;
    if (pathname.includes("/google")) provider = "google";
    if (pathname.includes("/vk"))     provider = "vk";

    if (code && provider && window.opener) {
      window.opener.postMessage(
        { type: "oauth_callback", provider, code },
        window.location.origin
      );
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Авторизация...</p>
    </div>
  );
}
