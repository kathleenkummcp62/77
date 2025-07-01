import { jwtVerify, SignJWT } from 'jose';
import toast from 'react-hot-toast';
import bcrypt from 'bcryptjs';

// Secret key for JWT signing and verification
// In production, this should be stored in environment variables
const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.VITE_JWT_SECRET || 'vpn-bruteforce-dashboard-secret-key-2025'
);

// Static authentication token for account creation and admin actions
const STATIC_AUTH_TOKEN = "d@DMJYXf#5egNh7@3j%=C9vjhs9dH*nv";

// Token expiration time (1 hour)
const TOKEN_EXPIRATION = '1h';

// User interface
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user' | 'viewer';
}

// Login credentials interface
export interface LoginCredentials {
  username: string;
  password: string;
  token?: string;
}

// Registration credentials interface
export interface RegistrationCredentials {
  username: string;
  password: string;
  confirmPassword?: string;
  role: 'admin' | 'user' | 'viewer';
  token: string;
}

// Initialize default admin account
export function initializeDefaultAdmin() {
  const users = getUsers();
  
  // Check if admin account already exists
  if (!users['admin']) {
    // Create admin account with default credentials
    const hashedPassword = bcrypt.hashSync('admin', 10);
    users['admin'] = {
      password: hashedPassword,
      user: { id: '1', username: 'admin', role: 'admin' }
    };
    
    // Save users
    saveUsers(users);
    console.log('Default admin account created');
  }
}

// Get users from localStorage
export function getUsers(): Record<string, { password: string; user: User }> {
  const storedUsers = localStorage.getItem('auth_users');
  
  if (storedUsers) {
    try {
      return JSON.parse(storedUsers);
    } catch (error) {
      console.error('Error parsing stored users:', error);
    }
  }
  
  // Default empty users object
  return {};
}

// Save users to localStorage
export function saveUsers(users: Record<string, { password: string; user: User }>): void {
  localStorage.setItem('auth_users', JSON.stringify(users));
}

// Validate static token
export function validateToken(token: string): boolean {
  return token === STATIC_AUTH_TOKEN;
}

// Register a new user
export async function registerUser(credentials: RegistrationCredentials): Promise<{ token: string; user: User } | null> {
  try {
    // Validate token
    if (!validateToken(credentials.token)) {
      console.error('Invalid token during registration');
      return null;
    }
    
    const { username, password, role } = credentials;
    
    // Validate username (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      console.error('Invalid username format');
      return null;
    }
    
    // Validate password (at least 6 chars)
    if (password.length < 6) {
      console.error('Password too short');
      return null;
    }
    
    // Check if username already exists
    const users = getUsers();
    if (users[username]) {
      console.error('Username already exists');
      return null;
    }
    
    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      username,
      role
    };
    
    // Save user
    users[username] = {
      password: hashedPassword,
      user: newUser
    };
    
    saveUsers(users);
    console.log(`User ${username} registered successfully with role ${role}`);
    
    // Generate token
    const token = await generateToken(newUser);
    
    return { token, user: newUser };
  } catch (error) {
    console.error('Error during registration:', error);
    return null;
  }
}

// Update user password
export function updateUserPassword(username: string, newPassword: string): boolean {
  try {
    const users = getUsers();
    
    if (!users[username]) {
      console.error('User not found');
      return false;
    }
    
    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    users[username].password = hashedPassword;
    
    saveUsers(users);
    console.log(`Password updated for user ${username}`);
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
}

/**
 * Generate a JWT token for a user
 */
export async function generateToken(user: User): Promise<string> {
  try {
    const token = await new SignJWT({ user })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRATION)
      .sign(JWT_SECRET);
    
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify a JWT token and return the user
 */
export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.user as User;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Login a user with username and password
 */
export async function login(credentials: LoginCredentials): Promise<{ token: string; user: User } | null> {
  try {
    const { username, password, token } = credentials;
    
    // If token is provided, validate it
    if (token && !validateToken(token)) {
      console.error('Invalid token during login');
      return null;
    }
    
    // Check if user exists
    const users = getUsers();
    const userRecord = users[username];
    
    if (!userRecord) {
      console.error('User not found');
      return null;
    }
    
    // Verify password
    if (!bcrypt.compareSync(password, userRecord.password)) {
      console.error('Invalid password');
      return null;
    }
    
    // Generate token
    const authToken = await generateToken(userRecord.user);
    
    console.log(`User ${username} logged in successfully`);
    return { token: authToken, user: userRecord.user };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

/**
 * Get the current user from localStorage
 */
export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem('auth_user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson) as User;
  } catch (error) {
    console.error('Error parsing user JSON:', error);
    return null;
  }
}

/**
 * Set authentication data in localStorage
 */
export function setAuthData(token: string, user: User): void {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuthData(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

/**
 * Check if user has required role
 */
export function hasRole(requiredRole: 'admin' | 'user' | 'viewer'): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  const roleHierarchy = { admin: 3, user: 2, viewer: 1 };
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Add authentication headers to fetch options
 */
export function withAuth(options: RequestInit = {}): RequestInit {
  const token = getAuthToken();
  if (!token) return options;
  
  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Authenticated fetch function
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authOptions = withAuth(options);
  const response = await fetch(url, authOptions);
  
  if (response.status === 401) {
    // Token expired or invalid
    clearAuthData();
    toast.error('Your session has expired. Please log in again.');
    window.location.href = '/login';
    throw new Error('Authentication required');
  }
  
  return response;
}