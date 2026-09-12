import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isProfessor: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;

  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          setCurrentUser(null);
          return;
        }

        const data = await response.json();

        setCurrentUser(data.user);
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Não foi possível realizar o login.',
        };
      }

      setCurrentUser(data.user);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Erro no login:', error);

      return {
        success: false,
        message: 'Não foi possível conectar ao servidor.',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setCurrentUser(null);
    }
  };

  const role = currentUser?.role ?? null;
  const isAdmin = role === 'ADMIN';
  const isProfessor = role === 'PROFESSOR';
  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isAdmin,
        isProfessor,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};