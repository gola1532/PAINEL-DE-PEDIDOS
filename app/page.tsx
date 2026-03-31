'use client';

import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, signInAnonymously, db, handleFirestoreError, OperationType } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Calculator as CalculatorIcon,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Barcode,
  Edit2,
  Check,
  Building2,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

// Components
import Customers from '@/components/Customers';
import Products from '@/components/Products';
import Orders from '@/components/Orders';
import Finance from '@/components/Finance';
import Calendar from '@/components/Calendar';
import Calculator from '@/components/Calculator';
import BarcodeGenerator from '@/components/BarcodeGenerator';

type Tab = 'customers' | 'products' | 'orders' | 'finance' | 'calendar' | 'calculator' | 'barcode';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [companyName, setCompanyName] = useState('Solares');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    let settingsUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);
      setLoading(false);
      
      // Listen to settings - use 'public_user' as fallback if not logged in
      const settingsId = currentUser?.uid || 'public_user';
      settingsUnsubscribe = onSnapshot(doc(db, 'settings', settingsId), (doc) => {
        if (doc.exists()) {
          setCompanyName(doc.data().companyName || 'Solares');
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `settings/${settingsId}`));
    });

    return () => {
      unsubscribe();
      if (settingsUnsubscribe) settingsUnsubscribe();
    };
  }, []);

  const saveCompanyName = async () => {
    const settingsId = user?.uid || 'public_user';
    if (!tempName.trim()) return;
    try {
      await setDoc(doc(db, 'settings', settingsId), {
        companyName: tempName.trim()
      }, { merge: true });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error saving company name:", error);
    }
  };

  const startEditing = () => {
    setTempName(companyName);
    setIsEditingName(true);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const navItems = [
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
    { id: 'calculator', label: 'Calculadora', icon: CalculatorIcon },
    { id: 'barcode', label: 'Código Barras', icon: Barcode },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'customers': return <Customers />;
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'finance': return <Finance />;
      case 'calendar': return <Calendar />;
      case 'calculator': return <Calculator />;
      case 'barcode': return <BarcodeGenerator />;
      default: return <Orders />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 md:pb-0 md:pl-64">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 z-40">
        <div className="flex items-center gap-3 mb-10 group">
          <div className="p-2 bg-orange-500 rounded-xl text-white shrink-0">
            <Building2 size={24} />
          </div>
          <div className="flex-grow overflow-hidden flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1 w-full">
                <input
                  autoFocus
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveCompanyName()}
                  onBlur={() => setIsEditingName(false)}
                  className="w-full text-lg font-black text-gray-800 border-b-2 border-orange-500 outline-none bg-transparent"
                />
                <button onClick={saveCompanyName} className="text-green-500 hover:text-green-600">
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black text-gray-800 truncate">{companyName}</h1>
                <button 
                  onClick={startEditing}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-orange-500 transition-all"
                >
                  <Edit2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <nav className="flex-grow space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-100 bg-gray-100 flex items-center justify-center">
              {!user || user.isAnonymous ? (
                <Users size={20} className="text-gray-400" />
              ) : (
                <Image 
                  src={user.photoURL || 'https://picsum.photos/seed/user/100/100'} 
                  alt={user.displayName || 'User'} 
                  width={40} 
                  height={40} 
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <div className="flex-grow overflow-hidden">
              <p className="text-sm font-bold text-gray-800 truncate">
                {!user ? 'Modo Público' : user.isAnonymous ? 'Modo Visitante' : user.displayName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {!user ? 'Acesso Livre' : user.isAnonymous ? 'Dados salvos localmente' : user.email}
              </p>
            </div>
          </div>
          
          {!user || user.isAnonymous ? (
            <button 
              onClick={handleLogin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-orange-500 bg-orange-50 hover:bg-orange-100 transition-all"
            >
              <LogIn size={20} />
              Conectar Google
            </button>
          ) : (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <LogOut size={20} />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* Header Mobile */}
      <header className="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 bg-orange-500 rounded-lg text-white shrink-0">
            <Building2 size={18} />
          </div>
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && saveCompanyName()}
                className="w-32 text-lg font-black text-gray-800 border-b-2 border-orange-500 outline-none bg-transparent"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-hidden" onClick={startEditing}>
              <h1 className="text-lg font-black text-gray-800 truncate">{companyName}</h1>
              <Edit2 size={12} className="text-gray-300" />
            </div>
          )}
        </div>
        {!user || user.isAnonymous ? (
          <button onClick={handleLogin} className="text-orange-500 p-2">
            <LogIn size={20} />
          </button>
        ) : (
          <button onClick={handleLogout} className="text-gray-400 p-2">
            <LogOut size={20} />
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 flex justify-around items-center z-30">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-orange-500' : 'text-gray-300'
            }`}
          >
            <item.icon size={22} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
