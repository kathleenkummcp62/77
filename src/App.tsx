import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/tabs/Dashboard';
import { VPNTypes } from './components/tabs/VPNTypes';
import { Servers } from './components/tabs/Servers';
import { Generation } from './components/tabs/Generation';
import { Upload } from './components/tabs/Upload';
import { Processing } from './components/tabs/Processing';
import { Results } from './components/tabs/Results';
import { Monitoring } from './components/tabs/Monitoring';
import { Database } from './components/tabs/Database';
import { Terminal } from './components/tabs/Terminal';
import { Settings } from './components/tabs/Settings';

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
        return <Upload />;
      case 'processing':
        return <Processing />;
      case 'results':
        return <Results />;
      case 'monitoring':
        return <Monitoring />;
      case 'database':
        return <Database />;
      case 'terminal':
        return <Terminal />;
      case 'settings':
        return <Settings />;
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
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
