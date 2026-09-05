import { Component, type ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Перехватывает необработанные ошибки рендера React, чтобы вместо
// пустого чёрного экрана пользователь видел понятное сообщение с кнопкой
// "Обновить страницу" вместо полностью нерабочего интерфейса.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Необработанная ошибка рендера:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/30 flex items-center justify-center mx-auto mb-5">
              <Icon name="AlertTriangle" size={28} className="text-red-400" />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground mb-3">
              Что-то пошло не так
            </h1>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Произошла непредвиденная ошибка. Попробуйте обновить страницу —
              обычно это помогает.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gold text-background hover:bg-gold/90 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
