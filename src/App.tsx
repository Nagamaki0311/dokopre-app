import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useScreen } from './hooks/useScreen';
import { HomeScreen } from './screens/HomeScreen';
import { EditorScreen } from './screens/EditorScreen';
import { PresentScreen } from './screens/PresentScreen';

type ErrorBoundaryState = { error: Error | null };

/**
 * 想定外の壊れたデータ（例: インポート由来のSlide/Blockの検証をすり抜けたケース）で
 * レンダーが失敗しても白画面のまま復旧不能にならないよう、最小限のフォールバックUIを出す。
 */
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('アプリでエラーが発生しました', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>エラーが発生しました</h1>
          <p>予期しない問題が発生し、画面を表示できませんでした。</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#a33', fontSize: 12 }}>{this.state.error.message}</pre>
          <button onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { screen, navigate, back } = useScreen();

  return (
    <div className="app">
      {screen.name === 'home' && <HomeScreen navigate={navigate} />}
      {screen.name === 'editor' && <EditorScreen deckId={screen.deckId} navigate={navigate} back={back} />}
      {screen.name === 'present' && <PresentScreen deckId={screen.deckId} index={screen.index} back={back} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
