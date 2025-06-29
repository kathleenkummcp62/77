import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  FileText, 
  Upload, 
  Download, 
  Play, 
  Settings,
  AlertCircle,
  CheckCircle,
  Shuffle
} from 'lucide-react';

export function Generation() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate generation progress
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const credentialSources = [
    { name: 'IP Addresses', file: 'ip.txt', count: 15420, status: 'loaded' },
    { name: 'Usernames', file: 'login.txt', count: 8950, status: 'loaded' },
    { name: 'Passwords', file: 'pass.txt', count: 12340, status: 'loaded' },
    { name: 'Combined Login/Pass', file: 'loginpass.txt', count: 5670, status: 'loaded' }
  ];

  const generationStats = {
    totalCombinations: 1847520000,
    estimatedTime: '2h 15m',
    fileSize: '1.2 GB',
    lastGenerated: '2 hours ago'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credential Generation</h1>
          <p className="text-gray-600 mt-1">Generate and manage credential combinations for testing</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGenerate}
            loading={isGenerating}
            disabled={isGenerating}
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Combinations'}
          </Button>
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Generation in Progress</h3>
            <Badge variant="warning">Processing</Badge>
          </div>
          <ProgressBar 
            value={generationProgress} 
            color="primary" 
            size="lg" 
            showLabel 
            className="mb-4"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div>Status: Generating combinations</div>
            <div>Speed: 125k combinations/sec</div>
            <div>ETA: {Math.round((100 - generationProgress) * 0.5)} seconds</div>
            <div>Memory: 2.1 GB</div>
          </div>
        </Card>
      )}

      {/* Source Files */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Source Files</h3>
          <Button variant="ghost" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {credentialSources.map((source, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{source.name}</span>
                </div>
                <Badge variant={source.status === 'loaded' ? 'success' : 'gray'}>
                  {source.status === 'loaded' ? 'Loaded' : 'Empty'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{source.file}</p>
              <p className="text-lg font-bold text-primary-600">
                {source.count.toLocaleString()} entries
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Generation Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Combinations</span>
              <span className="font-bold text-primary-600">
                {generationStats.totalCombinations.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Generation Time</span>
              <span className="font-medium">{generationStats.estimatedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expected File Size</span>
              <span className="font-medium">{generationStats.fileSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Generated</span>
              <span className="font-medium">{generationStats.lastGenerated}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Files</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-success-600" />
                <div>
                  <p className="font-medium text-gray-900">gener.txt</p>
                  <p className="text-sm text-gray-600">Master combination file</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">1.2 GB</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-success-600" />
                  <div>
                    <p className="font-medium text-gray-900">part_{i}.txt</p>
                    <p className="text-sm text-gray-600">Split for server {192 + 168 + 8 + 250 + i}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">300 MB</p>
                  <p className="text-sm text-gray-600">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Advanced Options */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Combination Strategy
            </label>
            <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option>All combinations (IP × Login × Password)</option>
              <option>Smart combinations (reduce duplicates)</option>
              <option>Custom pattern matching</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Format
            </label>
            <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option>Semicolon separated (IP;user;pass)</option>
              <option>Comma separated (IP,user,pass)</option>
              <option>Tab separated</option>
              <option>JSON format</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Splitting
            </label>
            <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option>Auto-split by server count</option>
              <option>Split by file size (500MB each)</option>
              <option>Split by line count (1M lines each)</option>
              <option>No splitting</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-warning-800">Important Notes</h4>
              <ul className="mt-2 text-sm text-warning-700 space-y-1">
                <li>• Large combination sets may take significant time to generate</li>
                <li>• Ensure sufficient disk space before starting generation</li>
                <li>• Generated files will be automatically distributed to servers</li>
                <li>• Previous generation files will be backed up before overwriting</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
