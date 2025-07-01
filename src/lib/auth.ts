import { jwtVerify, SignJWT } from 'jose';
import toast from 'react-hot-toast';

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
  role: 'admin' | 'user' | 'viewer';
  token: string;
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
  // Validate token
  if (!validateToken(credentials.token)) {
    return null;
  }
  
  const { username, password, role } = credentials;
  
  // Check if username already exists
  const users = getUsers();
  if (users[username]) {
    return null;
  }
  
  // Create new user
  const newUser: User = {
    id: Date.now().toString(),
    username,
    role
  };
  
  // Save user
  users[username] = {
    password,
    user: newUser
  };
  
  saveUsers(users);
  
  // Generate token
  const token = await generateToken(newUser);
  
  return { token, user: newUser };
}

// Update user password
export function updateUserPassword(username: string, newPassword: string, token: string): boolean {
  // Validate token
  if (!validateToken(token)) {
    return false;
  }
  
  const users = getUsers();
  
  if (!users[username]) {
    return false;
  }
  
  users[username].password = newPassword;
  saveUsers(users);
  return true;
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
  const { username, password } = credentials;
  
  // Check if user exists and password matches
  const users = getUsers();
  const userRecord = users[username];
  
  if (!userRecord || userRecord.password !== password) {
    return null;
  }
  
  // Generate token
  const token = await generateToken(userRecord.user);
  
  return { token, user: userRecord.user };
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