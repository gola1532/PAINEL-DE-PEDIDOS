'use client';

import React, { useState, useEffect } from 'react';
import { db, auth, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, handleFirestoreError, OperationType, Timestamp } from '@/firebase';
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Wallet, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface FinanceEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: any;
  createdAt: any;
}

export default function Finance() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'finance'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FinanceEntry[];
      setEntries(entryList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'finance'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'finance'), {
        ...formData,
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ type: 'income', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finance');
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'finance', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'finance');
    }
  };

  const totals = entries.reduce((acc, curr) => {
    if (curr.type === 'income') acc.income += curr.amount;
    else acc.expense += curr.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Novo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Wallet size={20} /></div>
            <p className="text-sm text-gray-500 font-medium">Saldo Total</p>
          </div>
          <p className={`text-2xl font-black ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            R$ {balance.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
            <p className="text-sm text-gray-500 font-medium">Total Entradas</p>
          </div>
          <p className="text-2xl font-black text-green-600">R$ {totals.income.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingDown size={20} /></div>
            <p className="text-sm text-gray-500 font-medium">Total Saídas</p>
          </div>
          <p className="text-2xl font-black text-red-600">R$ {totals.expense.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
          <h2 className="font-bold text-gray-700">Lançamentos Recentes</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {entries.map((entry) => (
            <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${entry.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {entry.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{entry.description}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={12} /> {entry.date?.toDate().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className={`font-black ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.type === 'income' ? '+' : '-'} R$ {entry.amount.toFixed(2)}
                </p>
                <button onClick={() => handleDelete(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="p-8 text-center text-gray-400">Nenhum lançamento encontrado.</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-orange-500 text-white">
                <h2 className="text-xl font-bold">Novo Lançamento</h2>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'income'})}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                      formData.type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'expense'})}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                      formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Saída
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Compra de materiais, Venda avulsa"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    Salvar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir este registro financeiro? Esta ação afetará o saldo total."
        confirmText="Excluir"
      />
    </div>
  );
}
