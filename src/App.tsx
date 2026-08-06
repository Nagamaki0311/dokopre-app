import { useScreen } from './hooks/useScreen';
import { HomeScreen } from './screens/HomeScreen';
import { EditorScreen } from './screens/EditorScreen';
import { PresentScreen } from './screens/PresentScreen';

export default function App() {
  const { screen, navigate, back } = useScreen();

  return (
    <div className="app">
      {screen.name === 'home' && <HomeScreen navigate={navigate} />}
      {screen.name === 'editor' && <EditorScreen deckId={screen.deckId} navigate={navigate} back={back} />}
      {screen.name === 'present' && <PresentScreen deckId={screen.deckId} index={screen.index} back={back} />}
    </div>
  );
}
