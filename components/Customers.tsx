'use client';

import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, handleFirestoreError, OperationType } from '@/firebase';
import { Search, Plus, Trash2, User, Phone, MapPin, CreditCard, X, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  document: string;
  createdAt: any;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    document: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customerList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'customers', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', phone: '', address: '', document: '' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'customers');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      document: customer.document
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'customers', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'customers');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', phone: '', address: '', document: '' });
            setIsModalOpen(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredCustomers.map((customer) => (
          <motion.div 
            layout
            key={customer.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{customer.name}</h3>
                  <p className="text-xs text-gray-400">Desde {customer.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(customer)} className="p-1.5 text-gray-400 hover:text-orange-500"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400" /> {customer.phone}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" /> {customer.address || 'Sem endereço'}
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-gray-400" /> {customer.document || 'Sem CPF/CNPJ'}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
              <a 
                href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-center py-2 rounded-lg text-xs font-bold transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </motion.div>
        ))}
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
                <h2 className="text-xl font-bold">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (WhatsApp) *</label>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.document}
                    onChange={(e) => setFormData({...formData, document: e.target.value})}
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente? Todos os dados associados serão perdidos."
        confirmText="Excluir"
      />
    </div>
  );
}
