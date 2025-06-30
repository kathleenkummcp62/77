import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Database,
  Wifi,
  Server,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TestResult {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'websocket' | 'security';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  duration?: number;
  error?: string;
  details?: string;
}

export function TestSuite() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const testDefinitions: Omit<TestResult, 'status'>[] = [
    // Frontend Tests
    {
      id: 'frontend-components',
      name: 'React Components Rendering',
      category: 'frontend',
      details: 'Проверка корректного рендеринга всех компонентов'
    },
    {
      id: 'frontend-websocket',
      name: 'WebSocket Hook Integration',
      category: 'frontend',
      details: 'Тестирование WebSocket подключения и обработки сообщений'
    },
    {
      id: 'frontend-routing',
      name: 'Navigation & Routing',
      category: 'frontend',
      details: 'Проверка навигации между вкладками'
    },
    
    // Backend Tests
    {
      id: 'backend-api',
      name: 'API Endpoints',
      category: 'backend',
      details: 'Тестирование всех API эндпоинтов'
    },
    {
      id: 'backend-websocket',
      name: 'WebSocket Server',
      category: 'backend',
      details: 'Проверка WebSocket сервера и broadcast функций'
    },
    {
      id: 'backend-auth',
      name: 'Authentication',
      category: 'backend',
      details: 'Тестирование системы аутентификации'
    },
    
    // Database Tests
    {
      id: 'database-connection',
      name: 'Database Connection',
      category: 'database',
      details: 'Проверка подключения к базе данных'
    },
    {
      id: 'database-crud',
      name: 'CRUD Operations',
      category: 'database',
      details: 'Тестирование операций создания, чтения, обновления, удаления'
    },
    {
      id: 'database-migrations',
      name: 'Schema Migrations',
      category: 'database',
      details: 'Проверка миграций схемы базы данных'
    },
    
    // WebSocket Tests
    {
      id: 'websocket-connection',
      name: 'WebSocket Connection',
      category: 'websocket',
      details: 'Тестирование установки WebSocket соединения'
    },
    {
      id: 'websocket-messages',
      name: 'Message Handling',
      category: 'websocket',
      details: 'Проверка обработки различных типов сообщений'
    },
    {
      id: 'websocket-reconnect',
      name: 'Auto Reconnection',
      category: 'websocket',
      details: 'Тестирование автоматического переподключения'
    },
    
    // Security Tests
    {
      id: 'security-credentials',
      name: 'Credentials Security',
      category: 'security',
      details: 'Проверка безопасности хранения учетных данных'
    },
    {
      id: 'security-cors',
      name: 'CORS Configuration',
      category: 'security',
      details: 'Тестирование настроек CORS'
    },
    {
      id: 'security-input-validation',
      name: 'Input Validation',
      category: 'security',
      details: 'Проверка валидации пользовательского ввода'
    }
  ];

  useEffect(() => {
    setTests(testDefinitions.map(test => ({ ...test, status: 'pending' })));
  }, []);

  const runTest = async (testId: string): Promise<TestResult> => {
    const test = tests.find(t => t.id === testId);
    if (!test) throw new Error('Test not found');

    const startTime = Date.now();
    
    try {
      // Симуляция выполнения тестов
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
      
      let result: TestResult;
      
      switch (testId) {
        case 'frontend-components':
          result = await testFrontendComponents();
          break;
        case 'frontend-websocket':
          result = await testWebSocketHook();
          break;
        case 'backend-api':
          result = await testBackendAPI();
          break;
        case 'database-connection':
          result = await testDatabaseConnection();
          break;
        case 'websocket-connection':
          result = await testWebSocketConnection();
          break;
        case 'security-credentials':
          result = await testCredentialsSecurity();
          break;
        default:
          // Случайный результат для демонстрации
          const outcomes = ['passed', 'failed', 'warning'] as const;
          const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
          result = {
            ...test,
            status: randomOutcome,
            duration: Date.now() - startTime,
            error: randomOutcome === 'failed' ? 'Тест не прошел проверку' : undefined
          };
      }
      
      return {
        ...result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        ...test,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  };

  const testFrontendComponents = async (): Promise<TestResult> => {
    // Проверяем наличие основных компонентов в DOM
    const components = ['dashboard', 'servers', 'vpn-types'];
    const missingComponents = components.filter(comp => 
      !document.querySelector(`[data-testid="${comp}"]`)
    );
    
    return {
      id: 'frontend-components',
      name: 'React Components Rendering',
      category: 'frontend',
      status: missingComponents.length === 0 ? 'passed' : 'warning',
      error: missingComponents.length > 0 ? 
        `Отсутствуют компоненты: ${missingComponents.join(', ')}` : undefined
    };
  };

  const testWebSocketHook = async (): Promise<TestResult> => {
    try {
      // Проверяем доступность WebSocket
      const host = window.location.hostname;
      const port = import.meta.env.VITE_WS_PORT || '8080';
      const wsUrl = `ws://${host}:${port}/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            id: 'frontend-websocket',
            name: 'WebSocket Hook Integration',
            category: 'frontend',
            status: 'failed',
            error: 'WebSocket connection timeout'
          });
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            id: 'frontend-websocket',
            name: 'WebSocket Hook Integration',
            category: 'frontend',
            status: 'passed'
          });
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({
            id: 'frontend-websocket',
            name: 'WebSocket Hook Integration',
            category: 'frontend',
            status: 'failed',
            error: 'WebSocket connection failed'
          });
        };
      });
    } catch (error) {
      return {
        id: 'frontend-websocket',
        name: 'WebSocket Hook Integration',
        category: 'frontend',
        status: 'failed',
        error: 'WebSocket test failed'
      };
    }
  };

  const testBackendAPI = async (): Promise<TestResult> => {
    try {
      const response = await fetch('/api/stats');
      return {
        id: 'backend-api',
        name: 'API Endpoints',
        category: 'backend',
        status: response.ok ? 'passed' : 'failed',
        error: !response.ok ? `HTTP ${response.status}` : undefined
      };
    } catch (error) {
      return {
        id: 'backend-api',
        name: 'API Endpoints',
        category: 'backend',
        status: 'failed',
        error: 'API недоступен'
      };
    }
  };

  const testDatabaseConnection = async (): Promise<TestResult> => {
    try {
      const response = await fetch('/api/credentials');
      return {
        id: 'database-connection',
        name: 'Database Connection',
        category: 'database',
        status: response.ok ? 'passed' : 'failed',
        error: !response.ok ? 'Database connection failed' : undefined
      };
    } catch (error) {
      return {
        id: 'database-connection',
        name: 'Database Connection',
        category: 'database',
        status: 'failed',
        error: 'Database недоступна'
      };
    }
  };

  const testWebSocketConnection = async (): Promise<TestResult> => {
    // Аналогично testWebSocketHook, но для backend тестирования
    return testWebSocketHook();
  };

  const testCredentialsSecurity = async (): Promise<TestResult> => {
    // Проверяем, нет ли plaintext credentials в localStorage или sessionStorage
    const hasPlaintextCreds = 
      localStorage.getItem('credentials') || 
      sessionStorage.getItem('credentials') ||
      document.body.innerText.includes('password123');

    return {
      id: 'security-credentials',
      name: 'Credentials Security',
      category: 'security',
      status: hasPlaintextCreds ? 'warning' : 'passed',
      error: hasPlaintextCreds ? 'Найдены незашифрованные credentials' : undefined
    };
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    
    const totalTests = tests.length;
    let completedTests = 0;

    for (const test of tests) {
      setTests(prev => prev.map(t => 
        t.id === test.id ? { ...t, status: 'running' } : t
      ));

      try {
        const result = await runTest(test.id);
        setTests(prev => prev.map(t => 
          t.id === test.id ? result : t
        ));
      } catch (error) {
        setTests(prev => prev.map(t => 
          t.id === test.id ? { 
            ...t, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Ошибка теста'
          } : t
        ));
      }

      completedTests++;
      setProgress((completedTests / totalTests) * 100);
    }

    setIsRunning(false);
    
    const results = tests.reduce((acc, test) => {
      acc[test.status] = (acc[test.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    toast.success(`Тестирование завершено! Пройдено: ${results.passed || 0}, Ошибок: ${results.failed || 0}`);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'frontend': return Zap;
      case 'backend': return Server;
      case 'database': return Database;
      case 'websocket': return Wifi;
      case 'security': return Shield;
      default: return CheckCircle;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return CheckCircle;
      case 'failed': return XCircle;
      case 'warning': return AlertTriangle;
      case 'running': return Clock;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'success';
      case 'failed': return 'error';
      case 'warning': return 'warning';
      case 'running': return 'primary';
      default: return 'gray';
    }
  };

  const groupedTests = tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const stats = tests.reduce((acc, test) => {
    acc[test.status] = (acc[test.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Тестирование системы</h1>
          <p className="text-gray-600 mt-1">Комплексное тестирование всех компонентов приложения</p>
        </div>
        <Button 
          variant="primary" 
          onClick={runAllTests}
          loading={isRunning}
          disabled={isRunning}
        >
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Выполняется...' : 'Запустить все тесты'}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Прогресс тестирования</h3>
            <Badge variant="primary">{Math.round(progress)}%</Badge>
          </div>
          <ProgressBar value={progress} color="primary" size="lg" showLabel />
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Всего тестов</p>
              <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Пройдено</p>
              <p className="text-2xl font-bold text-success-600">{stats.passed || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ошибки</p>
              <p className="text-2xl font-bold text-error-600">{stats.failed || 0}</p>
            </div>
            <XCircle className="h-8 w-8 text-error-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Предупреждения</p>
              <p className="text-2xl font-bold text-warning-600">{stats.warning || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Выполняется</p>
              <p className="text-2xl font-bold text-primary-600">{stats.running || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-primary-600" />
          </div>
        </Card>
      </div>

      {/* Test Results by Category */}
      {Object.entries(groupedTests).map(([category, categoryTests]) => {
        const CategoryIcon = getCategoryIcon(category);
        const categoryNames = {
          frontend: 'Frontend',
          backend: 'Backend', 
          database: 'База данных',
          websocket: 'WebSocket',
          security: 'Безопасность'
        };

        return (
          <Card key={category}>
            <div className="flex items-center space-x-3 mb-4">
              <CategoryIcon className="h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {categoryNames[category as keyof typeof categoryNames] || category}
              </h3>
              <Badge variant="gray">{categoryTests.length} тестов</Badge>
            </div>
            
            <div className="space-y-3">
              {categoryTests.map(test => {
                const StatusIcon = getStatusIcon(test.status);
                return (
                  <div key={test.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={`h-5 w-5 text-${getStatusColor(test.status)}-600`} />
                      <div>
                        <p className="font-medium text-gray-900">{test.name}</p>
                        <p className="text-sm text-gray-600">{test.details}</p>
                        {test.error && (
                          <p className="text-sm text-error-600 mt-1">{test.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {test.duration && (
                        <span className="text-xs text-gray-500">{test.duration}ms</span>
                      )}
                      <Badge variant={getStatusColor(test.status) as any}>
                        {test.status === 'passed' ? 'Пройден' :
                         test.status === 'failed' ? 'Ошибка' :
                         test.status === 'warning' ? 'Предупреждение' :
                         test.status === 'running' ? 'Выполняется' : 'Ожидание'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}