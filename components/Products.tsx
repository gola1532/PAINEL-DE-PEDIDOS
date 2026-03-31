'use client';

import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, handleFirestoreError, OperationType } from '@/firebase';
import { Search, Plus, Trash2, Package, Tag, DollarSign, Layers, X, Edit2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  createdAt: any;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    costPrice: 0,
    salePrice: 0,
    stock: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', category: '', costPrice: 0, salePrice: 0, stock: 0 });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      stock: product.stock
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (product: Product) => {
    setEditingId(null);
    setFormData({
      name: `${product.name} (Cópia)`,
      category: product.category,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      stock: product.stock
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
      await deleteDoc(doc(db, 'products', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
          <p className="text-xs text-gray-400 font-medium">Total: {products.length} itens</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', category: '', costPrice: 0, salePrice: 0, stock: 0 });
            setIsModalOpen(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Novo Produto
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou categoria..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <motion.div 
            layout
            key={product.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 truncate max-w-[120px]">{product.name}</h3>
                  <p className="text-xs text-gray-400">{product.category}</p>
                </div>
              </div>
              <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDuplicate(product)} className="p-1.5 text-gray-400 hover:text-blue-500" title="Duplicar"><Copy size={16} /></button>
                <button onClick={() => handleEdit(product)} className="p-1.5 text-gray-400 hover:text-orange-500" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-500" title="Excluir"><Trash2 size={16} /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-gray-50 p-2 rounded-lg">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Venda</p>
                <p className="text-sm font-black text-orange-600">R$ {product.salePrice.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Estoque</p>
                <p className={`text-sm font-black ${product.stock <= 5 ? 'text-red-500' : 'text-gray-800'}`}>
                  {product.stock} un
                </p>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center text-[10px] text-gray-400">
              <span>Lucro: R$ {(product.salePrice - product.costPrice).toFixed(2)}</span>
              {product.stock <= 5 && <span className="text-red-500 font-bold animate-pulse">Estoque Baixo!</span>}
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
                <h2 className="text-xl font-bold">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Chinelos, Acessórios"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço Venda (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Inicial</label>
                  <input
                    required
                    type="number"
                    inputMode="numeric"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
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
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
