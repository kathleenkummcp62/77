import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Database,
  Globe,
  Server
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'authentication' | 'data' | 'network' | 'configuration';
  status: 'found' | 'fixed' | 'ignored';
  recommendation: string;
  codeExample?: string;
}

export function SecurityAudit() {
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showCode, setShowCode] = useState<string | null>(null);

  const securityChecks: Omit<SecurityIssue, 'status'>[] = [
    {
      id: 'plaintext-credentials',
      title: 'Незашифрованные учетные данные',
      description: 'В коде найдены примеры учетных данных в открытом виде',
      severity: 'critical',
      category: 'data',
      recommendation: 'Использовать переменные окружения и шифрование для хранения sensitive данных',
      codeExample: `// ❌ Плохо
const credentials = "192.168.1.1;admin;password123";

// ✅ Хорошо  
const credentials = process.env.ENCRYPTED_CREDENTIALS;
const decrypted = decrypt(credentials, process.env.SECRET_KEY);`
    },
    {
      id: 'no-cors-validation',
      title: 'Отсутствие валидации CORS',
      description: 'CORS настроен на прием запросов от любых источников',
      severity: 'high',
      category: 'network',
      recommendation: 'Ограничить CORS только доверенными доменами',
      codeExample: `// ❌ Плохо
app.use(cors({ origin: "*" }));

// ✅ Хорошо
app.use(cors({ 
  origin: ["https://yourdomain.com", "https://app.yourdomain.com"] 
}));`
    },
    {
      id: 'no-api-authentication',
      title: 'Отсутствие аутентификации API',
      description: 'API эндпоинты доступны без аутентификации',
      severity: 'high',
      category: 'authentication',
      recommendation: 'Добавить JWT токены или API ключи для защиты эндпоинтов',
      codeExample: `// ✅ Добавить middleware аутентификации
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};`
    },
    {
      id: 'ssh-keys-storage',
      title: 'Небезопасное хранение SSH ключей',
      description: 'SSH ключи могут храниться в незащищенном виде',
      severity: 'medium',
      category: 'data',
      recommendation: 'Использовать зашифрованное хранилище для SSH ключей',
      codeExample: `// ✅ Безопасное хранение SSH ключей
const encryptedKey = encrypt(sshPrivateKey, masterPassword);
localStorage.setItem('ssh_key', encryptedKey);`
    },
    {
      id: 'no-rate-limiting',
      title: 'Отсутствие ограничения скорости запросов',
      description: 'API не защищен от DDoS и брутфорс атак',
      severity: 'medium',
      category: 'network',
      recommendation: 'Добавить rate limiting для API эндпоинтов',
      codeExample: `// ✅ Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов за окно
});
app.use('/api/', limiter);`
    },
    {
      id: 'insecure-websocket',
      title: 'Незащищенное WebSocket соединение',
      description: 'WebSocket не использует аутентификацию',
      severity: 'medium',
      category: 'authentication',
      recommendation: 'Добавить аутентификацию для WebSocket соединений',
      codeExample: `// ✅ Аутентификация WebSocket
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  if (!verifyToken(token)) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  // ... остальная логика
});`
    },
    {
      id: 'sql-injection-risk',
      title: 'Потенциальный риск SQL инъекций',
      description: 'Некоторые запросы могут быть уязвимы к SQL инъекциям',
      severity: 'high',
      category: 'data',
      recommendation: 'Использовать параметризованные запросы',
      codeExample: `// ❌ Плохо
const query = \`SELECT * FROM users WHERE id = \${userId}\`;

// ✅ Хорошо
const query = 'SELECT * FROM users WHERE id = $1';
db.query(query, [userId]);`
    },
    {
      id: 'weak-session-management',
      title: 'Слабое управление сессиями',
      description: 'Отсутствует proper управление сессиями пользователей',
      severity: 'medium',
      category: 'authentication',
      recommendation: 'Реализовать secure session management с истечением токенов',
      codeExample: `// ✅ Secure session management
const session = {
  token: generateSecureToken(),
  expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 часа
  userId: user.id,
  permissions: user.permissions
};`
    },
    {
      id: 'input-validation',
      title: 'Недостаточная валидация входных данных',
      description: 'Отсутствует проверка пользовательского ввода',
      severity: 'high',
      category: 'data',
      recommendation: 'Добавить валидацию для всех пользовательских входных данных',
      codeExample: `// ✅ Валидация входных данных
const { error, value } = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required(),
  email: Joi.string().email().required()
}).validate(req.body);

if (error) {
  return res.status(400).json({ error: error.details[0].message });
}`
    }
  ];

  const runSecurityScan = async () => {
    setScanning(true);
    setIssues([]);

    // Симуляция сканирования
    for (let i = 0; i < securityChecks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const check = securityChecks[i];
      const issue: SecurityIssue = {
        ...check,
        status: Math.random() > 0.3 ? 'found' : 'fixed' // 70% вероятность найти проблему
      };
      
      setIssues(prev => [...prev, issue]);
    }

    setScanning(false);
    toast.success('Сканирование безопасности завершено');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return XCircle;
      case 'high': return AlertTriangle;
      case 'medium': return AlertTriangle;
      case 'low': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return Key;
      case 'data': return Database;
      case 'network': return Globe;
      case 'configuration': return Server;
      default: return Shield;
    }
  };

  const stats = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    acc[issue.status] = (acc[issue.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const foundIssues = issues.filter(issue => issue.status === 'found');
  const criticalIssues = foundIssues.filter(issue => issue.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Аудит безопасности</h1>
          <p className="text-gray-600 mt-1">Комплексная проверка безопасности приложения</p>
        </div>
        <Button 
          variant="primary" 
          onClick={runSecurityScan}
          loading={scanning}
          disabled={scanning}
        >
          <Shield className="h-4 w-4 mr-2" />
          {scanning ? 'Сканирование...' : 'Запустить сканирование'}
        </Button>
      </div>

      {/* Critical Alert */}
      {criticalIssues.length > 0 && (
        <Card className="border-error-200 bg-error-50">
          <div className="flex items-center space-x-3">
            <XCircle className="h-6 w-6 text-error-600" />
            <div>
              <h3 className="font-semibold text-error-800">Критические уязвимости обнаружены!</h3>
              <p className="text-sm text-error-600">
                Найдено {criticalIssues.length} критических проблем безопасности, требующих немедленного исправления.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Критические</p>
              <p className="text-2xl font-bold text-error-600">{stats.critical || 0}</p>
            </div>
            <XCircle className="h-8 w-8 text-error-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Высокие</p>
              <p className="text-2xl font-bold text-warning-600">{stats.high || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Средние</p>
              <p className="text-2xl font-bold text-primary-600">{stats.medium || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-primary-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Низкие</p>
              <p className="text-2xl font-bold text-success-600">{stats.low || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        </Card>
      </div>

      {/* Security Issues */}
      {issues.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты сканирования</h3>
          <div className="space-y-4">
            {issues.map(issue => {
              const SeverityIcon = getSeverityIcon(issue.severity);
              const CategoryIcon = getCategoryIcon(issue.category);
              
              return (
                <div key={issue.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <SeverityIcon className={`h-5 w-5 text-${getSeverityColor(issue.severity)}-600 mt-0.5`} />
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{issue.title}</h4>
                          <CategoryIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600">{issue.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getSeverityColor(issue.severity) as any}>
                        {issue.severity === 'critical' ? 'Критический' :
                         issue.severity === 'high' ? 'Высокий' :
                         issue.severity === 'medium' ? 'Средний' : 'Низкий'}
                      </Badge>
                      <Badge variant={issue.status === 'found' ? 'error' : 'success'}>
                        {issue.status === 'found' ? 'Найдено' : 'Исправлено'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <h5 className="font-medium text-blue-800 mb-1">Рекомендация:</h5>
                    <p className="text-sm text-blue-700">{issue.recommendation}</p>
                  </div>
                  
                  {issue.codeExample && (
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCode(showCode === issue.id ? null : issue.id)}
                      >
                        {showCode === issue.id ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                        {showCode === issue.id ? 'Скрыть код' : 'Показать пример кода'}
                      </Button>
                      
                      {showCode === issue.id && (
                        <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
                          <code>{issue.codeExample}</code>
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Security Recommendations */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Общие рекомендации по безопасности</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Lock className="h-4 w-4 mr-2 text-primary-600" />
              Аутентификация и авторизация
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Использовать JWT токены с коротким временем жизни</li>
              <li>• Реализовать refresh token механизм</li>
              <li>• Добавить двухфакторную аутентификацию</li>
              <li>• Логировать все попытки входа</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Database className="h-4 w-4 mr-2 text-primary-600" />
              Защита данных
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Шифровать sensitive данные в базе</li>
              <li>• Использовать HTTPS для всех соединений</li>
              <li>• Регулярно создавать резервные копии</li>
              <li>• Ограничить доступ к базе данных</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Globe className="h-4 w-4 mr-2 text-primary-600" />
              Сетевая безопасность
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Настроить правильные CORS политики</li>
              <li>• Использовать Content Security Policy</li>
              <li>• Добавить rate limiting</li>
              <li>• Мониторить подозрительную активность</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Server className="h-4 w-4 mr-2 text-primary-600" />
              Конфигурация сервера
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Регулярно обновлять зависимости</li>
              <li>• Использовать переменные окружения</li>
              <li>• Настроить proper логирование</li>
              <li>• Ограничить права доступа</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}