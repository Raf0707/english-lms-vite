import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lingua LMS render error', error, info);
  }

  private reset = () => {
    this.setState({ error: null });
    window.location.assign('/');
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-error-boundary" role="alert">
        <div className="app-error-boundary__card">
          <span>Ошибка интерфейса</span>
          <h1>Страница не смогла отобразиться</h1>
          <p>Вместо пустого экрана приложение перехватило ошибку. Можно вернуться на главную и продолжить работу.</p>
          <details>
            <summary>Техническая информация</summary>
            <code>{this.state.error.message}</code>
          </details>
          <button type="button" onClick={this.reset}>Вернуться на главную</button>
        </div>
      </main>
    );
  }
}
