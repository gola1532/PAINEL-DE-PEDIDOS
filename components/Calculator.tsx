'use client';

import React, { useState } from 'react';
import { Delete, X, Divide, Minus, Plus, Equal, Hash, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<string[]>([]);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const handleDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      const newValue = performCalculation(operator, currentValue, inputValue);
      setPrevValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const performCalculation = (op: string, a: number, b: number) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: return b;
    }
  };

  const handleEqual = () => {
    const inputValue = parseFloat(display);

    if (operator && prevValue !== null) {
      const result = performCalculation(operator, prevValue, inputValue);
      const entry = `${prevValue} ${operator} ${inputValue} = ${result}`;
      setHistory([entry, ...history].slice(0, 10));
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const clearLast = () => {
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const buttons = [
    { label: 'C', action: clearAll, color: 'bg-red-100 text-red-600', colSpan: 1, rowSpan: 1 },
    { label: 'DEL', action: clearLast, color: 'bg-gray-100 text-gray-600', colSpan: 1, rowSpan: 1 },
    { label: '/', action: () => handleOperator('/'), color: 'bg-orange-100 text-orange-600', colSpan: 1, rowSpan: 1 },
    { label: '*', action: () => handleOperator('*'), color: 'bg-orange-100 text-orange-600', colSpan: 1, rowSpan: 1 },
    { label: '7', action: () => handleDigit('7'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '8', action: () => handleDigit('8'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '9', action: () => handleDigit('9'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '-', action: () => handleOperator('-'), color: 'bg-orange-100 text-orange-600', colSpan: 1, rowSpan: 1 },
    { label: '4', action: () => handleDigit('4'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '5', action: () => handleDigit('5'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '6', action: () => handleDigit('6'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '+', action: () => handleOperator('+'), color: 'bg-orange-100 text-orange-600', colSpan: 1, rowSpan: 1 },
    { label: '1', action: () => handleDigit('1'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '2', action: () => handleDigit('2'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '3', action: () => handleDigit('3'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
    { label: '=', action: handleEqual, color: 'bg-orange-500 text-white', colSpan: 1, rowSpan: 2 },
    { label: '0', action: () => handleDigit('0'), color: 'bg-white text-gray-800', colSpan: 2, rowSpan: 1 },
    { label: '.', action: () => handleDigit('.'), color: 'bg-white text-gray-800', colSpan: 1, rowSpan: 1 },
  ];

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gray-50 text-right">
          <p className="text-sm text-gray-400 h-6">{prevValue} {operator}</p>
          <p className="text-4xl font-black text-gray-800 truncate">{display}</p>
        </div>

        <div className="p-4 grid grid-cols-4 gap-3">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              className={`h-16 rounded-2xl font-bold text-xl flex items-center justify-center transition-all active:scale-95 shadow-sm ${btn.color} ${btn.colSpan ? `col-span-${btn.colSpan}` : ''} ${btn.rowSpan ? `row-span-${btn.rowSpan}` : ''}`}
            >
              {btn.label === '/' ? <Divide size={24} /> : 
               btn.label === '*' ? <X size={24} /> : 
               btn.label === '-' ? <Minus size={24} /> : 
               btn.label === '+' ? <Plus size={24} /> : 
               btn.label === '=' ? <Equal size={24} /> : 
               btn.label === 'DEL' ? <Delete size={24} /> : 
               btn.label}
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-gray-50">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <History size={14} /> Histórico Recente
          </h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <p key={i} className="text-sm text-gray-500 font-medium">{h}</p>
            ))}
            {history.length === 0 && <p className="text-sm text-gray-300 italic">Nenhum cálculo recente.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
