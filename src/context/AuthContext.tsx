import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { financeService } from '../services/financeService';

interface AuthContextType {
  currentUser: User;
  users: User[];
  role: UserRole;
  isAdmin: boolean;
  isProfessor: boolean;
  switchUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'bomber_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const allUsers = financeService.getUsers();
    const savedId = localStorage.getItem(CURRENT_USER_KEY);
    const found = allUsers.find((u) => u.id === savedId);
    // Default: Prof. Marcos Andrade ou Admin
    return found || allUsers[1] || allUsers[0];
  });

  useEffect(() => {
    const allUsers = financeService.getUsers();
    setUsers(allUsers);
    if (!currentUser && allUsers.length > 0) {
      setCurrentUser(allUsers[0]);
    } else if (currentUser) {
      const currentUpdated = allUsers.find((u) => u.id === currentUser.id);
      if (
        currentUpdated &&
        (currentUpdated.name !== currentUser.name ||
          currentUpdated.email !== currentUser.email ||
          currentUpdated.avatar !== currentUser.avatar)
      ) {
        setCurrentUser(currentUpdated);
      }
    }
  }, []);

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem(CURRENT_USER_KEY, found.id);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const isProfessor = currentUser?.role === 'PROFESSOR';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        role: currentUser?.role || 'PROFESSOR',
        isAdmin,
        isProfessor,
        switchUser,
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
