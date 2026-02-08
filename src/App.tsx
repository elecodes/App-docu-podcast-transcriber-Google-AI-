import React, { useState } from 'react';
import PodcastGenerator from '../components/PodcastGenerator';
import LiveTranscriber from '../components/LiveTranscriber';
import { BrainCircuitIcon, MicIcon } from '../components/icons';

type ActiveTab = 'podcast' | 'transcriber';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('podcast');

  const renderContent = () => {
    switch (activeTab) {
      case 'podcast':
        return <PodcastGenerator />;
      case 'transcriber':
        return <LiveTranscriber />;
      default:
        return null;
    }
  };

  // Fix: Changed icon prop type from JSX.Element to React.ReactNode to resolve TS2503 error.
  const TabButton = ({ tab, label, icon }: { tab: ActiveTab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
        activeTab === tab
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            Docu-Podcast & Transcriber
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            AI-powered tools to bring your text and voice to life.
          </p>
        </header>

        <nav className="flex justify-center gap-4 mb-8">
          <TabButton tab="podcast" label="Podcast Generator" icon={<BrainCircuitIcon />} />
          <TabButton tab="transcriber" label="Live Transcriber" icon={<MicIcon />} />
        </nav>

        <main className="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8">
          {renderContent()}
        </main>

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Built with React, Tailwind CSS, and the Gemini API.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
