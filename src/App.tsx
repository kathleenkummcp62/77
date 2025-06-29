import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/tabs/Dashboard';
import { VPNTypes } from './components/tabs/VPNTypes';
import { Servers } from './components/tabs/Servers';
import { Generation } from './components/tabs/Generation';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'vpn-types':
        return <VPNTypes />;
      case 'servers':
        return <Servers />;
      case 'generation':
        return <Generation />;
      case 'upload':
        return <div className="p-8 text-center text-gray-500">Upload functionality coming soon...</div>;
      case 'processing':
        return <div className="p-8 text-center text-gray-500">Processing monitoring coming soon...</div>;
      case 'results':
        return <div className="p-8 text-center text-gray-500">Results management coming soon...</div>;
      case 'monitoring':
        return <div className="p-8 text-center text-gray-500">Advanced monitoring coming soon...</div>;
      case 'terminal':
        return <div className="p-8 text-center text-gray-500">Web terminal coming soon...</div>;
      case 'settings':
        return <div className="p-8 text-center text-gray-500">Settings panel coming soon...</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;