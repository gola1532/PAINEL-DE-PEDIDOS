'use client';

import React, { useState, useEffect } from 'react';
import { db, auth, collection, onSnapshot, query, where, handleFirestoreError, OperationType } from '@/firebase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  customerName: string;
  deliveryDate: any;
  status: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const q = query(
      collection(db, 'orders'),
      where('deliveryDate', '>=', startOfMonth),
      where('deliveryDate', '<=', endOfMonth)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(orderList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    return () => unsubscribe();
  }, [currentDate]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 border border-gray-50 bg-gray-50/20"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOrders = orders.filter(o => {
      const d = o.deliveryDate.toDate();
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });

    days.push(
      <div key={day} className="h-16 sm:h-24 border border-gray-50 p-0.5 sm:p-1 overflow-y-auto bg-white hover:bg-orange-50/30 transition-colors">
        <span className={`text-[10px] sm:text-sm font-bold ${date.toDateString() === new Date().toDateString() ? 'bg-orange-500 text-white w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center rounded-full' : 'text-gray-400'}`}>
          {day}
        </span>
        <div className="mt-0.5 space-y-0.5">
          {dayOrders.map(order => (
            <div key={order.id} className="text-[8px] sm:text-[10px] bg-orange-100 text-orange-700 p-0.5 rounded truncate font-medium border border-orange-200">
              <span className="hidden sm:inline">{order.customerName}</span>
              <span className="sm:hidden block w-1 h-1 bg-orange-500 rounded-full mx-auto"></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-orange-500" /> {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h1>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft /></button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight /></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Próximas Entregas</h2>
        <div className="space-y-3">
          {orders
            .filter(o => o.deliveryDate.toDate() >= new Date())
            .sort((a, b) => a.deliveryDate.toDate() - b.deliveryDate.toDate())
            .slice(0, 5)
            .map(order => (
              <div key={order.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 text-orange-500 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{order.customerName}</p>
                    <p className="text-sm text-gray-400">Entrega: {order.deliveryDate.toDate().toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                  order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.status === 'paid' ? 'Pago' : 'Pendente'}
                </span>
              </div>
            ))}
          {orders.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
              Nenhuma entrega agendada para este mês.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
