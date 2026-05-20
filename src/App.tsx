import { useState } from 'react';
import './index.css';
import { Home } from './screens/Home';
import { AddExperiment } from './screens/AddExperiment';
import { ExperimentKanban } from './screens/ExperimentKanban';
import { ExperimentOutline } from './screens/ExperimentOutline';
import { ExperimentRawData } from './screens/ExperimentRawData';
import { AllExperiments } from './screens/AllExperiments';
import { AllInsights } from './screens/AllInsights';
import { useStore } from './store';

type Screen = 'home' | 'add-experiment' | 'edit-experiment' | 'experiment-kanban' | 'experiment-outline' | 'experiment-raw' | 'all-experiments' | 'insights' | 'projects';

function App() {
  const { state } = useStore();
  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('all-experiments');
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate = (s: string, expId?: string) => {
    setPrevScreen(screen);
    if (expId !== undefined) setActiveExperimentId(expId);
    if (s === 'projects') setScreen('all-experiments');
    else if (s === 'insights') setScreen('insights');
    else setScreen(s as Screen);
  };

  const handleCancel = () => {
    setScreen(prevScreen);
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {screen === 'home' && <Home onNavigate={navigate} sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />}
      {screen === 'add-experiment' && (
        <AddExperiment
          onNavigate={navigate}
          onCancel={handleCancel}
        />
      )}
      {screen === 'edit-experiment' && (
        <AddExperiment
          onNavigate={navigate}
          onCancel={handleCancel}
          experimentToEdit={state.experiments.find(e => e.id === activeExperimentId)}
        />
      )}
      {screen === 'experiment-kanban' && (
        <ExperimentKanban
          experimentId={activeExperimentId ?? ''}
          onNavigate={navigate}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />
      )}
      {screen === 'experiment-outline' && (
        <ExperimentOutline
          experimentId={activeExperimentId ?? ''}
          onNavigate={navigate}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />
      )}
      {screen === 'experiment-raw' && (
        <ExperimentRawData
          experimentId={activeExperimentId ?? ''}
          onNavigate={navigate}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />
      )}
      {(screen === 'all-experiments' || screen === 'projects') && (
        <AllExperiments
          onNavigate={navigate}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />
      )}
      {screen === 'insights' && <AllInsights onNavigate={navigate} sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />}
    </div>
  );
}

export default App;
