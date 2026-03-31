'use client';

import React, { useState, useEffect } from 'react';
import { db, auth, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, handleFirestoreError, OperationType, writeBatch, Timestamp } from '@/firebase';
import { Search, Plus, Trash2, ShoppingCart, User, Calendar, CheckCircle, Clock, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  deliveryDate?: any;
  createdAt: any;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  salePrice: number;
  stock: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Solares');
  const [newOrder, setNewOrder] = useState({
    customerId: '',
    items: [] as OrderItem[],
    deliveryDate: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const orderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(orderList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        phone: doc.data().phone
      })) as Customer[];
      setCustomers(customerList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        salePrice: doc.data().salePrice,
        stock: doc.data().stock
      })) as Product[];
      setProducts(productList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const unsubscribeSettings = auth.currentUser ? onSnapshot(doc(db, 'settings', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        setCompanyName(doc.data().companyName || 'Solares');
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `settings/${auth.currentUser?.uid}`)) : () => {};

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
      unsubscribeProducts();
      unsubscribeSettings();
    };
  }, []);

  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = newOrder.items.find(item => item.productId === productId);
    if (existingItem) {
      setNewOrder({
        ...newOrder,
        items: newOrder.items.map(item => 
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        )
      });
    } else {
      setNewOrder({
        ...newOrder,
        items: [...newOrder.items, { productId, name: product.name, quantity: 1, price: product.salePrice }]
      });
    }
  };

  const handleRemoveItem = (productId: string) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter(item => item.productId !== productId)
    });
  };

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customerId || newOrder.items.length === 0) return;

    const customer = customers.find(c => c.id === newOrder.customerId);
    const total = calculateTotal(newOrder.items);

    try {
      const batch = writeBatch(db);
      
      // Create order
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, {
        customerId: newOrder.customerId,
        customerName: customer?.name || 'Cliente Desconhecido',
        items: newOrder.items,
        total,
        status: 'pending',
        deliveryDate: newOrder.deliveryDate ? Timestamp.fromDate(new Date(newOrder.deliveryDate)) : null,
        createdAt: serverTimestamp()
      });

      // Update stock
      newOrder.items.forEach(item => {
        const productRef = doc(db, 'products', item.productId);
        const product = products.find(p => p.id === item.productId);
        if (product) {
          batch.update(productRef, {
            stock: product.stock - item.quantity
          });
        }
      });

      await batch.commit();
      setIsModalOpen(false);
      setNewOrder({ customerId: '', items: [], deliveryDate: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const handleMarkAsPaid = async (order: Order) => {
    try {
      const batch = writeBatch(db);
      
      // Update order status
      batch.update(doc(db, 'orders', order.id), { status: 'paid' });

      // Create finance entry
      const financeRef = doc(collection(db, 'finance'));
      batch.set(financeRef, {
        type: 'income',
        amount: order.total,
        description: `Pedido #${order.id.slice(-4)} - ${order.customerName}`,
        date: serverTimestamp(),
        orderId: order.id,
        createdAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'orders', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'orders');
    }
  };

  const sendWhatsAppReminder = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    if (!customer) return;

    const message = `Olá ${order.customerName}! Passando para lembrar do seu pedido na ${companyName}. Valor total: R$ ${order.total.toFixed(2)}. Status: ${order.status === 'pending' ? 'Aguardando Pagamento' : 'Pago'}.`;
    const url = `https://wa.me/55${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm)
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Novo Pedido
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por cliente ou ID..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <motion.div 
            layout
            key={order.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                    order.status === 'paid' ? 'bg-green-100 text-green-700' : 
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status === 'paid' ? 'Pago' : order.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-800">{order.customerName}</h3>
              </div>
              <p className="text-xl font-black text-orange-600">R$ {order.total.toFixed(2)}</p>
            </div>

            <div className="border-t border-gray-50 py-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="text-sm text-gray-600 flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-50">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Calendar size={14} /> {order.createdAt?.toDate().toLocaleDateString()}</span>
                {order.deliveryDate && (
                  <span className="flex items-center gap-1 text-orange-500 font-medium">
                    <Clock size={14} /> Entrega: {order.deliveryDate.toDate().toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => sendWhatsAppReminder(order)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Enviar Cobrança"
                >
                  <MessageSquare size={20} />
                </button>
                {order.status === 'pending' && (
                  <button 
                    onClick={() => handleMarkAsPaid(order)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Marcar como Pago"
                  >
                    <CheckCircle size={20} />
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(order.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
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
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-orange-500 text-white">
                <h2 className="text-xl font-bold">Novo Pedido</h2>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newOrder.customerId}
                    onChange={(e) => setNewOrder({...newOrder, customerId: e.target.value})}
                  >
                    <option value="">Selecionar Cliente</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adicionar Produtos *</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      className="w-full pl-8 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto p-2 border border-gray-100 rounded-lg bg-gray-50/30 custom-scrollbar">
                    {products
                      .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={p.stock <= 0}
                        onClick={() => handleAddItem(p.id)}
                        className={`text-left p-2 rounded-xl border text-sm transition-all active:scale-95 ${
                          p.stock <= 0 
                            ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' 
                            : 'bg-white hover:bg-orange-50 border-gray-200 hover:border-orange-200 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-bold truncate flex-1">{p.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            p.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            Est: {p.stock}
                          </span>
                        </div>
                        <p className="text-xs text-orange-600 font-black mt-1">R$ {p.salePrice.toFixed(2)}</p>
                      </button>
                    ))}
                    {products.length === 0 && (
                      <div className="col-span-2 py-8 text-center text-gray-400 text-xs italic">
                        Nenhum produto cadastrado. Vá em &quot;Produtos&quot; primeiro.
                      </div>
                    )}
                    {products.length > 0 && products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                      <div className="col-span-2 py-8 text-center text-gray-400 text-xs italic">
                        Nenhum produto encontrado com &quot;{productSearch}&quot;.
                      </div>
                    )}
                  </div>
                </div>

                {newOrder.items.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Itens do Pedido</label>
                    {newOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          <button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right pt-2">
                      <p className="text-lg font-black text-orange-600">Total: R$ {calculateTotal(newOrder.items).toFixed(2)}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Entrega</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newOrder.deliveryDate}
                    onChange={(e) => setNewOrder({...newOrder, deliveryDate: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={newOrder.items.length === 0 || !newOrder.customerId}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    Finalizar Pedido
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
        title="Excluir Pedido"
        message="Tem certeza que deseja excluir este pedido? O estoque não será devolvido automaticamente."
        confirmText="Excluir"
      />
    </div>
  );
}
