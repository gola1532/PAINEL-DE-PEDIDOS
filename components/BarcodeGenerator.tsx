'use client';

import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Barcode, Download, Copy, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BarcodeGenerator() {
  const [barcodeValue, setBarcodeValue] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const calculateEAN13CheckDigit = (code: string) => {
    if (code.length !== 12) return null;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      if (isNaN(digit)) return null;
      // Weight: 1 for odd positions, 3 for even positions (1-indexed)
      // In 0-indexed: i=0 (pos 1) -> weight 1, i=1 (pos 2) -> weight 3
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit;
  };

  const generateRandomEAN12 = () => {
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  };

  const handleGenerateRandom = () => {
    const ean12 = generateRandomEAN12();
    const checkDigit = calculateEAN13CheckDigit(ean12);
    const fullCode = ean12 + checkDigit;
    setBarcodeValue(fullCode);
    setGeneratedCode(fullCode);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 13);
    setBarcodeValue(value);
    
    if (value.length === 12) {
      const checkDigit = calculateEAN13CheckDigit(value);
      setGeneratedCode(value + checkDigit);
      setError('');
    } else if (value.length === 13) {
      const ean12 = value.slice(0, 12);
      const expectedCheckDigit = calculateEAN13CheckDigit(ean12);
      const actualCheckDigit = parseInt(value[12]);
      
      if (expectedCheckDigit !== actualCheckDigit) {
        setError(`Dígito verificador inválido. O correto seria ${expectedCheckDigit}`);
        setGeneratedCode('');
      } else {
        setError('');
        setGeneratedCode(value);
      }
    } else {
      setGeneratedCode('');
      setError(value.length > 0 ? 'Insira 12 ou 13 dígitos' : '');
    }
  };

  useEffect(() => {
    if (generatedCode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, generatedCode, {
          format: "EAN13",
          lineColor: "#000",
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 16,
          margin: 10
        });
      } catch (err) {
        console.error("Erro ao gerar código de barras:", err);
      }
    }
  }, [generatedCode]);

  const downloadBarcode = () => {
    if (!barcodeRef.current) return;
    const svg = barcodeRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `barcode-${generatedCode}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Barcode className="text-orange-500" />
          Gerador de Código de Barras EAN-13
        </h1>
        <p className="text-gray-500 text-sm">Gere códigos de barras válidos para seus produtos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Digite 12 ou 13 dígitos
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={barcodeValue}
                onChange={handleInputChange}
                placeholder="Ex: 789123456789"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
              <button
                onClick={handleGenerateRandom}
                className="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors"
                title="Gerar Aleatório"
              >
                <RefreshCw size={24} />
              </button>
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-2 text-sm text-red-500 flex items-center gap-1"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Como funciona</h4>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• EAN-13 usa 12 dígitos + 1 dígito verificador.</li>
                <li>• Se você digitar 12, o 13º será calculado automaticamente.</li>
                <li>• Se digitar 13, validaremos se o último dígito está correto.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {generatedCode ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center w-full"
              >
                <div className="bg-white p-4 rounded-lg mb-6">
                  <svg ref={barcodeRef}></svg>
                </div>
                
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="text-2xl font-mono font-bold tracking-widest text-gray-800 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                    {generatedCode}
                  </div>
                  
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                    >
                      {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={downloadBarcode}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 shadow-md shadow-orange-200 transition-all active:scale-95"
                    >
                      <Download size={18} />
                      Baixar PNG
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-12 border-2 border-dashed border-gray-200 rounded-2xl w-full"
              >
                <Barcode size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400">Insira um código válido para visualizar o código de barras</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
